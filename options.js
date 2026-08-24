document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const form = $('settings-form');
  const fields = {
    githubUsername: $('githubUsername'),
    leetcodeUsername: $('leetcodeUsername'),
    weatherCity: $('weatherCity'),
    weatherApiKey: $('weatherApiKey'),
    stackoverflowId: $('stackoverflowId')
  };
  const visibilityContainer = $('widget-visibility-container');
  const linksContainer = $('links-container');
  const linkName = $('linkName');
  const linkUrl = $('linkUrl');
  const linkError = $('linkError');
  const addLinkButton = $('addLinkBtn');
  const clearCacheButton = $('clearCacheButton');
  const statusMessage = $('statusMessage');
  // Chrome sync storage allows about 8 KiB per item. Keep headroom for
  // serialization differences so oversized quick links fail before save.
  const MAX_SYNC_ITEM_BYTES = 7500;

  const WIDGETS = [
    { id: 'weather', label: 'Weather' },
    { id: 'github', label: 'GitHub' },
    { id: 'leetcode', label: 'LeetCode' },
    { id: 'links', label: 'Quick Links' },
    { id: 'devto', label: 'Dev.to' },
    { id: 'hackernews', label: 'Hacker News' },
    { id: 'todo-list', label: 'To-Do List' },
    { id: 'quick-notes', label: 'Quick Notes' },
    { id: 'pomodoro-timer', label: 'Pomodoro' },
    { id: 'stack-overflow', label: 'Stack Overflow' }
  ];

  let bookmarks = [];
  let statusTimer;

  function createElement(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    return node;
  }

  function showStatus(message, isError = false) {
    clearTimeout(statusTimer);
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? '#ff8a98' : '';
    statusTimer = setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.style.color = '';
    }, 3500);
  }

  function normalizeUrl(value) {
    let candidate = String(value || '').trim();
    if (!candidate) throw new Error('Enter a link URL.');
    if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
    const parsed = new URL(candidate);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS links are allowed.');
    return parsed.href;
  }

  function syncItemSizeBytes(key, value) {
    return new TextEncoder().encode(`${key}${JSON.stringify(value)}`).length;
  }

  function assertBookmarksFitSyncQuota(nextBookmarks) {
    if (syncItemSizeBytes('bookmarks', nextBookmarks) > MAX_SYNC_ITEM_BYTES) {
      throw new Error('Quick links are too large to sync. Remove a link or shorten a URL.');
    }
  }

  function renderWidgetCheckboxes(visibility = {}) {
    visibilityContainer.replaceChildren();
    WIDGETS.forEach(({ id, label }) => {
      const wrapper = createElement('label', { className: 'checkbox-label' });
      const checkbox = createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.widgetId = id;
      checkbox.checked = visibility[id] !== false;
      wrapper.append(checkbox, createElement('span', { text: label }));
      visibilityContainer.appendChild(wrapper);
    });
  }

  function renderBookmarks() {
    linksContainer.replaceChildren();
    if (bookmarks.length === 0) {
      linksContainer.appendChild(createElement('p', { className: 'section-copy', text: 'No quick links added yet.' }));
      return;
    }

    bookmarks.forEach((bookmark, index) => {
      const item = createElement('div', { className: 'link-item' });
      item.appendChild(createElement('span', {
        className: 'link-item-text',
        text: `${bookmark.name} — ${bookmark.url}`
      }));
      const remove = createElement('button', { className: 'delete-link-btn', text: '×' });
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${bookmark.name}`);
      remove.addEventListener('click', () => {
        bookmarks.splice(index, 1);
        renderBookmarks();
      });
      item.appendChild(remove);
      linksContainer.appendChild(item);
    });
  }

  function addBookmark() {
    linkError.textContent = '';
    const name = linkName.value.trim();
    if (!name) {
      linkError.textContent = 'Enter a label for the link.';
      return;
    }
    if (bookmarks.length >= 20) {
      linkError.textContent = 'You can save up to 20 quick links.';
      return;
    }

    try {
      const url = normalizeUrl(linkUrl.value);
      if (bookmarks.some((bookmark) => bookmark.url === url)) {
        linkError.textContent = 'This URL is already in your quick links.';
        return;
      }
      const nextBookmarks = [...bookmarks, { name: name.slice(0, 40), url }];
      assertBookmarksFitSyncQuota(nextBookmarks);
      bookmarks = nextBookmarks;
      linkName.value = '';
      linkUrl.value = '';
      renderBookmarks();
    } catch (error) {
      linkError.textContent = error.message;
    }
  }

  async function migrateLegacySecrets(syncSettings, localSettings) {
    if (!localSettings.weatherApiKey && syncSettings.weatherApiKey) {
      await chrome.storage.local.set({ weatherApiKey: syncSettings.weatherApiKey });
      fields.weatherApiKey.value = syncSettings.weatherApiKey;
    }

    const legacyKeys = [];
    if (syncSettings.weatherApiKey) legacyKeys.push('weatherApiKey');
    if (syncSettings.githubToken) legacyKeys.push('githubToken');
    if (legacyKeys.length > 0) await chrome.storage.sync.remove(legacyKeys);
  }

  async function loadSettings() {
    const [syncSettings, localSettings] = await Promise.all([
      chrome.storage.sync.get([
        'githubUsername',
        'githubToken',
        'leetcodeUsername',
        'weatherApiKey',
        'weatherCity',
        'stackoverflowId',
        'bookmarks',
        'widgetVisibility'
      ]),
      chrome.storage.local.get('weatherApiKey')
    ]);

    fields.githubUsername.value = syncSettings.githubUsername || '';
    fields.leetcodeUsername.value = syncSettings.leetcodeUsername || '';
    fields.weatherCity.value = syncSettings.weatherCity || '';
    fields.weatherApiKey.value = localSettings.weatherApiKey || '';
    fields.stackoverflowId.value = syncSettings.stackoverflowId || '';
    bookmarks = Array.isArray(syncSettings.bookmarks) ? syncSettings.bookmarks.slice(0, 20) : [];

    renderBookmarks();
    renderWidgetCheckboxes(syncSettings.widgetVisibility || {});
    await migrateLegacySecrets(syncSettings, localSettings);
  }

  function validateProfiles() {
    const githubUsername = fields.githubUsername.value.trim();
    const stackoverflowId = fields.stackoverflowId.value.trim();
    if (githubUsername && !/^(?!-)[a-z\d-]{1,39}(?<!-)$/i.test(githubUsername)) {
      throw new Error('Enter a valid GitHub username.');
    }
    if (stackoverflowId && !/^\d+$/.test(stackoverflowId)) {
      throw new Error('Stack Overflow user ID must contain only numbers.');
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    try {
      validateProfiles();
      assertBookmarksFitSyncQuota(bookmarks);
      const widgetVisibility = {};
      visibilityContainer.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        widgetVisibility[checkbox.dataset.widgetId] = checkbox.checked;
      });

      await chrome.storage.sync.set({
        githubUsername: fields.githubUsername.value.trim(),
        leetcodeUsername: fields.leetcodeUsername.value.trim(),
        weatherCity: fields.weatherCity.value.trim(),
        stackoverflowId: fields.stackoverflowId.value.trim(),
        bookmarks,
        widgetVisibility
      });

      const weatherApiKey = fields.weatherApiKey.value.trim();
      if (weatherApiKey) await chrome.storage.local.set({ weatherApiKey });
      else await chrome.storage.local.remove('weatherApiKey');
      showStatus('Settings saved successfully.');
    } catch (error) {
      showStatus(error.message || 'Could not save settings.', true);
    }
  }

  async function clearApiCache() {
    const stored = await chrome.storage.local.get(null);
    const cacheKeys = Object.keys(stored).filter((key) => key.startsWith('cache:'));
    if (cacheKeys.length > 0) await chrome.storage.local.remove(cacheKeys);
    showStatus(cacheKeys.length > 0 ? 'API cache cleared.' : 'API cache is already empty.');
  }

  addLinkButton.addEventListener('click', addBookmark);
  linkUrl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addBookmark();
    }
  });
  form.addEventListener('submit', saveSettings);
  clearCacheButton.addEventListener('click', clearApiCache);

  loadSettings().catch(() => showStatus('Could not load existing settings.', true));
});
