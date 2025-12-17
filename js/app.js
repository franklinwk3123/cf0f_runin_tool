// Initialize Xterm.js
const term = new Terminal({
    cursorBlink: true,
    macOptionIsMeta: true,
    scrollback: 1000,
});
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById('terminal-container'));
fitAddon.fit();

// Handle window resize
window.addEventListener('resize', () => {
    fitAddon.fit();
});

// Initialize Managers
const serialManager = new SerialManager();
const runin = new RuninController(serialManager);

// --- UI Event Listeners ---

// Connection
document.getElementById('connectBtn').addEventListener('click', async () => {
    const baudRate = document.getElementById('baudRate').value;
    await serialManager.connect(baudRate);
});

document.getElementById('disconnectBtn').addEventListener('click', async () => {
    await serialManager.disconnect();
});

// Serial Events
serialManager.onConnect = () => {
    document.getElementById('connectBtn').classList.add('d-none');
    document.getElementById('disconnectBtn').classList.remove('d-none');
    document.getElementById('baudRate').disabled = true;
    term.writeln('\x1b[32m[System] Connected to device.\x1b[0m');
};

serialManager.onDisconnect = () => {
    document.getElementById('connectBtn').classList.remove('d-none');
    document.getElementById('disconnectBtn').classList.add('d-none');
    document.getElementById('baudRate').disabled = false;
    term.writeln('\x1b[31m[System] Disconnected.\x1b[0m');
};

serialManager.onDataReceived = (data) => {
    term.write(data);
};

// Terminal Input (Echo back to serial)
term.onData(data => {
    serialManager.write(data);
});

document.getElementById('clearTermBtn').addEventListener('click', () => {
    term.clear();
});

document.getElementById('exportTermBtn').addEventListener('click', () => {
    let logContent = '';
    const buffer = term.buffer.active;
    // Iterate through all lines in the buffer
    for (let i = 0; i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
            // translateToString(true) trims trailing whitespace
            logContent += line.translateToString(true) + '\n';
        }
    }

    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `terminal_export_${timestamp}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// --- Runin UI Logic ---

let scriptCommands = [];

// Initialize Runin Commands
(async () => {
    await runin.loadCommands('conf/runin_commands.json');
    populateCommandDropdown();
    populateDeviceMonitor();
})();

function populateCommandDropdown() {
    const select = document.getElementById('commandTemplate');
    select.innerHTML = '<option value="">Custom...</option>';
    
    const commands = runin.getCommands();
    commands.filter(cmd => cmd.category === 'script').forEach(cmd => {
        const option = document.createElement('option');
        option.value = cmd.command;
        option.textContent = cmd.label;
        select.appendChild(option);
    });
}

function populateDeviceMonitor() {
    const container = document.getElementById('deviceMonitorButtons');
    container.innerHTML = '';

    const commands = runin.getCommands();
    
    // Filter commands
    const monitorCmds = commands.filter(cmd => cmd.category === 'monitor');
    const stopCmd = commands.find(cmd => cmd.id === 'stop');
    
    // Combine all buttons to be displayed
    const allButtons = [...monitorCmds];
    if (stopCmd) allButtons.push(stopCmd);

    // Create buttons in a grid
    allButtons.forEach(cmd => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-3'; // Responsive: 2 per row on small, 4 per row on medium+
        
        const btn = document.createElement('button');
        // Use different style for Stop command
        const isStop = cmd.id === 'stop';
        btn.className = `btn ${isStop ? 'btn-outline-danger' : 'btn-outline-secondary'} w-100 btn-sm`;
        
        // Simplify label: remove "Runin " prefix to save space if needed, or keep it
        // Using just the label for cleaner look in grid
        btn.textContent = cmd.label.charAt(0).toUpperCase() + cmd.label.slice(1);
        
        btn.onclick = () => {
            const schedule = document.querySelector('input[name="globalSchedule"]:checked').value;
            const cmdStr = runin.getAddCommandString(schedule, cmd.command);
            scriptCommands.push(cmdStr);
            updateScriptDisplay();
        };
        
        col.appendChild(btn);
        container.appendChild(col);
    });
}

function updateScriptDisplay() {
    document.getElementById('scriptDisplay').value = scriptCommands.join('\n');
}

// Handle Command Template Selection
document.getElementById('commandTemplate').addEventListener('change', (e) => {
    const selectedCmdValue = e.target.value;
    const inputEl = document.getElementById('commandInput');
    const helpEl = document.getElementById('commandHelpText');

    const commands = runin.getCommands();
    const template = commands.find(c => c.command === selectedCmdValue);

    if (template) {
        // Pre-fill input with command + default args
        // If there are args, add a space, otherwise just the command
        inputEl.value = template.command + (template.args ? ' ' + template.args : '');
        helpEl.textContent = template.help;
        
        // Highlight the argument part for easy editing if it exists
        if (template.args) {
            // Wait for value to update then select the args part
            setTimeout(() => {
                const cmdLen = template.command.length + 1; // +1 for space
                inputEl.focus();
                inputEl.setSelectionRange(cmdLen, inputEl.value.length);
            }, 0);
        }
    } else {
        // Custom mode
        inputEl.value = '';
        helpEl.textContent = 'Enter any custom command supported by the device.';
    }
});

// Add Clear Command
document.getElementById('addClearBtn').addEventListener('click', () => {
    const target = document.querySelector('input[name="clearTarget"]:checked').value;
    scriptCommands.push(runin.getClearCommandString(target));
    updateScriptDisplay();
});

// Add Command Form
document.getElementById('addCommandForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const schedule = document.querySelector('input[name="globalSchedule"]:checked').value;
    const command = document.getElementById('commandInput').value;
    
    if (!command) return;

    const cmdStr = runin.getAddCommandString(schedule, command);
    scriptCommands.push(cmdStr);
    updateScriptDisplay();
    
    // Optional: Clear input
    // document.getElementById('commandInput').value = '';
});

// Add Start Command
document.getElementById('addStartBtn').addEventListener('click', () => {
    const schedule = document.querySelector('input[name="globalSchedule"]:checked').value;
    const duration = document.getElementById('duration').value;
    const iterations = document.getElementById('iterations').value;
    const exitOnFailure = document.querySelector('input[name="exitOnFailure"]:checked').value;
    const silence = document.getElementById('silenceOutput').checked;

    if (!duration && !iterations) {
        alert('Please specify either Duration or Iterations.');
        return;
    }

    const cmdStr = runin.getStartCommandString(schedule, iterations, duration, exitOnFailure, silence);
    scriptCommands.push(cmdStr);
    updateScriptDisplay();
});

// Script Import/Export
document.getElementById('exportScriptBtn').addEventListener('click', () => {
    const content = scriptCommands.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `runin_script_${timestamp}.conf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

document.getElementById('importScriptBtn').addEventListener('click', () => {
    document.getElementById('scriptFileInput').click();
});

document.getElementById('scriptFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        // Split by newline to get array
        scriptCommands = content.split(/\r?\n/);
        updateScriptDisplay();
        // Reset file input
        document.getElementById('scriptFileInput').value = '';
    };
    reader.readAsText(file);
});

// Execute Script
document.getElementById('executeScriptBtn').addEventListener('click', async () => {
    if (scriptCommands.length === 0) {
        alert('Script is empty!');
        return;
    }
    
    // Visual feedback
    term.writeln('\x1b[33m[System] Executing script...\x1b[0m');
    
    await runin.sendSequence(scriptCommands);
    
    term.writeln('\x1b[32m[System] Script execution finished.\x1b[0m');
});

// Clear Script
document.getElementById('clearScriptBtn').addEventListener('click', () => {
    scriptCommands = [];
    updateScriptDisplay();
});

// Undo Script (Remove last line)
document.getElementById('undoScriptBtn').addEventListener('click', () => {
    scriptCommands.pop();
    updateScriptDisplay();
});

// Expose runin controller to global scope for inline HTML onclick handlers
window.runin = runin;