# Lad

Mobile-first MVP AI-планера дня: Capture → Inbox → Today.

## Локальний запуск

```bash
npm install
npm run dev
```

## Деплой на Vercel

Імпортуйте GitHub-репозиторій у Vercel. Framework Preset визначиться як Vite, build-команда — `npm run build`, output — `dist`.

Для AI-розбору створіть безкоштовний API-ключ у [Google AI Studio](https://aistudio.google.com/apikey) і додайте у Vercel Environment Variables серверну змінну `GEMINI_API_KEY`. Застосунок використовує модель `gemini-2.5-flash-lite`; без ключа він автоматично переходить на локальний евристичний розбір. Готові задачі зберігаються в `localStorage`.
