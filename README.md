# Lad

Mobile-first MVP AI-планера дня: Capture → Inbox → Today.

## Локальний запуск

```bash
npm install
npm run dev
```

## Деплой на Vercel

Імпортуйте GitHub-репозиторій у Vercel. Framework Preset визначиться як Vite, build-команда — `npm run build`, output — `dist`.

Для AI-розбору додайте у Vercel Environment Variables серверну змінну `ANTHROPIC_API_KEY`. Без ключа застосунок автоматично використовує локальний евристичний розбір. Задачі зберігаються в `localStorage`.
