# Security Policy

## Supported version

Security fixes are applied to the latest version on the `main` branch.

## Report a vulnerability

Do not open a public issue for a vulnerability or suspected credential exposure. Email **sureshmewada990@gmail.com** with:

- a concise description of the issue;
- reproduction steps;
- affected files or features;
- expected impact;
- a suggested fix, if available.

Please avoid accessing data that does not belong to you. Acknowledgement and remediation timing depend on severity and reproducibility.

## Security design

- DevDash does not require a GitHub personal access token.
- The OpenWeatherMap key is stored in `chrome.storage.local`, not synchronized storage.
- Remote content is inserted through DOM APIs and text nodes.
- Only HTTP and HTTPS quick links are accepted.
- External API requests use timeouts and a scoped cache.
- Manifest host permissions are limited to services used by visible widgets.

Users can remove local API cache entries from the settings page at any time.
