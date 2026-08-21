# СоциоПары

Статический одностраничный сайт для социологического и демографического исследования симпатий. Приложение может работать в двух режимах:

- **Supabase** — общая база данных для всех посетителей сайта.
- **localStorage** — запасной демо-режим, если Supabase URL и anon key ещё не указаны.
## Подключение Supabase
1. Создайте проект на [supabase.com](https://supabase.com/).
2. Откройте проект и перейдите в **SQL Editor**.
3. Скопируйте и выполните SQL из файла `supabase-schema.sql`.
4. Откройте **Project Settings → API** и скопируйте **Project URL** и **anon public** key.
5. В GitHub откройте **Settings → Secrets and variables → Actions → Repository secrets** и добавьте ровно эти secrets:
   - `supabase_url` — Supabase **Project URL**;
   - `supabase_anonpublic` — Supabase **anon public** key.
6. Не отправляйте и не публикуйте **service_role** key: он даёт полный доступ к базе и не должен попадать в статический сайт.
Для локального тестирования можно скопировать `supabase-config.example.js` в `supabase-config.js` и вписать публичные значения вручную. Настоящий `supabase-config.js` игнорируется Git и не коммитится.
## Деплой на GitHub Pages

Для production нужно использовать GitHub Actions, потому что статический GitHub Pages не умеет читать repository secrets прямо из браузера. Workflow `.github/workflows/deploy-pages.yml` создаёт `supabase-config.js` из secrets только внутри deployment artifact.

1. Откройте **Settings → Pages** в репозитории.
2. В блоке **Build and deployment** выберите **GitHub Actions**.
3. Запустите workflow **Deploy GitHub Pages** вручную или сделайте push в `main`.
Не используйте **Deploy from a branch** для production: такой режим публикует файлы из репозитория без доступа к secrets, поэтому сайт покажет сообщение `Supabase не настроен` и перейдёт в `localStorage`.

GitHub Pages будет отдавать `index.html` из артефакта workflow. Файл `.nojekyll` оставлен, чтобы Pages не запускал Jekyll-обработку.
## Важно о безопасности данных

В GitHub Pages можно безопасно хранить только публичный `anon` key Supabase. Таблицы создаются с Row Level Security и ограничениями типов данных, но текущая регистрация по username остаётся лёгким исследовательским прототипом без паролей. Для приватных персональных данных нужно добавить полноценную Supabase Auth-аутентификацию и более строгие RLS-политики по `auth.uid()`.
