class RuninController {
    constructor(serialManager) {
        this.serial = serialManager;
        this.commandDelay = 200; // ms delay between commands to prevent buffer overflow
    }

    async sendCommand(cmd) {
        console.log(`Sending: ${cmd}`);
        await this.serial.writeLine(cmd);
    }

    async sendSequence(commands) {
        for (const cmd of commands) {
            await this.sendCommand(cmd);
            // Simple delay to allow device to process
            await new Promise(resolve => setTimeout(resolve, this.commandDelay));
        }
    }

    // --- Runin Specific Commands ---

    async clearAll() {
        await this.sendCommand('runin clear all');
    }

    async addCommand(schedule, command) {
        // schedule: 'now' or 'boot'
        // command: the actual command string
        const fullCmd = `runin add -w ${schedule} ${command}`;
        await this.sendCommand(fullCmd);
    }

    async startRunin(schedule, iterations = null, duration = null) {
        let cmd = `runin start -w ${schedule}`;
        if (iterations) cmd += ` -n ${iterations}`;
        if (duration) cmd += ` -t ${duration}`;
        
        await this.sendCommand(cmd);
    }

    async getLogs() {
        await this.sendCommand('runin log');
    }

    async checkStatus() {
        await this.sendCommand('runin status');
    }

    async checkProgress() {
        await this.sendCommand('runin progress');
    }
    
    async stop() {
        await this.sendCommand('runin stop');
    }
}