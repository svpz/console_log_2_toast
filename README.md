# ⚡ Event Monitor (extn_ebent)

A minimal Chrome extension to popup and track `console.log` events. This project was **vibecoded**.

## 🚀 How to Use

### 1. Installation
- Open Chrome and go to `chrome://extensions`.
- Enable **Developer mode**.
- Click **Load unpacked** and select this folder.

### 2. Configuration
- Click the extension icon in your toolbar.
- Set your **Trigger Pattern** (e.g., `On event triggered ----`) and **Delimiter**.
- Click **Save Configuration**.

### 3. Triggering
- Use the console on any website to trigger a popup:
  ```javascript
  console.log("On event triggered ---- website_open");
  ```

### 4. Viewing History
- Open the extension popup to see the history of events recorded per website and delete logs as needed.

---
*Vibecoded.*
