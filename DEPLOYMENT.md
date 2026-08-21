# GitHub Pages deployment

This repository is a static GitHub Pages site: `index.html`, `app.js`, `styles.css`, `supabase-config.js`, and `.nojekyll` live at the repository root.

To publish without a custom workflow:

1. Open **Settings → Pages** in the GitHub repository.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the branch that contains the site and choose **/(root)** as the folder.
4. Save the settings.

The `.nojekyll` file disables Jekyll processing so GitHub Pages serves the static files as-is.

## Supabase data storage

Before deploying with shared storage, run `supabase-schema.sql` in **Supabase → SQL Editor**. Then open **Project Settings → API** and copy the **Project URL** and **anon public** key into `supabase-config.js`.

Never place a Supabase `service_role` key in this repository or in any browser-delivered file. If `supabase-config.js` is left blank, the app falls back to browser `localStorage` for local testing.
