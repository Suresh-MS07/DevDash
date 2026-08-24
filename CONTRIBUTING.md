# Contributing to DevDash

Thank you for helping improve DevDash. Small, focused pull requests are easiest to review and maintain.

## Before you start

1. Search existing issues and pull requests to avoid duplicate work.
2. Open an issue for a large feature or behavior change before implementation.
3. Never commit API keys, access tokens, personal notes, or browser storage exports.

## Local workflow

```bash
git clone https://github.com/Suresh-MS07/DevDash.git
cd DevDash
git checkout -b feature/short-description
npm test
```

Load the repository through `chrome://extensions` using **Load unpacked** and manually verify:

- a fresh install with no settings;
- configured API widgets;
- temporary network failure behavior;
- keyboard navigation and focus states;
- narrow and wide browser windows;
- settings persistence after reopening a new tab.

## Pull request checklist

- [ ] The change is limited to one clear concern.
- [ ] `npm test` passes.
- [ ] No token, key, or personal data is included.
- [ ] User-controlled content is rendered with `textContent` or DOM nodes, not HTML injection.
- [ ] Manifest permissions are minimal and documented.
- [ ] README or configuration instructions are updated when behavior changes.
- [ ] Manual browser testing is described in the pull request.

## Style

- Use clear names and small functions.
- Prefer browser-native APIs and avoid dependencies unless they provide substantial value.
- Preserve keyboard accessibility and `prefers-reduced-motion` behavior.
- Keep external network requests behind the shared cache and timeout layer.

By contributing, you agree that your contribution will be licensed under the MIT License.
