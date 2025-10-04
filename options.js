document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const githubUserInput = document.getElementById('githubUsername');
    const githubTokenInput = document.getElementById('githubToken');
    const leetcodeInput = document.getElementById('leetcodeUsername');
    const weatherApiKeyInput = document.getElementById('weatherApiKey');
    const weatherCityInput = document.getElementById('weatherCity');
    const stackoverflowIdInput = document.getElementById('stackoverflowId');
    const widgetVisibilityContainer = document.getElementById('widget-visibility-container');
    
    const saveButton = document.getElementById('saveButton');
    const statusMessage = document.getElementById('statusMessage');

    // Quick Links Elements
    const addLinkBtn = document.getElementById('addLinkBtn');
    const linkNameInput = document.getElementById('linkName');
    const linkUrlInput = document.getElementById('linkUrl');
    const linksContainer = document.getElementById('links-container');
    
    let bookmarks = [];

    // --- Widget Visibility ---
    const WIDGETS = [
        'Weather', 'GitHub', 'LeetCode', 'Dev.to', 'Hacker News', 
        'Quick Links', 'To-Do List', 'Quick Notes', 'Pomodoro Timer', 'Stack Overflow'
    ];

    function renderWidgetCheckboxes(settings) {
        widgetVisibilityContainer.innerHTML = '';
        WIDGETS.forEach(widgetName => {
            const widgetId = widgetName.toLowerCase().replace(/ /g, '-').replace(/\./g, '');
            const isChecked = settings[widgetId] !== false; // Default to true if not set
            
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.innerHTML = `
                <input type="checkbox" id="toggle-${widgetId}" data-widget-id="${widgetId}" ${isChecked ? 'checked' : ''}>
                ${widgetName}
            `;
            widgetVisibilityContainer.appendChild(label);
        });
    }

    // --- Bookmarks Management --- (No changes here)
    function renderBookmarks() {
        linksContainer.innerHTML = '';
        bookmarks.forEach((bookmark, index) => {
            const linkEl = document.createElement('div');
            linkEl.className = 'link-item';
            linkEl.innerHTML = `<span>${bookmark.name}</span><button class="delete-link-btn" data-index="${index}">×</button>`;
            linksContainer.appendChild(linkEl);
        });
        document.querySelectorAll('.delete-link-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.getAttribute('data-index');
                bookmarks.splice(index, 1);
                renderBookmarks();
            });
        });
    }
    addLinkBtn.addEventListener('click', () => {
        const name = linkNameInput.value.trim();
        let url = linkUrlInput.value.trim();
        if (name && url) {
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url;
            }
            bookmarks.push({ name, url });
            linkNameInput.value = '';
            linkUrlInput.value = '';
            renderBookmarks();
        }
    });

    // --- Main Settings Functions ---
    function loadSettings() {
        const keysToGet = [
            'githubUsername', 'githubToken', 'leetcodeUsername', 'weatherApiKey', 'weatherCity', 
            'stackoverflowId', 'bookmarks', 'widgetVisibility'
        ];
        chrome.storage.sync.get(keysToGet, (result) => {
            if (result.githubUsername) githubUserInput.value = result.githubUsername;
            if (result.githubToken) githubTokenInput.value = result.githubToken;
            if (result.leetcodeUsername) leetcodeInput.value = result.leetcodeUsername;
            if (result.weatherApiKey) weatherApiKeyInput.value = result.weatherApiKey;
            if (result.weatherCity) weatherCityInput.value = result.weatherCity;
            if (result.stackoverflowId) stackoverflowIdInput.value = result.stackoverflowId;
            
            if (result.bookmarks) {
                bookmarks = result.bookmarks;
                renderBookmarks();
            }

            renderWidgetCheckboxes(result.widgetVisibility || {});
        });
    }

    function saveSettings() {
        // Get widget visibility settings
        const widgetVisibility = {};
        document.querySelectorAll('#widget-visibility-container input[type="checkbox"]').forEach(checkbox => {
            widgetVisibility[checkbox.dataset.widgetId] = checkbox.checked;
        });

        const settingsToSave = {
            githubUsername: githubUserInput.value.trim(),
            githubToken: githubTokenInput.value.trim(),
            leetcodeUsername: leetcodeInput.value.trim(),
            weatherApiKey: weatherApiKeyInput.value.trim(),
            weatherCity: weatherCityInput.value.trim(),
            stackoverflowId: stackoverflowIdInput.value.trim(),
            bookmarks: bookmarks,
            widgetVisibility: widgetVisibility
        };

        chrome.storage.sync.set(settingsToSave, () => {
            statusMessage.textContent = 'Settings saved successfully!';
            setTimeout(() => { statusMessage.textContent = ''; }, 3000);
        });
    }

    // --- Initializer ---
    saveButton.addEventListener('click', saveSettings);
    loadSettings();
});