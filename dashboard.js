document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const CACHE_PREFIX = 'cache:';
  const TTL = {
    weather: 15 * 60 * 1000,
    github: 5 * 60 * 1000,
    leetcode: 60 * 60 * 1000,
    stackoverflow: 60 * 60 * 1000,
    devto: 15 * 60 * 1000,
    hackernews: 10 * 60 * 1000
  };

  const $ = (id) => document.getElementById(id);
  const elements = {
    greeting: $('greeting-widget'),
    weather: $('weather-content'),
    github: $('github-content'),
    leetcode: $('leetcode-content'),
    links: $('links-content'),
    devto: $('devto-content'),
    hackernews: $('hackernews-content'),
    todoInput: $('todo-input'),
    todoList: $('todo-list'),
    notes: $('quick-notes-content'),
    pomodoroTimer: $('pomodoro-timer'),
    pomodoroStart: $('pomodoro-start'),
    pomodoroReset: $('pomodoro-reset'),
    stackoverflow: $('stackoverflow-content')
  };

  function createElement(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    if (options.title) node.title = options.title;
    return node;
  }

  function clear(element) {
    if (element) element.replaceChildren();
  }

  function renderLoading(element, label = 'Loading...') {
    if (!element) return;
    const message = createElement('p', { className: 'muted loading', text: label });
    element.replaceChildren(message);
  }

  function renderMessage(element, message) {
    if (!element) return;
    element.replaceChildren(createElement('p', { className: 'muted', text: message }));
  }

  function renderError(element, message, showSettings = true) {
    if (!element) return;
    const wrapper = createElement('div', { className: 'empty-state' });
    wrapper.appendChild(createElement('p', { text: message }));
    if (showSettings) {
      const settings = createElement('a', { text: 'Open settings' });
      settings.href = 'options.html';
      settings.target = '_blank';
      settings.rel = 'noopener';
      wrapper.appendChild(settings);
    }
    element.replaceChildren(wrapper);
  }

  function externalLink(url, text, className = '') {
    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
      const anchor = createElement('a', { className, text });
      anchor.href = parsed.href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      return anchor;
    } catch {
      return createElement('span', { className, text });
    }
  }

  function cacheKey(namespace, identifier = '') {
    const normalized = String(identifier).trim().toLowerCase();
    return `${CACHE_PREFIX}${namespace}:${normalized}`;
  }

  async function fetchJsonWithCache(key, url, ttl, options = {}) {
    const stored = await chrome.storage.local.get(key);
    const cached = stored[key];
    const isFresh = cached && Number.isFinite(cached.fetchedAt) && Date.now() - cached.fetchedAt < ttl;
    if (isFresh) return cached.data;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      await chrome.storage.local.set({ [key]: { data, fetchedAt: Date.now() } });
      return data;
    } catch (error) {
      if (cached && Object.prototype.hasOwnProperty.call(cached, 'data')) return cached.data;
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function updateGreeting() {
    if (!elements.greeting) return;
    const now = new Date();
    const hour = now.getHours();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const greeting = hour < 12
      ? 'Good morning — build something useful.'
      : hour < 18
        ? 'Good afternoon — keep shipping.'
        : 'Good evening — one focused step at a time.';

    const timeNode = elements.greeting.querySelector('.time');
    const greetingNode = elements.greeting.querySelector('.greeting');
    if (timeNode) timeNode.textContent = time;
    if (greetingNode) greetingNode.textContent = greeting;
  }

  function weatherEmoji(condition) {
    const value = String(condition || '').toLowerCase();
    if (value.includes('thunder')) return '⛈️';
    if (value.includes('rain') || value.includes('drizzle')) return '🌧️';
    if (value.includes('snow')) return '❄️';
    if (value.includes('cloud')) return '☁️';
    if (value.includes('mist') || value.includes('fog') || value.includes('haze')) return '🌫️';
    return '☀️';
  }

  async function loadWeather() {
    renderLoading(elements.weather, 'Loading weather...');
    const [{ weatherCity }, local] = await Promise.all([
      chrome.storage.sync.get('weatherCity'),
      chrome.storage.local.get('weatherApiKey')
    ]);
    const city = String(weatherCity || '').trim();
    const apiKey = String(local.weatherApiKey || '').trim();
    if (!city || !apiKey) return renderError(elements.weather, 'Add a city and OpenWeatherMap API key.');

    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.searchParams.set('q', city);
    url.searchParams.set('appid', apiKey);
    url.searchParams.set('units', 'metric');

    try {
      const data = await fetchJsonWithCache(cacheKey('weather', city), url.href, TTL.weather);
      if (!data?.main || !Array.isArray(data.weather) || !data.weather[0]) throw new Error('Invalid weather response');

      const summary = createElement('div', { className: 'weather-summary' });
      summary.append(
        createElement('div', { className: 'weather-symbol', text: weatherEmoji(data.weather[0].main) }),
        createElement('div', { className: 'weather-temp', text: `${Math.round(Number(data.main.temp))}°C` }),
        createElement('div', { className: 'weather-desc', text: data.weather[0].description || data.weather[0].main }),
        createElement('div', { className: 'muted', text: data.name || city })
      );
      elements.weather.replaceChildren(summary);
    } catch {
      renderError(elements.weather, 'Weather is temporarily unavailable.');
    }
  }

  function githubEventDescription(event) {
    const action = String(event?.payload?.action || 'updated');
    const type = String(event?.type || 'GitHub event');
    if (type === 'PushEvent') return 'Pushed commits to';
    if (type === 'CreateEvent') return `Created ${event?.payload?.ref_type || 'content'} in`;
    if (type === 'PullRequestEvent') return `${action} a pull request in`;
    if (type === 'IssuesEvent') return `${action} an issue in`;
    if (type === 'WatchEvent') return 'Starred';
    return type.replace(/Event$/, '').replace(/([a-z])([A-Z])/g, '$1 $2') + ' in';
  }

  async function loadGitHub() {
    renderLoading(elements.github, 'Loading public activity...');
    const { githubUsername } = await chrome.storage.sync.get('githubUsername');
    const username = String(githubUsername || '').trim();
    if (!username) return renderError(elements.github, 'Add your GitHub username to view activity.');

    try {
      const url = `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=10`;
      const events = await fetchJsonWithCache(cacheKey('github', username), url, TTL.github, {
        headers: { Accept: 'application/vnd.github+json' }
      });
      if (!Array.isArray(events)) throw new Error('Invalid GitHub response');
      if (events.length === 0) return renderMessage(elements.github, 'No recent public activity found.');

      const list = createElement('ul', { className: 'clean-list feed-list' });
      events.slice(0, 5).forEach((event) => {
        const repo = String(event?.repo?.name || '').trim();
        const item = createElement('li');
        item.appendChild(createElement('span', { text: `${githubEventDescription(event)} ` }));
        item.appendChild(externalLink(`https://github.com/${repo}`, repo || 'GitHub'));
        list.appendChild(item);
      });
      elements.github.replaceChildren(list);
    } catch {
      renderError(elements.github, 'GitHub activity is temporarily unavailable.');
    }
  }

  function statCard(value, label, modifier = '') {
    const card = createElement('div', { className: `stat-card ${modifier}`.trim() });
    card.append(
      createElement('strong', { text: value }),
      createElement('span', { text: label })
    );
    return card;
  }

  async function loadLeetCode() {
    renderLoading(elements.leetcode, 'Loading problem-solving stats...');
    const { leetcodeUsername } = await chrome.storage.sync.get('leetcodeUsername');
    const username = String(leetcodeUsername || '').trim();
    if (!username) return renderError(elements.leetcode, 'Add your LeetCode username to view stats.');

    try {
      const url = `https://leetcode-api-faisal.vercel.app/api/${encodeURIComponent(username)}`;
      const data = await fetchJsonWithCache(cacheKey('leetcode', username), url, TTL.leetcode);
      if (data?.status === 'error' || !Number.isFinite(Number(data?.totalSolved))) throw new Error('Invalid LeetCode response');

      const total = createElement('div', { className: 'total-stat' });
      total.append(
        createElement('strong', { text: Number(data.totalSolved).toLocaleString() }),
        createElement('span', { text: 'problems solved' })
      );
      const grid = createElement('div', { className: 'stats-grid' });
      grid.append(
        statCard(`${data.easySolved ?? 0}/${data.totalEasy ?? '—'}`, 'Easy', 'easy'),
        statCard(`${data.mediumSolved ?? 0}/${data.totalMedium ?? '—'}`, 'Medium', 'medium'),
        statCard(`${data.hardSolved ?? 0}/${data.totalHard ?? '—'}`, 'Hard', 'hard')
      );
      elements.leetcode.replaceChildren(total, grid);
    } catch {
      renderError(elements.leetcode, 'LeetCode stats are temporarily unavailable.');
    }
  }

  async function loadStackOverflow() {
    renderLoading(elements.stackoverflow, 'Loading profile stats...');
    const { stackoverflowId } = await chrome.storage.sync.get('stackoverflowId');
    const userId = String(stackoverflowId || '').trim();
    if (!userId) return renderError(elements.stackoverflow, 'Add your Stack Overflow user ID.');
    if (!/^\d+$/.test(userId)) return renderError(elements.stackoverflow, 'Stack Overflow user ID must be numeric.');

    try {
      const url = `https://api.stackexchange.com/2.3/users/${encodeURIComponent(userId)}?site=stackoverflow`;
      const data = await fetchJsonWithCache(cacheKey('stackoverflow', userId), url, TTL.stackoverflow);
      const user = data?.items?.[0];
      if (!user) throw new Error('User not found');

      const grid = createElement('div', { className: 'stats-grid' });
      grid.append(
        statCard(Number(user.reputation || 0).toLocaleString(), 'Reputation'),
        statCard(user.badge_counts?.gold ?? 0, 'Gold'),
        statCard(user.badge_counts?.silver ?? 0, 'Silver')
      );
      elements.stackoverflow.replaceChildren(grid);
    } catch {
      renderError(elements.stackoverflow, 'Stack Overflow stats are temporarily unavailable.');
    }
  }

  function renderArticleFeed(element, items, mapItem) {
    if (!Array.isArray(items) || items.length === 0) return renderMessage(element, 'No stories available right now.');
    const list = createElement('ol', { className: 'clean-list feed-list numbered-list' });
    items.forEach((source) => {
      const itemData = mapItem(source);
      const item = createElement('li');
      item.appendChild(externalLink(itemData.url, itemData.title));
      if (itemData.meta) item.appendChild(createElement('small', { text: itemData.meta }));
      list.appendChild(item);
    });
    element.replaceChildren(list);
  }

  async function loadDevTo() {
    renderLoading(elements.devto, 'Loading developer stories...');
    try {
      const articles = await fetchJsonWithCache(
        cacheKey('devto', 'top'),
        'https://dev.to/api/articles?per_page=5&top=7',
        TTL.devto
      );
      renderArticleFeed(elements.devto, articles?.slice(0, 5), (article) => ({
        title: article?.title || 'Untitled article',
        url: article?.url || 'https://dev.to',
        meta: article?.user?.name ? `By ${article.user.name}` : ''
      }));
    } catch {
      renderError(elements.devto, 'Dev.to stories are temporarily unavailable.', false);
    }
  }

  async function loadHackerNews() {
    renderLoading(elements.hackernews, 'Loading top stories...');
    try {
      const ids = await fetchJsonWithCache(
        cacheKey('hackernews', 'topstories'),
        'https://hacker-news.firebaseio.com/v0/topstories.json',
        TTL.hackernews
      );
      if (!Array.isArray(ids)) throw new Error('Invalid Hacker News response');
      const stories = await Promise.all(ids.slice(0, 5).map((id) => fetchJsonWithCache(
        cacheKey('hackernews-item', id),
        `https://hacker-news.firebaseio.com/v0/item/${encodeURIComponent(id)}.json`,
        TTL.hackernews
      )));
      renderArticleFeed(elements.hackernews, stories, (story) => ({
        title: story?.title || 'Untitled story',
        url: story?.url || `https://news.ycombinator.com/item?id=${encodeURIComponent(story?.id || '')}`,
        meta: `${Number(story?.score || 0)} points`
      }));
    } catch {
      renderError(elements.hackernews, 'Hacker News is temporarily unavailable.', false);
    }
  }

  async function loadQuickLinks() {
    const { bookmarks = [] } = await chrome.storage.sync.get({ bookmarks: [] });
    if (!Array.isArray(bookmarks) || bookmarks.length === 0) {
      return renderError(elements.links, 'Add your first shortcut in settings.');
    }

    const grid = createElement('div', { className: 'quick-links-grid' });
    bookmarks.slice(0, 20).forEach((bookmark) => {
      const name = String(bookmark?.name || 'Link').trim();
      const link = externalLink(String(bookmark?.url || ''), name, 'quick-link');
      grid.appendChild(link);
    });
    elements.links.replaceChildren(grid);
  }

  let todos = [];

  async function saveTodos() {
    await chrome.storage.local.set({ todos });
  }

  function renderTodos() {
    clear(elements.todoList);
    if (todos.length === 0) {
      elements.todoList.appendChild(createElement('li', { className: 'muted empty-list', text: 'No tasks yet.' }));
      return;
    }

    todos.forEach((todo) => {
      const item = createElement('li', { className: 'todo-item' });
      const toggle = createElement('button', {
        className: `todo-toggle${todo.completed ? ' completed' : ''}`,
        text: todo.completed ? '✓' : ''
      });
      toggle.type = 'button';
      toggle.setAttribute('aria-label', todo.completed ? `Mark ${todo.text} incomplete` : `Mark ${todo.text} complete`);
      toggle.addEventListener('click', async () => {
        todo.completed = !todo.completed;
        await saveTodos();
        renderTodos();
      });

      const text = createElement('span', {
        className: `todo-text${todo.completed ? ' completed' : ''}`,
        text: todo.text
      });
      const remove = createElement('button', { className: 'todo-delete', text: '×' });
      remove.type = 'button';
      remove.setAttribute('aria-label', `Delete ${todo.text}`);
      remove.addEventListener('click', async () => {
        todos = todos.filter((entry) => entry.id !== todo.id);
        await saveTodos();
        renderTodos();
      });
      item.append(toggle, text, remove);
      elements.todoList.appendChild(item);
    });
  }

  async function initTodos() {
    const stored = await chrome.storage.local.get({ todos: [] });
    todos = Array.isArray(stored.todos) ? stored.todos.slice(0, 100) : [];
    renderTodos();
    elements.todoInput?.addEventListener('keydown', async (event) => {
      if (event.key !== 'Enter') return;
      const text = elements.todoInput.value.trim();
      if (!text || todos.length >= 100) return;
      todos.unshift({ id: crypto.randomUUID(), text: text.slice(0, 120), completed: false });
      elements.todoInput.value = '';
      await saveTodos();
      renderTodos();
    });
  }

  async function initQuickNotes() {
    if (!elements.notes) return;
    const { quickNote = '' } = await chrome.storage.local.get({ quickNote: '' });
    elements.notes.value = String(quickNote).slice(0, 5000);
    let saveTimer;
    elements.notes.addEventListener('input', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        chrome.storage.local.set({ quickNote: elements.notes.value.slice(0, 5000) });
      }, 400);
    });
  }

  let pomodoroInterval;
  let pomodoroSeconds = 25 * 60;
  let pomodoroRunning = false;

  function renderPomodoro() {
    const minutes = Math.floor(pomodoroSeconds / 60);
    const seconds = pomodoroSeconds % 60;
    elements.pomodoroTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    elements.pomodoroStart.textContent = pomodoroRunning ? 'Pause' : 'Start';
  }

  function stopPomodoro() {
    clearInterval(pomodoroInterval);
    pomodoroInterval = undefined;
    pomodoroRunning = false;
  }

  function togglePomodoro() {
    if (pomodoroRunning) {
      stopPomodoro();
      renderPomodoro();
      return;
    }
    pomodoroRunning = true;
    renderPomodoro();
    pomodoroInterval = setInterval(() => {
      pomodoroSeconds = Math.max(0, pomodoroSeconds - 1);
      renderPomodoro();
      if (pomodoroSeconds === 0) {
        stopPomodoro();
        elements.pomodoroTimer.textContent = 'Break time!';
      }
    }, 1000);
  }

  function resetPomodoro() {
    stopPomodoro();
    pomodoroSeconds = 25 * 60;
    renderPomodoro();
  }

  function initPomodoro() {
    if (!elements.pomodoroTimer || !elements.pomodoroStart || !elements.pomodoroReset) return;
    elements.pomodoroStart.addEventListener('click', togglePomodoro);
    elements.pomodoroReset.addEventListener('click', resetPomodoro);
    renderPomodoro();
  }

  async function applyWidgetVisibility() {
    const { widgetVisibility = {} } = await chrome.storage.sync.get({ widgetVisibility: {} });
    Object.entries(widgetVisibility).forEach(([widgetId, isVisible]) => {
      const widget = $(`${widgetId}-widget`);
      if (widget) widget.classList.toggle('hidden', isVisible === false);
    });
  }

  async function initialize() {
    updateGreeting();
    setInterval(updateGreeting, 30 * 1000);
    await applyWidgetVisibility();

    initPomodoro();
    await Promise.allSettled([
      loadWeather(),
      loadGitHub(),
      loadLeetCode(),
      loadStackOverflow(),
      loadDevTo(),
      loadHackerNews(),
      loadQuickLinks(),
      initTodos(),
      initQuickNotes()
    ]);
  }

  initialize();
});
