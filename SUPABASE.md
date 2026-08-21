# Supabase setup

The site can use Supabase as shared storage while keeping browser `localStorage` as a fallback for local/demo use.

## 1. Create the database schema

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Run the full contents of `supabase-schema.sql`. The last line reloads the PostgREST schema cache, which fixes the Supabase error `Could not find the table ... in the schema cache` after new tables are created.

## 2. Add repository secrets

Open the GitHub repository and go to **Settings → Secrets and variables → Actions → Repository secrets**.

Add exactly these secrets:

- `supabase_url` — the Supabase **Project URL** from **Project Settings → API**.
- `supabase_anonpublic` — the Supabase **anon public** key from **Project Settings → API**.

Do not add or expose the `service_role` key. It bypasses Row Level Security and must never be delivered to a browser.

## 3. Deploy with GitHub Actions

Because repository secrets are only available to workflows, GitHub Pages must use the workflow in `.github/workflows/deploy-pages.yml` rather than **Deploy from a branch**.

1. Open **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. Push to `main` or run **Deploy GitHub Pages** manually from the **Actions** tab.

The workflow reads `supabase_url` and `supabase_anonpublic` from repository secrets, validates that both are present, generates `supabase-config.js` only inside the deployment artifact, and deploys it to Pages. Do not commit a real `supabase-config.js`: browser code cannot read GitHub repository secrets directly at runtime, so the Actions-generated file is the bridge between secrets and the static site.

## Local development

For local testing only, copy `supabase-config.example.js` to `supabase-config.js` and fill in your Project URL and anon public key. This local file is only for your machine; production always uses repository secrets through GitHub Actions, and the real `supabase-config.js` is ignored by Git.
