# GitHub Pages deployment

This repository is a static GitHub Pages site: `index.html`, `app.js`, `styles.css`, and `.nojekyll` live at the repository root. `supabase-config.js` is generated during deployment from repository secrets.

To publish with repository secrets, use GitHub Actions instead of **Deploy from a branch**:

1. Open **Settings → Secrets and variables → Actions** in the GitHub repository.
2. Add `supabase_url` with the Supabase Project URL.
3. Add `supabase_anonpublic` with the Supabase anon public key.
4. Open **Settings → Pages** and choose **GitHub Actions** as the source.
5. Push to `main` or run **Deploy GitHub Pages** manually from the Actions tab.

The `.nojekyll` file disables Jekyll processing so GitHub Pages serves the static files as-is.

## Supabase data storage

Before deploying with shared storage, run `supabase-schema.sql` in **Supabase → SQL Editor**. The workflow writes `supabase-config.js` from the `supabase_url` and `supabase_anonpublic` repository secrets during deployment.

Never place a Supabase `service_role` key in this repository or in any browser-delivered file. For local testing, copy `supabase-config.example.js` to `supabase-config.js`; the real local config file is ignored by Git.
