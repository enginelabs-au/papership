# Papership

Local-first dashboard UI (cc-org-dash shell, roster/reporting views, and related screens).

## Prerequisites

- Node.js 18+

## Setup

```bash
npm install
```

Optional: create `.env.local` if you need app-wide config (see [Environment](#environment)).

## Run locally

```bash
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Environment

These variables are optional. `app-params` can also read `app_id`, `access_token`, and `app_base_url` from the query string.

| Variable | Purpose |
|----------|---------|
| `VITE_APP_ID` | Default app identifier stored in local storage |
| `VITE_APP_BASE_URL` | Optional API base URL for future integrations |
| `VITE_FUNCTIONS_VERSION` | Optional version string for API clients |
