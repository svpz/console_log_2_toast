let isProcessing = false;
let messageQueue = [];

async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    isProcessing = true;

    // Work on a copy of the current queue to handle potential additions during processing
    const batch = [...messageQueue];
    messageQueue = [];

    try {
        const data = await chrome.storage.local.get({ history: {} });
        const history = data.history;

        batch.forEach(msg => {
            const { text, url, timestamp } = msg.payload;
            const hostname = new URL(url).hostname;

            if (!history[hostname]) {
                history[hostname] = [];
            }
            history[hostname].unshift({ text, timestamp });

            // Limit to 100 per site
            if (history[hostname].length > 100) {
                history[hostname] = history[hostname].slice(0, 100);
            }
        });

        await chrome.storage.local.set({ history });
    } catch (err) {
        console.error('Failed to update storage:', err);
    } finally {
        isProcessing = false;
        // Check if new items arrived while we were processing
        if (messageQueue.length > 0) {
            processQueue();
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'LOG_EVENT') {
        messageQueue.push(message);
        processQueue();
    }
    return true;
});
