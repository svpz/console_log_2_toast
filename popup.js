document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup DOM loaded');
    const historyList = document.getElementById('history-list');
    const clearBtn = document.getElementById('clear-all');
    const saveSettingsBtn = document.getElementById('save-settings');
    const patternInput = document.getElementById('pattern-input');
    const delimiterInput = document.getElementById('delimiter-input');

    if (!historyList || !clearBtn || !saveSettingsBtn || !patternInput || !delimiterInput) {
        console.error('Core popup elements missing!');
        return;
    }

    // Load settings
    chrome.storage.local.get({
        pattern: 'On event triggered ----',
        delimiter: '----'
    }, (settings) => {
        patternInput.value = settings.pattern;
        delimiterInput.value = settings.delimiter;
    });

    // Save settings
    saveSettingsBtn.addEventListener('click', () => {
        const pattern = patternInput.value.trim() || 'On event triggered ----';
        const delimiter = delimiterInput.value.trim();

        chrome.storage.local.set({ pattern, delimiter }, () => {
            console.log('Settings saved');

            // Notify active tabs to update their interceptors
            chrome.tabs.query({}, (tabs) => {
                const payload = { pattern, delimiter };
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_SETTINGS', payload }).catch(() => {
                        // Ignore errors for tabs where extension isn't loaded
                    });
                });
            });

            saveSettingsBtn.textContent = 'Settings Saved!';
            setTimeout(() => {
                saveSettingsBtn.textContent = 'Save Configuration';
            }, 2000);
        });
    });

    function renderHistory() {
        console.log('Rendering history...');
        chrome.storage.local.get({ history: {} }, (data) => {
            if (chrome.runtime.lastError) {
                console.error('Storage error:', chrome.runtime.lastError);
                historyList.innerHTML = '<div class="empty-state">Error loading history.</div>';
                return;
            }

            historyList.innerHTML = '';
            const history = data.history;
            const hostnames = Object.keys(history).sort();

            if (hostnames.length === 0) {
                historyList.innerHTML = '<div class="empty-state">No events recorded yet.</div>';
                return;
            }

            hostnames.forEach(hostname => {
                const section = document.createElement('section');
                section.className = 'site-section';

                const header = document.createElement('div');
                header.className = 'site-header';
                header.innerHTML = `
                    <span class="hostname">${hostname}</span>
                    <button class="delete-site" data-site="${hostname}">Delete</button>
                `;
                section.appendChild(header);

                const logs = document.createElement('ul');
                logs.className = 'log-list';
                history[hostname].forEach((log, index) => {
                    const item = document.createElement('li');
                    item.className = 'log-item';
                    const date = new Date(log.timestamp).toLocaleTimeString();
                    item.innerHTML = `
                        <span class="log-text">${log.text}</span>
                        <span class="log-time">${date}</span>
                        <button class="delete-log" data-site="${hostname}" data-index="${index}">&times;</button>
                    `;
                    logs.appendChild(item);
                });
                section.appendChild(logs);
                historyList.appendChild(section);
            });
            console.log('History rendered successfully.');
        });
    }

    historyList.addEventListener('click', (e) => {
        try {
            if (e.target.classList.contains('delete-site')) {
                const site = e.target.dataset.site;
                chrome.storage.local.get('history', (data) => {
                    const history = data.history;
                    delete history[site];
                    chrome.storage.local.set({ history }, renderHistory);
                });
            } else if (e.target.classList.contains('delete-log')) {
                const site = e.target.dataset.site;
                const index = parseInt(e.target.dataset.index);
                chrome.storage.local.get('history', (data) => {
                    const history = data.history;
                    history[site].splice(index, 1);
                    if (history[site].length === 0) {
                        delete history[site];
                    }
                    chrome.storage.local.set({ history }, renderHistory);
                });
            }
        } catch (err) {
            console.error('Click handler error:', err);
        }
    });

    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all history?')) {
            chrome.storage.local.set({ history: {} }, renderHistory);
        }
    });

    renderHistory();
});
