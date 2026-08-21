# GitHub Pages deployment

This repository is a static GitHub Pages site. Production Supabase settings are not committed into the repository; GitHub Actions creates `supabase-config.js` from repository secrets during deployment.

## Required Pages mode

Use the workflow-based Pages deployment so repository secrets are available:

1. Open **Settings → Pages** in the GitHub repository.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Push to `main` or run **Deploy GitHub Pages** manually from the **Actions** tab.

Do not use **Deploy from a branch** for production. Branch deployments publish the repository files exactly as committed and cannot read repository secrets, so the browser will not receive Supabase settings and the app will fall back to `localStorage`.

The `.nojekyll` file disables Jekyll processing so GitHub Pages serves the static files as-is.

## Supabase data storage

Before deploying with shared storage, run `supabase-schema.sql` in **Supabase → SQL Editor**. Then add these repository secrets in **Settings → Secrets and variables → Actions → Repository secrets**:

- `supabase_url` — the Supabase **Project URL** from **Project Settings → API**.
- `supabase_anonpublic` — the Supabase **anon public** key from **Project Settings → API**.
- `supabase_db_url` — the Supabase database connection string from database settings, used only by GitHub Actions to apply `supabase-schema.sql` before deploy.

The workflow validates that the secrets are present, applies `supabase-schema.sql` with `supabase_db_url`, writes `supabase-config.js` only inside the deployment artifact, and then publishes the site. Never place a Supabase `service_role` key in this repository or in any browser-delivered file.

For local testing only, copy `supabase-config.example.js` to `supabase-config.js` and fill in the public Project URL and anon key. The real local config remains ignored by Git.
