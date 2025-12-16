# CF0F Runin Web Tool

A web-based interface for configuring and controlling the CF0F Runin framework on embedded devices. This tool leverages the **Web Serial API** to communicate directly with the device via the browser, eliminating the need for native terminal emulators.

## Features

*   **Web Serial Integration**: Connect to devices directly from Chrome or Edge without installing drivers.
*   **Visual Script Builder**: Create complex test sequences (Runin scripts) using a GUI instead of typing raw commands.
*   **Command Templates**: Built-in support for standard Runin commands (`msleep`, `version`, `status`, etc.) with parameter guidance.
*   **Integrated Terminal**: Real-time xterm.js terminal to view device output and logs.
*   **One-Click Execution**: Batch send entire test scripts to the device.

## Prerequisites

*   A browser that supports the Web Serial API (Google Chrome, Microsoft Edge, Opera).
*   The device connected to your computer via USB/Serial.
*   **Note**: Web Serial only works over **HTTPS** or **localhost**.

## How to Use

### 1. Connect to Device
1.  Open the web tool in your browser.
2.  Select the correct **Baud Rate** (default is `115200`).
3.  Click **Connect Device**.
4.  Select your device's serial port from the browser popup.

### 2. Build a Test Script
Use the **Script Builder** panel on the left to construct your test sequence:

*   **Step 1: Setup**: Click **Add "Clear All"** to ensure a clean state before testing.
*   **Step 2: Add Commands**:
    *   Select a command from the dropdown (e.g., `runin msleep`).
    *   Edit parameters if needed (e.g., change `1000` to `500`).
    *   Choose the schedule: `Now` (immediate) or `Boot` (next restart).
    *   Click **Add to Script**.
*   **Step 3: Start Config**:
    *   Set the test limit by **Duration** (seconds) OR **Iterations** (loops).
    *   Click **Add Start to Script**.

### 3. Execute Script
1.  Review the generated script in the **Generated Script** text area.
2.  Click the green **Run Script** button.
3.  The tool will automatically send all commands to the device in sequence.

### 4. Monitor & Control
Use the **Device Monitor** buttons for immediate actions:
*   **Check Status**: See currently queued commands on the device.
*   **Get Logs**: Retrieve execution logs (`runin log`).
*   **Check Progress**: View current test progress.
*   **Stop Runin**: Immediately halt the running test.

## Running Locally

To run this tool on your local machine:

1.  Clone the repository.
2.  Start a local web server in the project root (Python example):
    ```bash
    python3 -m http.server
    ```
3.  Open `http://localhost:8000` in your browser.