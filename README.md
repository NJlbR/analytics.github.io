# СоциоПары

Статический одностраничный сайт для социологического и демографического исследования симпатий. Приложение может работать в двух режимах:

- **Supabase** — общая база данных для всех посетителей сайта.
- **localStorage** — запасной демо-режим, если Supabase URL и anon key ещё не указаны.

## Подключение Supabase

1. Создайте проект на [supabase.com](https://supabase.com/).
2. Откройте проект и перейдите в **SQL Editor**.
3. Скопируйте и выполните SQL из файла `supabase-schema.sql`.
4. Откройте **Project Settings → API**.
5. Скопируйте:
   - **Project URL** — вставьте в `url` файла `supabase-config.js`;
   - **anon public** key — вставьте в `anonKey` файла `supabase-config.js`.
6. Не отправляйте и не публикуйте **service_role** key: он даёт полный доступ к базе и не должен попадать в статический сайт.

Пример `supabase-config.js`:

```js
window.SOCIOPAIRS_SUPABASE = {
  url: 'https://your-project-id.supabase.co',
  anonKey: 'your-anon-public-key',
};
```

## Деплой на GitHub Pages

Чтобы избежать конфликтов между ветками из-за кастомных GitHub Actions workflow, сайт публикуется стандартным способом GitHub Pages из ветки репозитория:

1. Откройте **Settings → Pages** в репозитории.
2. В блоке **Build and deployment** выберите **Deploy from a branch**.
3. Выберите нужную ветку и папку **/(root)**.
4. Сохраните настройки.

GitHub Pages будет отдавать `index.html` из корня репозитория. Файл `.nojekyll` оставлен, чтобы Pages не запускал Jekyll-обработку.

## Важно о безопасности данных

В GitHub Pages можно безопасно хранить только публичный `anon` key Supabase. Таблицы создаются с Row Level Security и ограничениями типов данных, но текущая регистрация по username остаётся лёгким исследовательским прототипом без паролей. Для приватных персональных данных нужно добавить полноценную Supabase Auth-аутентификацию и более строгие RLS-политики по `auth.uid()`.
