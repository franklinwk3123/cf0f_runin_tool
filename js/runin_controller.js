class RuninController {
    constructor(serialManager) {
        this.serial = serialManager;
        this.commandDelay = 200; // ms delay between commands to prevent buffer overflow
        this.commands = [];
        this.commandMap = {};
    }

    async loadCommands(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.commands = await response.json();
            this.commandMap = this.commands.reduce((map, cmd) => {
                if (cmd.id) map[cmd.id] = cmd.command;
                return map;
            }, {});
            console.log('Runin commands loaded:', this.commands);
        } catch (e) {
            console.error("Failed to load runin commands:", e);
            this.commands = [];
            this.commandMap = {};
        }
    }

    getCommands() {
        return this.commands;
    }

    getCommandString(id, defaultCmd) {
        return this.commandMap[id] || defaultCmd;
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
        await this.sendCommand(this.getCommandString('clear', 'runin clear all'));
    }

    async addCommand(schedule, command) {
        // schedule: 'now' or 'boot'
        // command: the actual command string
        const fullCmd = `runin add -w ${schedule} ${command}`;
        await this.sendCommand(fullCmd);
    }

    async startRunin(schedule, iterations = null, duration = null) {
        const cmd = this.getStartCommandString(schedule, iterations, duration);
        await this.sendCommand(cmd);
    }

    async getLogs() {
        await this.sendCommand(this.getCommandString('log', 'runin log'));
    }

    async checkState() {
        await this.sendCommand(this.getCommandString('state', 'runin state'));
    }

    async checkStatus() {
        await this.sendCommand(this.getCommandString('status', 'runin status'));
    }

    async checkProgress() {
        await this.sendCommand(this.getCommandString('progress', 'runin progress'));
    }

    async help() {
        await this.sendCommand(this.getCommandString('help', 'runin help'));
    }
    
    async stop() {
        await this.sendCommand(this.getCommandString('stop', 'runin stop'));
    }

    // Helper methods to generate command strings without sending
    getClearCommandString(target = 'all') {
        // Assuming base command is "runin clear" or we construct it
        return `runin clear ${target}`;
    }

    getAddCommandString(schedule, command) {
        return `runin add -w ${schedule} ${command}`;
    }

    getStartCommandString(schedule, iterations = null, duration = null, exitOnFailure = '1', silence = false) {
        const baseCmd = this.getCommandString('start', 'runin start');
        let cmd = `${baseCmd} -w ${schedule}`;
        if (iterations) cmd += ` -n ${iterations}`;
        if (duration) cmd += ` -t ${duration}`;
        if (exitOnFailure !== '1') cmd += ` -x ${exitOnFailure}`;
        if (silence) cmd += ` -s`;
        return cmd;
    }
}