# Scheduler


A responsive store-manager dashboard for Brian’s Grocery in Illinois. The prototype combines server-side sales forecasting with an availability- and cap-aware weekly draft schedule. All displayed currency is USD; store dates and the “today” indicator use `America/Chicago`.

## Local development

Requirements: Node.js 22 LTS (or another current Node LTS that supports `--env-file-if-exists`) and npm.

```powershell
npm install
npm run dev
```

The Express API runs at `http://localhost:3000`; Vite serves the dashboard at `http://localhost:5173` and proxies `/api` to Express. By default, the server generates clearly labeled, deterministic sample sales for the 12 weeks before the current Chicago store week plus sample current-week-to-date totals for the dashboard comparison.

Useful commands:

```powershell
npm test
npm run build
npm run test:e2e
npm start
```

`npm start` runs the production Express server. Build the frontend first with `npm run build`; the server then serves the compiled assets on port 3000.

## Docker

```powershell
docker compose up --build
```

Open [http://localhost:3001](http://localhost:3001). Compose publishes the application only on `127.0.0.1:3001`, mapped to container port 3000. The production image builds Vite assets in a separate stage, runs Node as the unprivileged `node` user, and provides `/api/health`.

To use a private sales file in a Compose-run container, mount it read-only and point the server to its in-container path. For example, in PowerShell:

```powershell
docker compose run --build --service-ports `
  --volume "C:\private\brians-sales.json:/run/private/sales.json:ro" `
  --env SALES_DATA_PATH=/run/private/sales.json scheduler
```

For a private input with a different host path, replace the left side of the volume mapping. The application image deliberately excludes local data files. Never put production sales input in `public/`, `src/`, or `dist/`.

## Optional Tailscale HTTPS

1. Put a Tailscale auth key in a local `.env` file based on `.env.example`:

   ```dotenv
   TS_AUTHKEY=tskey-auth-...
   ```

2. Start the app and optional sidecar:

   ```powershell
   docker compose --profile tailscale up --build
   ```

The sidecar shares the scheduler network namespace, persists its state in the `tailscale-state` volume, and configures HTTPS Serve to proxy to the app on port 3000. The tailnet device must have HTTPS certificates available in its Tailscale DNS settings. Funnel is not enabled or configured. Treat the auth key as a secret; do not commit `.env`.

## Sales input and scheduling policy

Set `SALES_DATA_PATH` to a private server-side UTF-8 file containing either a JSON array or one JSON object per line (JSONL). Each record has this form:

```json
[
  {"date":"2026-10-05","sales":4850},
  {"date":"2026-10-06","sales":5120}
]
```

Dates must be real `YYYY-MM-DD` calendar dates, sales must be finite non-negative numbers, and dates must be unique. Invalid or unreadable configured files cause an explicit API error; the server does not silently fall back to sample data. For local development, set the environment variable before `npm run dev`, or put it in `.env` (keep it out of source control). For Docker, mount the file read-only as shown above and set `SALES_DATA_PATH` to the container path.

Sales records stay on the server. Browser APIs contain weekly totals, the forecast, relative staffing demand, schedule details, and promotions—not the input daily records. The development server blocks static requests to the configured sales file; production static serving exposes only the built `dist/` directory. Schedule CSV exports contain shift details only.

Policy defaults:

- `SALES_CAPACITY`: USD per employee work-hour; defaults to `$220`.
- Store hours: 10:00–22:00.
- Estimated daily demand assigns 44% of forecast sales to 10:00–16:00 and 56% to 16:00–22:00. This is an explicit assumption because hourly sales are not provided.
- Required workers per block are `ceiling(block forecast sales / (6 hours × sales capacity))`.
- Each weekday forecast uses up to six previous matching weekdays, weighted so more recent observations count more. It requires four observations for that weekday, and it only reads sales before the selected forecast week. Sales are a proxy for traffic, not measured footfall.
- Promotions do not modify staffing requirements.
- Four fictional full-time and four fictional part-time employees have seeded availability and contractual caps. Part-time shifts are evenings only. Assignments are balanced within eligible staff and respect the 11-hour rest, daily-shift, days-per-week, availability, and hours limits. Any unfilled demand remains a visible gap.

## Prototype limitations

- Schedules are drafts generated in memory and are not saved or published. “Generate draft” recalculates from the current server data.
- Sample promotions and employee details are illustrative; promotions are not connected to inventory or point-of-sale systems.
- Daily sales are the only input resolution. Intraday allocation is assumed, and daily sales must not be interpreted as actual customer counts.
- This is not a complete legal-compliance product. Additional Illinois and other applicable scheduling/employment requirements need separate verification.
- The app does not authenticate users or provide multi-store access controls. Protect access appropriately before using it with real data.

## Tests

`npm test` exercises forecast monotonicity and future-data exclusion, minimum history, input validation, staffing caps/availability/rest, part-time evening hours, and visible gaps. `npm run test:e2e` runs Playwright browser checks for navigation, employee search, shift inspection, CSV export, scheduling-rules dialog keyboard behavior, and mobile layout. Install the Playwright browser once if needed with `npx playwright install chromium`.
