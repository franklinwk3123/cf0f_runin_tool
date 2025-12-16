class SerialManager {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.inputDone = null;
        this.outputDone = null;
        this.inputStream = null;
        this.outputStream = null;
        this.baudRate = 115200;
        
        // Callbacks
        this.onDataReceived = null; // Function to call when data comes in
        this.onConnect = null;
        this.onDisconnect = null;
    }

    async connect(baudRate = 115200) {
        this.baudRate = parseInt(baudRate);
        
        try {
            // Request a port and open a connection.
            this.port = await navigator.serial.requestPort();
            
            await this.port.open({ baudRate: this.baudRate });

            // Setup the output stream.
            const encoder = new TextEncoderStream();
            this.outputDone = encoder.readable.pipeTo(this.port.writable);
            this.outputStream = encoder.writable;
            this.writer = this.outputStream.getWriter();

            // Setup the input stream.
            const decoder = new TextDecoderStream();
            this.inputDone = this.port.readable.pipeTo(decoder.writable);
            this.inputStream = decoder.readable;
            
            this.readLoop();

            if (this.onConnect) this.onConnect();
            console.log('Connected to serial port');
            
        } catch (error) {
            console.error('Connection failed:', error);
            alert('Failed to connect: ' + error);
        }
    }

    async disconnect() {
        if (this.reader) {
            await this.reader.cancel();
            await this.inputDone.catch(() => {});
            this.reader = null;
            this.inputDone = null;
        }

        if (this.writer) {
            await this.writer.close();
            await this.outputDone;
            this.writer = null;
            this.outputDone = null;
        }

        if (this.port) {
            await this.port.close();
            this.port = null;
        }

        if (this.onDisconnect) this.onDisconnect();
        console.log('Disconnected');
    }

    async readLoop() {
        this.reader = this.inputStream.getReader();
        try {
            while (true) {
                const { value, done } = await this.reader.read();
                if (done) {
                    // Allow the serial port to be closed later.
                    this.reader.releaseLock();
                    break;
                }
                if (value) {
                    if (this.onDataReceived) {
                        this.onDataReceived(value);
                    }
                }
            }
        } catch (error) {
            console.error('Read error:', error);
        }
    }

    async write(data) {
        if (this.writer) {
            await this.writer.write(data);
        } else {
            console.warn('Serial port not writable');
        }
    }

    async writeLine(data) {
        await this.write(data + '\r\n');
    }
}