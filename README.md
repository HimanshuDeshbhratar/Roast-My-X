# Roast My X

Witty, specific AI roasts of websites, resumes, pitch decks, and GitHub repos — plus optional real feedback behind an email gate.

**Free stack:** Google Gemini (AI Studio) + Microlink screenshots + Vercel Hobby.

## Features

| Mode | Input | Notes |
|---|---|---|
| Website | URL | HTML extract + screenshot (vision) |
| Resume | PDF ≤5MB | Text only; file never persisted |
| Pitch Deck | PDF / PPTX ≤8MB | Per-slide/page text; PPTX images for vision |
| Code | `owner/repo` or GitHub URL | README, commits, languages |
| Real feedback | Email gate | Structured critique, no jokes |

All modes share one `generateRoast()` / `generateFeedback()` engine.

## Setup

1. Free Gemini key: [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Create `.env.local` (or `.env`):

```bash
GEMINI_API_KEY=your-key-here
# optional: GITHUB_TOKEN=ghp_...
```

3. Run:

```bash
npm install
npm run dev
```

## Deploy

```bash
npx vercel
```

Set `GEMINI_API_KEY` in Vercel env. Optional: `GITHUB_TOKEN`, `EMAIL_WEBHOOK_URL`.

Rate limit: **5 requests / IP / hour**. Emails append to `data/emails.json` locally (ephemeral on Vercel unless you set a webhook).
