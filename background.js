let isProcessing = false;
let messageQueue = [];

async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    isProcessing = true;

    // Work on a copy of the current queue to handle potential additions during processing
    const batch = [...messageQueue];
    messageQueue = [];

    try {
        const data = await chrome.storage.local.get({ history: {}, currentSession: null, sessions: {} });
        const history = data.history;
        const currentSession = data.currentSession;
        const sessions = data.sessions;

        batch.forEach(msg => {
            const { text, url, timestamp } = msg.payload;
            const hostname = new URL(url).hostname;

            // Log to site history
            if (!history[hostname]) {
                history[hostname] = [];
            }
            history[hostname].unshift({ text, timestamp });

            // Limit site history to 100 per site
            if (history[hostname].length > 100) {
                history[hostname] = history[hostname].slice(0, 100);
            }

            // Log to active session if it exists
            if (currentSession && sessions[currentSession.id]) {
                sessions[currentSession.id].events.unshift({ text, url, timestamp });
            }
        });

        await chrome.storage.local.set({ history, sessions });
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
