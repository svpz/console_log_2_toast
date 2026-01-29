// Inject the interceptor script
function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    (document.head || document.documentElement).appendChild(script);
    script.onload = () => {
        // Pass initial settings to the injected script
        chrome.storage.local.get({
            pattern: 'On event triggered ----',
            delimiter: '----'
        }, (settings) => {
            window.dispatchEvent(new CustomEvent('extn_ebent_settings', { detail: settings }));
        });
        script.remove();
    };
}

injectScript();

// Robust container management
function getContainer() {
    let container = document.getElementById('extn_ebent-modal-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'extn_ebent-modal-container';
        (document.body || document.documentElement).appendChild(container);
    }
    return container;
}

// Listen for intercepted events
window.addEventListener('extn_ebent_console_event', (event) => {
    const eventText = event.detail.text;
    showNotification(eventText);

    chrome.runtime.sendMessage({
        type: 'LOG_EVENT',
        payload: {
            text: eventText,
            url: window.location.href,
            timestamp: new Date().toISOString()
        }
    });
});

// Update settings when message received from background
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'UPDATE_SETTINGS') {
        window.dispatchEvent(new CustomEvent('extn_ebent_settings', { detail: message.payload }));
    }
});

function showNotification(text) {
    const container = getContainer();
    const notification = document.createElement('div');
    notification.className = 'extn_ebent-event-modal';

    notification.innerHTML = `
    <div style="display: flex; flex-direction: column;">
      <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.6; margin-bottom: 2px; font-weight: 600;">Event Triggered</span>
      <span style="display: block; line-height: 1.2;">${text}</span>
    </div>
  `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('hide');
        setTimeout(() => {
            notification.remove();
        }, 400);
    }, 4000);
}
