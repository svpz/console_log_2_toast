document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup DOM loaded');
    const historyList = document.getElementById('history-list');
    const clearBtn = document.getElementById('clear-all');
    const saveSettingsBtn = document.getElementById('save-settings');
    const patternInput = document.getElementById('pattern-input');
    const delimiterInput = document.getElementById('delimiter-input');

    // Session elements
    const startSessionBtn = document.getElementById('start-session');
    const stopSessionBtn = document.getElementById('stop-session');
    const clearSessionsBtn = document.getElementById('clear-sessions');
    const sessionNameInput = document.getElementById('session-name-input');
    const activeSessionUI = document.getElementById('active-session-ui');
    const noActiveSessionUI = document.getElementById('no-active-session-ui');
    const activeSessionName = document.getElementById('active-session-name');
    const activeSessionTime = document.getElementById('active-session-time');
    const activeSessionCount = document.getElementById('active-session-count');
    const sessionsList = document.getElementById('sessions-list');

    if (!historyList || !clearBtn || !saveSettingsBtn || !patternInput || !delimiterInput || !startSessionBtn || !stopSessionBtn || !sessionsList) {
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

    // Session Logic
    function updateSessionUI() {
        chrome.storage.local.get({ currentSession: null, sessions: {} }, (data) => {
            if (data.currentSession) {
                activeSessionUI.style.display = 'block';
                noActiveSessionUI.style.display = 'none';
                activeSessionName.textContent = data.currentSession.name;
                activeSessionTime.textContent = `Started: ${new Date(data.currentSession.startTime).toLocaleTimeString()}`;

                const session = data.sessions[data.currentSession.id];
                activeSessionCount.textContent = session ? session.events.length : 0;
            } else {
                activeSessionUI.style.display = 'none';
                noActiveSessionUI.style.display = 'block';
            }
            renderSessions();
        });
    }

    startSessionBtn.addEventListener('click', () => {
        const name = sessionNameInput.value.trim() || `Session ${new Date().toLocaleString()}`;
        const id = 'sess_' + Date.now();
        const startTime = new Date().toISOString();

        const currentSession = { id, name, startTime };

        chrome.storage.local.get({ sessions: {} }, (data) => {
            const sessions = data.sessions;
            sessions[id] = { name, startTime, events: [] };
            chrome.storage.local.set({ currentSession, sessions }, () => {
                sessionNameInput.value = '';
                updateSessionUI();
            });
        });
    });

    stopSessionBtn.addEventListener('click', () => {
        chrome.storage.local.get({ currentSession: null, sessions: {} }, (data) => {
            if (data.currentSession) {
                const sessions = data.sessions;
                if (sessions[data.currentSession.id]) {
                    sessions[data.currentSession.id].endTime = new Date().toISOString();
                }
                chrome.storage.local.set({ currentSession: null, sessions }, updateSessionUI);
            }
        });
    });

    clearSessionsBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all sessions?')) {
            chrome.storage.local.set({ currentSession: null, sessions: {} }, updateSessionUI);
        }
    });

    function renderSessions() {
        chrome.storage.local.get({ sessions: {}, currentSession: null }, (data) => {
            sessionsList.innerHTML = '';
            const sessions = data.sessions;
            const currentSession = data.currentSession;

            // Sort sessions by start time (newest first)
            const sessionIds = Object.keys(sessions).sort((a, b) =>
                new Date(sessions[b].startTime) - new Date(sessions[a].startTime)
            );

            sessionIds.forEach(id => {
                const session = sessions[id];
                if (currentSession && id === currentSession.id) return; // Already shown in active UI

                const section = document.createElement('section');
                section.className = 'site-section';
                section.style.borderColor = 'rgba(0, 255, 136, 0.2)';

                const header = document.createElement('div');
                header.className = 'site-header';
                header.innerHTML = `
                    <div style="display: flex; flex-direction: column;">
                        <span class="hostname" style="color: #fff;">${session.name}</span>
                        <span style="font-size: 10px; color: var(--text-dim);">${new Date(session.startTime).toLocaleString()}</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="download-report" data-session-id="${id}" style="background: rgba(0, 255, 136, 0.1); color: var(--accent); border: 1px solid rgba(0, 255, 136, 0.2); padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Download Report</button>
                        <button class="delete-site" data-session-id="${id}">Delete</button>
                    </div>
                `;
                section.appendChild(header);

                if (session.events.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'empty-state';
                    empty.style.padding = '20px';
                    empty.textContent = 'No events in this session.';
                    section.appendChild(empty);
                } else {
                    const logs = document.createElement('ul');
                    logs.className = 'log-list';
                    // Show only first 5 in popup for brevity, or all? Let's show all for now but maybe limited height
                    session.events.forEach((log, index) => {
                        const item = document.createElement('li');
                        item.className = 'log-item';
                        const date = new Date(log.timestamp).toLocaleTimeString();
                        item.innerHTML = `
                            <div style="flex: 1;">
                                <div class="log-text">${log.text}</div>
                                <div style="font-size: 10px; color: var(--accent); opacity: 0.7;">${new URL(log.url).hostname}</div>
                            </div>
                            <span class="log-time">${date}</span>
                            <button class="delete-log" data-session-id="${id}" data-index="${index}">&times;</button>
                        `;
                        logs.appendChild(item);
                    });
                    section.appendChild(logs);
                }
                sessionsList.appendChild(section);
            });
        });
    }

    function generateReport(session) {
        const events = [...session.events].reverse(); // Show chronological order in report
        const startTime = new Date(session.startTime).toLocaleString();
        const endTime = session.endTime ? new Date(session.endTime).toLocaleString() : 'Still Active';

        let timelineHtml = '';
        events.forEach((event, index) => {
            const date = new Date(event.timestamp).toLocaleTimeString();
            const hostname = new URL(event.url).hostname;
            timelineHtml += `
                <div class="timeline-item">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="event-meta">
                            <span class="event-time">${date}</span>
                            <span class="event-site">${hostname}</span>
                        </div>
                        <div class="event-text">${event.text}</div>
                        <div class="event-url">${event.url}</div>
                    </div>
                </div>
            `;
        });

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Event Report - ${session.name}</title>
    <style>
        :root {
            --bg: #0f172a;
            --card: #1e293b;
            --accent: #10b981;
            --text: #f1f5f9;
            --text-dim: #94a3b8;
            --border: #334155;
        }
        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            width: 100%;
            max-width: 800px;
        }
        header {
            margin-bottom: 50px;
            text-align: center;
        }
        h1 {
            font-size: 2.5rem;
            margin: 0;
            background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .session-info {
            color: var(--text-dim);
            margin-top: 10px;
            font-size: 0.9rem;
        }
        .timeline {
            position: relative;
            padding-left: 50px;
        }
        .timeline::before {
            content: '';
            position: absolute;
            left: 24px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, var(--accent), #3b82f6);
            opacity: 0.3;
        }
        .timeline-item {
            position: relative;
            margin-bottom: 40px;
            animation: fadeIn 0.5s ease-out forwards;
            opacity: 0;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .timeline-marker {
            position: absolute;
            left: -32px;
            top: 4px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--accent);
            box-shadow: 0 0 10px var(--accent);
            border: 4px solid var(--bg);
            z-index: 1;
        }
        .timeline-content {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            transition: transform 0.2s;
        }
        .timeline-content:hover {
            transform: translateX(10px);
            border-color: var(--accent);
        }
        .event-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 0.8rem;
        }
        .event-time {
            color: var(--accent);
            font-weight: 700;
        }
        .event-site {
            color: var(--text-dim);
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .event-text {
            font-size: 1.1rem;
            font-weight: 500;
            line-height: 1.4;
            color: #fff;
            margin-bottom: 8px;
        }
        .event-url {
            font-size: 0.75rem;
            color: var(--text-dim);
            word-break: break-all;
            opacity: 0.6;
        }
        .flow-arrow {
            text-align: center;
            color: var(--accent);
            font-size: 24px;
            margin-bottom: 40px;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Event Flow Report</h1>
            <div class="session-info">
                <strong>Session:</strong> ${session.name}<br>
                <strong>Started:</strong> ${startTime} | <strong>Ended:</strong> ${endTime}<br>
                <strong>Total Events:</strong> ${events.length}
            </div>
        </header>
        
        <div class="timeline">
            ${timelineHtml}
        </div>
        
        <footer style="margin-top: 50px; text-align: center; color: var(--text-dim); font-size: 0.8rem;">
            Generated by Console Event Monitor
        </footer>
    </div>
</body>
</html>`;
    }

    // Add click listener for session actions
    sessionsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-site')) {
            const id = e.target.dataset.sessionId;
            chrome.storage.local.get({ sessions: {} }, (data) => {
                const sessions = data.sessions;
                delete sessions[id];
                chrome.storage.local.set({ sessions }, updateSessionUI);
            });
        } else if (e.target.classList.contains('delete-log')) {
            const id = e.target.dataset.sessionId;
            const index = parseInt(e.target.dataset.index);
            chrome.storage.local.get({ sessions: {} }, (data) => {
                const sessions = data.sessions;
                if (sessions[id]) {
                    sessions[id].events.splice(index, 1);
                    chrome.storage.local.set({ sessions }, updateSessionUI);
                }
            });
        } else if (e.target.classList.contains('download-report')) {
            const id = e.target.dataset.sessionId;
            chrome.storage.local.get({ sessions: {} }, (data) => {
                const session = data.sessions[id];
                if (session) {
                    const htmlContent = generateReport(session);
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Event_Report_${session.name.replace(/\s+/g, '_')}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                }
            });
        }
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
    updateSessionUI();
});
