# Lad

Mobile-first MVP for an AI daily planner: Capture → Inbox → Today.

## Local development

```bash
npm install
npm run dev
```

## Deploy to Vercel

Import the GitHub repository into Vercel. The framework preset should be detected as Vite; use `npm run build` as the build command and `dist` as the output directory.

For AI parsing, create a free API key in [Google AI Studio](https://aistudio.google.com/apikey) and add it to Vercel Environment Variables as `GEMINI_API_KEY`. The app uses `gemini-2.5-flash-lite`; without a key, it automatically falls back to local heuristic parsing. Parsed tasks are stored in `localStorage`.
