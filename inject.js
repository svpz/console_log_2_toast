(function () {
    let currentSettings = {
        pattern: 'On event triggered ----',
        delimiter: '----'
    };

    window.addEventListener('extn_ebent_settings', (e) => {
        currentSettings = e.detail;
    });

    const originalLog = console.log;
    console.log = function (...args) {
        originalLog.apply(console, args);
        const message = args.join(' ');

        if (message.includes(currentSettings.pattern)) {
            let eventText = '';
            if (currentSettings.delimiter && message.includes(currentSettings.delimiter)) {
                const parts = message.split(currentSettings.delimiter);
                eventText = parts[parts.length - 1].trim();
            } else {
                eventText = message.replace(currentSettings.pattern, '').trim();
            }

            if (eventText) {
                window.dispatchEvent(new CustomEvent('extn_ebent_console_event', {
                    detail: { text: eventText }
                }));
            }
        }
    };
})();
