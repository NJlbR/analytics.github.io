# GitHub Pages deployment

This repository is a static GitHub Pages site: `index.html`, `app.js`, `styles.css`, and `.nojekyll` live at the repository root.

To publish without a custom workflow:

1. Open **Settings → Pages** in the GitHub repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the branch that contains the site and choose **/(root)** as the folder.
4. Save the settings.

The `.nojekyll` file disables Jekyll processing so GitHub Pages serves the static files as-is.

## Data model caveat

The app is a client-side prototype. Users, username uniqueness checks, survey answers, and aggregate statistics are stored in the current browser's `localStorage`. A real multi-user research deployment needs a shared backend database or backend-as-a-service.
