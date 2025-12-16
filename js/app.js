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

// --- Runin UI Logic ---

let scriptCommands = [];

// Command Templates & Help Text
const commandTemplates = {
    'version': { args: '', help: 'Returns version number of the runin framework' },
    'runin msleep': { args: '1000', help: 'Sleep for N milliseconds (e.g. 1000)' },
    'runin sleep': { args: '1', help: 'Sleep for N seconds (e.g. 1)' },
    'runin echo': { args: '"message"', help: 'Writes user messages to the log file' },
    'runin failures': { args: '', help: 'Lists the number of failures detected' },
    'runin progress': { args: '', help: 'Reports runin progress as percent' },
    'runin state': { args: '', help: 'Prints debug info for internal runin data structures' },
    'runin status': { args: '', help: 'Print the list of commands saved on the device' },
    'runin test': { args: '"command"', help: 'Runs the given command in blocking mode' }
};

function updateScriptDisplay() {
    document.getElementById('scriptDisplay').value = scriptCommands.join('\n');
}

// Handle Command Template Selection
document.getElementById('commandTemplate').addEventListener('change', (e) => {
    const selectedCmd = e.target.value;
    const inputEl = document.getElementById('commandInput');
    const helpEl = document.getElementById('commandHelpText');

    if (selectedCmd && commandTemplates[selectedCmd]) {
        // Pre-fill input with command + default args
        const template = commandTemplates[selectedCmd];
        // If there are args, add a space, otherwise just the command
        inputEl.value = selectedCmd + (template.args ? ' ' + template.args : '');
        helpEl.textContent = template.help;
        
        // Highlight the argument part for easy editing if it exists
        if (template.args) {
            // Wait for value to update then select the args part
            setTimeout(() => {
                const cmdLen = selectedCmd.length + 1; // +1 for space
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

// Add Clear All
document.getElementById('addClearBtn').addEventListener('click', () => {
    scriptCommands.push(runin.getClearCommandString());
    updateScriptDisplay();
});

// Add Command Form
document.getElementById('addCommandForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const schedule = document.getElementById('scheduleType').value;
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
    const schedule = document.getElementById('scheduleType').value;
    const duration = document.getElementById('duration').value;
    const iterations = document.getElementById('iterations').value;

    if (!duration && !iterations) {
        alert('Please specify either Duration or Iterations.');
        return;
    }

    const cmdStr = runin.getStartCommandString(schedule, iterations, duration);
    scriptCommands.push(cmdStr);
    updateScriptDisplay();
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

// Expose runin controller to global scope for inline HTML onclick handlers
window.runin = runin;