# СоциоПары

Статический одностраничный сайт для социологического и демографического исследования симпатий. Приложение может работать в двух режимах:

- **Supabase** — общая база данных для всех посетителей сайта.
- **localStorage** — запасной демо-режим, если Supabase URL и anon key ещё не указаны.

## Подключение Supabase

1. Создайте проект на [supabase.com](https://supabase.com/).
2. Откройте проект и перейдите в **SQL Editor**.
3. Скопируйте и выполните SQL из файла `supabase-schema.sql`.
4. Откройте **Project Settings → API** и скопируйте **Project URL** и **anon public** key.
5. Добавьте их в **Settings → Secrets and variables → Actions → Repository secrets**:
   - `supabase_url` = Project URL;
   - `supabase_anonpublic` = anon public key.
6. В **Settings → Pages** выберите источник **GitHub Actions**. Workflow сам создаст `supabase-config.js` во время деплоя, не сохраняя ключи в репозитории.
7. Не отправляйте и не публикуйте **service_role** key: он даёт полный доступ к базе и не должен попадать в статический сайт.

Для локальной проверки можно скопировать `supabase-config.example.js` в `supabase-config.js`; реальный `supabase-config.js` добавлен в `.gitignore`.

## Деплой на GitHub Pages

Сайт публикуется через GitHub Actions, потому что `supabase-config.js` создаётся из repository secrets во время деплоя:

1. Откройте **Settings → Pages** в репозитории.
2. В блоке **Build and deployment** выберите **GitHub Actions**.
3. Запушьте изменения в `main` или запустите workflow **Deploy GitHub Pages** вручную во вкладке **Actions**.

GitHub Pages будет отдавать статические файлы из artifact, подготовленного workflow. Файл `.nojekyll` оставлен, чтобы Pages не запускал Jekyll-обработку.

## Важно о безопасности данных

В GitHub Pages `anon` key Supabase всё равно становится доступен браузеру после деплоя, но он не хранится в файлах репозитория: workflow подставляет его из repository secrets. Таблицы создаются с Row Level Security и ограничениями типов данных, но текущая регистрация по username остаётся лёгким исследовательским прототипом без паролей. Для приватных персональных данных нужно добавить полноценную Supabase Auth-аутентификацию и более строгие RLS-политики по `auth.uid()`.
