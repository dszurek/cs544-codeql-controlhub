# ControlHub

A self-hosted, single-user productivity hub built with Next.js 16 — tasks,
calendar, email, smart home, **health**, and an embedded **AI engine** on one
surface. Designed to run on a Raspberry Pi 5 as a kiosk and reach you on phone
and laptop over Tailscale or Cloudflare.

Its design language is "Heirloom Futurism": a lifted-graphite base with an
earthy accent palette (synced to the owner's portfolio), a time-of-day ambient
field, layered glass, and monospace instrument readouts.

## Surfaces

ControlHub is organized into six surfaces — by what you're doing, not data type:

- **Today** — hero clock, a mission timeline (calendar events, task deadlines,
  auto-scheduled work blocks, a live now-line), and a rail of AI Signals,
  briefing, tasks, weather, mail, and scenes.
- **Plan** — **Horizon** (Now/Next/Later board), **Backlog** (full task manager:
  projects, subtasks, blockers, time-blocking, templates), **Calendar**,
  **Someday**.
- **Streams** — unified Outlook + Gmail inbox with AI triage into
  urgent / needs-reply / fyi / noise, one-line summaries, and voice-matched
  reply drafting.
- **Body** — Apple Health instruments: readiness, sleep debt, a circadian
  energy curve, and trends, all relative to your own baselines.
- **Spaces** — Home Assistant control (every entity, grouped by room, with live
  state over WebSocket), a **Routines** automation builder, and the full HA UI
  embedded in the hub for device pairing and settings. Ships with a Matter
  controller; Matter, HomeKit and Alexa devices all land here.
- **Library** — daily Notes, a Grades/GPA tracker, and the **Forge**.

## Intelligence & automation

- **Cortex** — an AI job engine (runs on the Claude CLI, so it's covered by your
  subscription): twice-daily briefing, daily health insight, a weekly review
  that correlates tasks against sleep, email triage, and day planning. Results
  surface as a unified Signals feed.
- **Flow** — a deterministic auto-scheduler that time-blocks tasks into calendar
  gaps, placing deep work in your predicted energy peaks; plan blocks export to
  any calendar via the merged ICS feed.
- **Routines** — cross-domain trigger→condition→action automations (time,
  health metric, calendar, task, or Home Assistant state → notify, scene,
  create task, replan, run an AI job…) with web-push notifications.
- **Forge** — ask ControlHub to modify its own code; changes are made on an
  isolated branch, tested, and shown to you as a diff to approve. Off by default.

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19, standalone output)
- **Database**: SQLite via Prisma 7 + better-sqlite3
- **Styling**: Tailwind CSS 4 + a custom design system (`src/app/globals.css`)
- **AI**: headless Claude CLI (`claude -p`) with MCP database tools
- **Integrations**: Home Assistant, Outlook (Microsoft Graph), Gmail, iCloud
  CalDAV, ICS feeds, GitHub, Open-Meteo weather, Apple Health (Health Auto
  Export), Web Push (VAPID)
- **Auth**: single-user password with HMAC-signed session cookies

## Quick Start (development)

```bash
git clone https://github.com/dszurek/controlhub.git
cd controlhub

npm install
cp .env.example .env.local        # set AUTH_PASSWORD (default is "changeme")

npx prisma migrate deploy         # create all tables
npx prisma generate

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your
`AUTH_PASSWORD`.

> **AI features** (chat, Cortex jobs, the Forge) need the **Claude CLI**
> installed and authenticated so `claude -p` works from the project directory.
> Without it, everything else still runs.

## Production Deployment (Raspberry Pi)

See **[GUIDE.md](./GUIDE.md)** for the full walkthrough:

- Pi setup, Node.js, the Claude CLI, building the standalone server, systemd
  auto-start
- Remote access via Cloudflare Tunnel or Tailscale
- Home Assistant (one-command Docker setup from `deploy/`)
- Apple Health ingestion, the AI engine, Flow, Routines & push, and the Forge
- Settings reference, backup, and troubleshooting

## License

Private / Personal use.
