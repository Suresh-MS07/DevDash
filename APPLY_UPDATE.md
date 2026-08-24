# Applying this DevDash update

This package contains the verified text-file update prepared for `Suresh-MS07/DevDash`.

1. Extract the package over a clone of the existing repository so the original `icon.png` and `LICENSE` remain in place.
2. Delete the now-unused large assets:
   - `github-icon.png`
   - `hackernews-icon.png`
   - `todo-icon.png`
3. Run:

   ```bash
   node --check dashboard.js
   node --check options.js
   node scripts/validate.mjs
   ```

4. Load the folder through `chrome://extensions` using **Load unpacked** for a browser smoke test.

The update removes the GitHub-token requirement, migrates the weather key to local storage, implements the previously missing widgets, corrects Manifest V3 host permissions, and adds CI/security/contribution documentation.
