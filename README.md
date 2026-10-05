# Дневник малыша

Мобильное веб-приложение для отслеживания кормлений, сна и туалета ребёнка.
Next.js (App Router) + Supabase, без авторизации.

## Запуск

1. В Supabase откройте **SQL Editor** и выполните [`supabase/schema.sql`](supabase/schema.sql) — он создаёт таблицы и открывает к ним доступ.
2. Заполните `.env.local` (значения из **Project Settings → API**):

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
   ```

3. Запустите:

   ```bash
   npm install
   npm run dev
   ```

## Деплой на Vercel

Импортируйте репозиторий в Vercel и добавьте те же две переменные в
**Settings → Environment Variables**. Они вшиваются в сборку, поэтому после
изменения значений нужен новый деплой.

## Важно

Авторизации нет: любой, у кого есть ссылка на приложение, может читать и менять
записи. Не публикуйте ссылку.
