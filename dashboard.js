document.addEventListener('DOMContentLoaded', () => {

    // --- 1. DOM तत्व चयनकर्ता (Element Selectors) ---
    const greetingWidget = document.getElementById('greeting-widget');
    const weatherContent = document.getElementById('weather-content');
    const githubContent = document.getElementById('github-content');
    const leetcodeContent = document.getElementById('leetcode-content');
    const linksContent = document.getElementById('links-content');
    const devtoContent = document.getElementById('devto-content');
    const hackernewsContent = document.getElementById('hackernews-content');
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    
    // नए विजेट्स के चयनकर्ता
    const quickNotesContent = document.getElementById('quick-notes-content');
    const pomodoroTimerEl = document.getElementById('pomodoro-timer');
    const pomodoroStartBtn = document.getElementById('pomodoro-start');
    const pomodoroResetBtn = document.getElementById('pomodoro-reset');
    const stackoverflowContent = document.getElementById('stackoverflow-content');


    // --- 2. सहायक फ़ंक्शंस (Helper Functions) ---

    /**
     * किसी विजेट में त्रुटि संदेश (error message) दिखाने के लिए.
     */
    function renderError(element, message) {
        if (!element) return;
        element.innerHTML = `<p style="padding:10px;">${message} <br><a href="options.html" target="_blank" style="color:#4CAF50;">सेटिंग्स जांचें</a>.</p>`;
    }

    /**
     * कैशिंग के साथ डेटा फ़ेच करने के लिए एक जेनेरिक फ़ंक्शन.
     */
    async function fetchWithCache(cacheKey, url, ttl, options = {}) {
        const cachedData = await chrome.storage.local.get([cacheKey, `${cacheKey}Time`]);
        const cache = cachedData[cacheKey];
        const cacheTime = cachedData[`${cacheKey}Time`];

        if (cache && cacheTime && (Date.now() - cacheTime < ttl)) {
            return { data: cache, fromCache: true };
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            chrome.storage.local.set({ [cacheKey]: data, [`${cacheKey}Time`]: Date.now() });
            return { data, fromCache: false };
        } catch (error) {
            console.error(`Error fetching ${cacheKey}:`, error);
            throw error;
        }
    }


    // --- 3. विजेट्स का लॉजिक ---

    // Greeting Widget
    function updateGreeting() {
        if (!greetingWidget) return;
        const now = new Date();
        const hours = now.getHours();
        const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        let greeting;

        if (hours < 12) { greeting = 'Good Morning ☀️'; } 
        else if (hours < 18) { greeting = 'Good Afternoon 🌤️'; } 
        else { greeting = 'Good Evening 🌙'; }
        
        greetingWidget.innerHTML = `<div class="time">${timeString}</div><div class="greeting">${greeting}</div>`;
    }

    // Weather Widget
    async function fetchWeatherData() {
        if (!weatherContent) return;
        const config = await chrome.storage.sync.get(['weatherApiKey', 'weatherCity']);
        if (!config.weatherApiKey || !config.weatherCity) {
            return renderError(weatherContent, "कृपया मौसम API की और शहर सेट करें.");
        }
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${config.weatherCity}&appid=${config.weatherApiKey}&units=metric`;
        try {
            const { data } = await fetchWithCache('weatherCache', url, 900000); // 15-min cache
            weatherContent.innerHTML = `
                <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="Weather icon" class="weather-icon">
                <div class="weather-temp">${Math.round(data.main.temp)}°C</div>
                <div class="weather-desc">${data.weather[0].description}</div>
            `;
        } catch (error) {
            renderError(weatherContent, "मौसम डेटा लोड करने में विफल.");
        }
    }
    
    // GitHub Widget
    async function fetchGitHubData() {
        if (!githubContent) return;
        const config = await chrome.storage.sync.get(['githubUsername', 'githubToken']);
        if (!config.githubUsername || !config.githubToken) {
            return renderError(githubContent, "कृपया GitHub यूज़रनेम और टोकन सेट करें.");
        }
        const url = `https://api.github.com/users/${config.githubUsername}/events/public`;
        try {
            const { data: events } = await fetchWithCache('githubCache', url, 300000, { headers: { 'Authorization': `token ${config.githubToken}` }});
            let html = '<ul>';
            events.slice(0, 5).forEach(event => {
                let desc = `Performed ${event.type}`;
                if (event.type === 'PushEvent') desc = `Pushed to <a href="https://github.com/${event.repo.name}" target="_blank">${event.repo.name}</a>`;
                else if (event.type === 'CreateEvent') desc = `Created a ${event.payload.ref_type} in <a href="https://github.com/${event.repo.name}" target="_blank">${event.repo.name}</a>`;
                else if (event.type === 'PullRequestEvent') desc = `${event.payload.action} a PR in <a href="https://github.com/${event.repo.name}" target="_blank">${event.repo.name}</a>`;
                html += `<li>${desc}</li>`;
            });
            githubContent.innerHTML = html + '</ul>';
        } catch (error) {
            renderError(githubContent, "GitHub डेटा लोड करने में विफल.");
        }
    }

    // LeetCode Widget
    async function fetchLeetCodeData() {
        if (!leetcodeContent) return;
        const config = await chrome.storage.sync.get(['leetcodeUsername']);
        if (!config.leetcodeUsername) {
            return renderError(leetcodeContent, "कृपया LeetCode यूज़रनेम सेट करें.");
        }
        const url = `https://leetcode-api-faisal.vercel.app/api/${config.leetcodeUsername}`;
        try {
            const { data } = await fetchWithCache('leetcodeCache', url, 3600000); // 1-hour cache
            if (data.status === "error" || !data.totalSolved) throw new Error("User not found");
            leetcodeContent.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item"><div class="stat-value">${data.easySolved}/${data.totalEasy}</div><div class="stat-label">Easy</div></div>
                    <div class="stat-item"><div class="stat-value">${data.mediumSolved}/${data.totalMedium}</div><div class="stat-label">Medium</div></div>
                    <div class="stat-item"><div class="stat-value">${data.hardSolved}/${data.totalHard}</div><div class="stat-label">Hard</div></div>
                </div>`;
        } catch (error) {
            renderError(leetcodeContent, "LeetCode डेटा लोड करने में विफल.");
        }
    }

    // Stack Overflow Widget
    async function fetchStackOverflowData() {
        if (!stackoverflowContent) return;
        const { stackoverflowId } = await chrome.storage.sync.get('stackoverflowId');
        if (!stackoverflowId) {
            return renderError(stackoverflowContent, "कृपया Stack Overflow ID सेट करें.");
        }
        const url = `https://api.stackexchange.com/2.3/users/${stackoverflowId}?site=stackoverflow`;
        try {
            const { data } = await fetchWithCache('stackoverflowCache', url, 3600000); // 1-hour cache
            if (!data.items || data.items.length === 0) throw new Error("User not found");
            const user = data.items[0];
            stackoverflowContent.innerHTML = `
                <div class="so-stats">
                    <div class="so-stat"><div class="so-stat-value">${user.reputation.toLocaleString()}</div><div class="so-stat-label">Reputation</div></div>
                    <div class="so-stat"><div class="so-stat-value">${user.badge_counts.gold}</div><div class="so-stat-label">Gold</div></div>
                    <div class="so-stat"><div class="so-stat-value">${user.badge_counts.silver}</div><div class="so-stat-label">Silver</div></div>
                </div>`;
        } catch (error) {
            renderError(stackoverflowContent, "Stack Overflow डेटा लोड करने में विफल.");
        }
    }

    // Quick Notes Widget
    function initQuickNotes() {
        if (!quickNotesContent) return;
        let saveTimeout;
        chrome.storage.local.get('quickNote', (result) => {
            if (result.quickNote) quickNotesContent.value = result.quickNote;
        });
        quickNotesContent.addEventListener('keyup', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                chrome.storage.local.set({ quickNote: quickNotesContent.value });
            }, 500); // Debounce saving
        });
    }

    // Pomodoro Timer Widget
    let pomodoroInterval, timeLeft = 25 * 60, isRunning = false;
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        pomodoroTimerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    function startPausePomodoro() {
        isRunning = !isRunning;
        pomodoroStartBtn.textContent = isRunning ? 'Pause' : 'Start';
        if (isRunning) {
            pomodoroInterval = setInterval(() => {
                timeLeft--;
                updateTimerDisplay();
                if (timeLeft <= 0) {
                    clearInterval(pomodoroInterval);
                    alert('Time for a break!');
                    resetPomodoro();
                }
            }, 1000);
        } else {
            clearInterval(pomodoroInterval);
        }
    }
    function resetPomodoro() {
        clearInterval(pomodoroInterval);
        isRunning = false;
        pomodoroStartBtn.textContent = 'Start';
        timeLeft = 25 * 60;
        updateTimerDisplay();
    }
    function initPomodoro() {
        if (!pomodoroTimerEl) return;
        pomodoroStartBtn.addEventListener('click', startPausePomodoro);
        pomodoroResetBtn.addEventListener('click', resetPomodoro);
        updateTimerDisplay();
    }

    // ... (To-Do List, Bookmarks, and other local widgets remain the same)
    // ... (Animated Background logic also remains the same)


    // --- 4. डैशबोर्ड को शुरू करें (Initializer) ---

    // Widget Visibility
    async function applyWidgetVisibility() {
        const { widgetVisibility } = await chrome.storage.sync.get({widgetVisibility: {}});
        for (const widgetKey in widgetVisibility) {
            const element = document.getElementById(`${widgetKey}-widget`);
            if (element && !widgetVisibility[widgetKey]) {
                element.classList.add('hidden');
            }
        }
    }

    async function initializeDashboard() {
        await applyWidgetVisibility();

        // Initialize all widgets
        updateGreeting();
        setInterval(updateGreeting, 1000);

        fetchWeatherData();
        fetchGitHubData();
        fetchLeetCodeData();
        fetchStackOverflowData();
        // ... (Call other fetch functions like Dev.to, Hacker News if they exist)

        initQuickNotes();
        initPomodoro();
        // ... (Call functions for To-Do, Bookmarks)
        
        // ... (Start animated background)
        // resize();
        // animate();
        // window.addEventListener('resize', resize);
    }

    initializeDashboard();

    // NOTE: You need to paste your existing functions for To-Do, Bookmarks, Dev.to,
    // Hacker News, and the animated background logic into this file for it to be complete.
    // The structure provided here integrates all the new features correctly.
});