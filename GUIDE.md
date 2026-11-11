# ControlHub — Deployment & Feature Guide

ControlHub is a personal, single-user productivity hub: tasks, calendar, email,
smart home, health, and an embedded AI engine, all on one self-hosted surface.
It's designed to run on a Raspberry Pi 5 as a wall/desk kiosk and be reachable
from your phone and laptop over Tailscale or a Cloudflare Tunnel.

This guide covers everything from a bare Pi to a fully running hub with AI,
health insights, automations, and self-modification.

---

## Table of Contents

**Part I — Deploying on a Raspberry Pi**
1. [Requirements & prerequisites](#1-requirements--prerequisites)
2. [Installing ControlHub](#2-installing-controlhub)
3. [Building for production](#3-building-for-production)
4. [Running as a system service](#4-running-as-a-system-service)
5. [Remote access (Cloudflare Tunnel / Tailscale)](#5-remote-access)
6. [Authentication](#6-authentication)
7. [The Claude CLI (powers AI features)](#7-the-claude-cli)

**Part II — Integrations**
8. [Home Assistant](#8-home-assistant-integration)
9. [Apple Health → the Body surface](#9-apple-health--the-body-surface)
10. [Email (Outlook / Gmail)](#10-email-integration)
11. [Calendar (iCloud / ICS / merged feed)](#11-calendar-integration)

**Part III — Intelligence & automation**
12. [Cortex — the AI job engine](#12-cortex--the-ai-job-engine)
13. [Flow — the auto-scheduler](#13-flow--the-auto-scheduler)
14. [Streams — email triage & drafts](#14-streams--email-triage)
15. [Routines & notifications](#15-routines--notifications)
16. [Forge — AI self-modification](#16-forge--ai-self-modification)

**Part IV — Using ControlHub**
17. [The six surfaces](#17-the-six-surfaces)
18. [Appearance & layout customization](#18-appearance--layout)
19. [Command palette & shortcuts](#19-command-palette--shortcuts)

**Part V — Operations**
20. [Settings reference](#20-settings-reference)
21. [Backup & maintenance](#21-backup--maintenance)
22. [Troubleshooting](#22-troubleshooting)

---

# Part I — Deploying on a Raspberry Pi

## 1. Requirements & prerequisites

### Hardware
- Raspberry Pi 5 (4GB minimum). A Pi 4 with 2GB+ works but is slower.
- An SSD over USB is strongly recommended over a MicroSD card — the database and
  AI jobs are I/O heavy.
- Optional: a 7–10" touchscreen for kiosk mode.

### Software
- **Node.js 20 or newer** (Next.js 16 requires it).
- **Git**.
- **The Claude CLI**, authenticated — required for chat, Cortex AI jobs, and the
  Forge. See [section 7](#7-the-claude-cli).
- **Docker** (only if you run Home Assistant on the same Pi — the setup script
  installs it for you).

### Install Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # v20.x or newer
npm --version
```

### Install Git

```bash
sudo apt install -y git
```

---

## 2. Installing ControlHub

```bash
# Clone the repository
git clone <your-repo-url> ~/controlhub
cd ~/controlhub

# Install dependencies (includes better-sqlite3, web-push, etc.)
npm install

# Create your environment file
cp .env.example .env.local
nano .env.local
```

Set two values in `.env.local` (this file is gitignored — secrets stay on the Pi):

```bash
DATABASE_URL="file:./dev.db"
AUTH_PASSWORD="your-secure-password-here"   # the password you'll log in with
```

Then prepare the database and assets:

```bash
# Apply all migrations (creates tasks, health, cortex, routines, forge tables…)
npx prisma migrate deploy

# Generate the Prisma client
npx prisma generate
```

### App icons (for installable PWA + push notifications)

The icons ship in the repo — `public/icon-192.png` and `public/icon-512.png`,
referenced by the web manifest and the service worker. Nothing to do.

They're declared `purpose: "any maskable"`, so Android renders the mark
edge-to-edge instead of shrinking it into a white circle. To restyle it, edit
the palette or geometry constants at the top of `scripts/generate-icons.py` and
re-run it (needs Pillow + numpy on your dev machine, not on the Pi):

```bash
python3 scripts/generate-icons.py
```

---

## 3. Building for production

ControlHub uses Next.js **standalone output** mode — a self-contained build
that doesn't need the full `node_modules` folder to run.

```bash
# Build the production bundle
npm run build

# The standalone server is at .next/standalone/server.js
# Copy static assets alongside it:
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```

> **Pi memory note:** `next build` is memory-hungry on a 4GB Pi. If the build is
> killed (OOM), build on your Mac/PC and copy the `.next/standalone` output to
> the Pi, or add swap: `sudo dphys-swapfile swapoff && sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile && sudo dphys-swapfile setup && sudo dphys-swapfile swapon`.

### Test the build

```bash
cd .next/standalone
NODE_ENV=production DATABASE_URL="file:$(realpath ../../dev.db)" node server.js
```

Open `http://<pi-ip>:3000` — you should see the login page. `Ctrl+C` to stop.

---

## 4. Running as a system service

Create a systemd service so ControlHub starts on boot:

```bash
sudo nano /etc/systemd/system/controlhub.service
```

```ini
[Unit]
Description=ControlHub Productivity Hub
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/controlhub
EnvironmentFile=/home/pi/controlhub/.env.local
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

> Change `User=pi` to your username (`whoami`). The background scheduler (sync,
> Cortex queue, routines tick) starts automatically with the server.

```bash
sudo systemctl daemon-reload
sudo systemctl enable controlhub
sudo systemctl start controlhub
sudo systemctl status controlhub
journalctl -u controlhub -f      # live logs
```

### Updating ControlHub

```bash
cd ~/controlhub
git pull
npm ci --production=false
npx prisma migrate deploy            # apply any new migrations
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
sudo systemctl restart controlhub
```

> **If you ever upgrade Node.js on the Pi, re-run `npm rebuild better-sqlite3`.**
> `better-sqlite3` is a native module compiled against one specific Node ABI.
> After a Node major upgrade the old binary stops loading and every page that
> touches the database dies with:
>
> ```
> Error [PrismaClientKnownRequestError]: ...
> The module '.../better_sqlite3.node' was compiled against a different
> Node.js version using NODE_MODULE_VERSION 141. This version of Node.js
> requires NODE_MODULE_VERSION 147.
> ```
>
> `npm rebuild better-sqlite3` recompiles it and fixes this. It's also why
> `npm ci` is in the update steps above — a clean install rebuilds it for you.

---

## 5. Remote access

### Option A — Cloudflare Tunnel (public HTTPS URL, no open ports)

```bash
# Install
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb && rm cloudflared.deb

# Authenticate (opens a browser link)
cloudflared tunnel login

# Create + route
cloudflared tunnel create controlhub
cloudflared tunnel route dns controlhub hub.yourdomain.com
```

```bash
mkdir -p ~/.cloudflared && nano ~/.cloudflared/config.yml
```

```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /home/pi/.cloudflared/<YOUR_TUNNEL_ID>.json
ingress:
  - hostname: hub.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared && sudo systemctl start cloudflared
```

Access at `https://hub.yourdomain.com` from anywhere.

### Option B — Tailscale (private VPN)

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Access at `http://<tailscale-ip>:3000`. Only devices on your tailnet can reach
it. **This is the recommended path for the Apple Health push** (your iPhone is
on the tailnet, so it can POST health data privately).

> **Web push needs HTTPS.** Push notifications (routines) require a secure
> context. Cloudflare Tunnel gives you that for free; with plain Tailscale HTTP,
> use Tailscale Serve/HTTPS or install to the home screen on a device that
> trusts the origin.

---

## 6. Authentication

ControlHub uses a single password from `.env.local` (`AUTH_PASSWORD`). The
default in `.env.example` is `changeme` — **change it before exposing the hub.**

```bash
nano ~/controlhub/.env.local      # set AUTH_PASSWORD="..."
sudo systemctl restart controlhub
```

Log in once per device; the session cookie lasts 30 days. Every device sees the
same data (one central SQLite database on the Pi).

Two endpoints bypass the password by design, each with its own token auth:
the merged calendar feed (`/api/calendar/feed/<token>`) and the health
ingestion endpoint (`/api/health/ingest`, Bearer token).

---

## 7. The Claude CLI

Chat, the **Cortex** AI jobs (briefing, health insight, weekly review, day
plan, email triage), and the **Forge** all run by invoking the Claude CLI in
headless mode (`claude -p`) on the Pi. This means:

- Install the Claude CLI on the Pi and authenticate it (so `claude -p "hello"`
  works from the `controlhub` working directory as the service user).
- AI features are covered by your Claude subscription — **no per-token API
  cost**, which is the whole point of routing through the CLI.
- If `claude` isn't on the service user's `PATH`, AI jobs fail gracefully and
  log an error; the rest of the app keeps working.

To disable all scheduled AI jobs (e.g. while testing), set `cortex_auto=off` in
Settings. Chat and manual job triggers still work.

---

# Part II — Integrations

## 8. Home Assistant Integration

### Run Home Assistant from this repo (recommended)

Home Assistant and a Matter controller live in `deploy/homeassistant/` and run
as Docker containers on the same Pi. One command provisions both:

```bash
./deploy/setup-ha.sh
```

The script installs Docker if missing, enables the Bluetooth service (needed for
Matter pairing), starts both containers with host networking and auto-restart,
waits until each answers, then prints the exact integration checklist below.
Re-run it any time to update to the latest releases.

Version-controlled vs. runtime:
- `deploy/homeassistant/docker-compose.yml` — both container definitions
- `deploy/homeassistant/config/configuration.yaml` — seed config
- `deploy/homeassistant/config/themes/controlhub.yaml` — HA theme matching the hub
- Everything HA writes at runtime (`.storage/`, databases, logs) and the Matter
  fabric credentials in `matter-data/` stay on the Pi and are gitignored —
  credentials never enter git.

### Connect ControlHub to HA

1. In HA: profile (bottom-left) → **Security** → **Long-Lived Access Tokens** →
   **Create Token**, name it "ControlHub", copy it.
2. In ControlHub → **Settings** → **Home Assistant**:
   - **HA URL**: `http://localhost:8123` (same-Pi) or `http://homeassistant.local:8123`
   - **Token**: paste it
   - **Save**, then **Test Connection**.
3. Optional: in HA, Profile → Themes → **controlhub** for the matching look.

> `localhost:8123` is correct even though you also open ControlHub from your
> phone. ControlHub resolves it per-browser: on the Pi kiosk it stays loopback,
> and from a phone it swaps in whatever host reached the Pi (your Tailscale
> address), keeping HA's port. See `src/lib/haBrowserUrl.ts`.

### The four ecosystems

They are **not** symmetric, and it's worth knowing which direction each runs
before you start clicking. All of these are free — none needs a Nabu Casa
subscription.

| | Direction | What you get | Setup |
|---|---|---|---|
| **Matter** | Into HA | Full control of every Matter device | Point the `matter` integration at `ws://localhost:5580/ws` |
| **HomeKit** | Into HA | Full local control of HomeKit accessories | Usually auto-discovered |
| **Alexa** | Into HA | Echo hardware: media players, TTS/announce, sensors, routine buttons | Amazon login + app-based 2FA |
| **Google Home** | Command-out | Sends spoken commands to Google Assistant. No entities. | Google Cloud project + OAuth |
| **HomeKit bridge** | Out of HA | Publishes HA devices to Siri/Apple Home | Uncomment `homekit:` in configuration.yaml |

All of the "into HA" setup happens under **Settings → Devices & Services →
+ Add Integration** — which you can do from inside ControlHub (see below).

**Matter** — choose *use an external server* and enter `ws://localhost:5580/ws`
(that's the `matter-server` container). Most Matter-over-Wi-Fi devices pair over
Bluetooth first; the Pi 5's built-in radio handles that.

> **Thread needs hardware the Pi doesn't have.** Matter-over-Thread devices need
> a Thread border router. The Pi 5 has no Thread radio, and an Echo Dot 3 is not
> one either. You need a USB dongle (SkyConnect / ZBT-1) or an existing
> HomePod / Apple TV / Nest Hub. Matter-over-Wi-Fi works today regardless.

**HomeKit** — the *HomeKit Device* integration controls accessories directly
over your network. Check the Discovered section first; it usually finds them.

> A HomeKit accessory can only be paired to **one** controller at a time. If it
> is already in the Apple Home app, remove it there before HA can pair it.
> Matter accessories are exempt — they support multi-admin and can belong to
> Apple Home and HA simultaneously. If you want a device in both, prefer Matter.

**Alexa** — the *Alexa Devices* integration (core since HA 2025.6) logs in with
your Amazon account. It requires an authenticator app; SMS 2FA will not work.
Your Echo Dot and Echo Auto arrive as media players, announce/TTS targets,
sensors, and buttons that fire your existing Alexa routines. ControlHub Routines
can use those announce targets to speak to you.

> It brings in **Alexa hardware, not devices linked to Alexa** — Amazon's API
> doesn't expose third-party gadgets to other hubs as entities. See
> "Controlling a bulb that's connected to Alexa" below for what to do instead.

#### Controlling a bulb that's connected to Alexa

Three options, best first:

1. **Pair it to Home Assistant directly.** Nearly every smart bulb has its own
   HA integration — Hue, LIFX, Kasa, Tuya/Smart Life, Govee, Wiz, Sengled. Add
   that integration and the bulb becomes a real entity: proper on/off/brightness
   state, a card in Spaces, and usable in ControlHub Routines and Flow.
   **You are not moving the bulb** — it keeps working in Alexa at the same time.
   You're just adding a second controller. This is almost always the right answer.
2. **If the bulb is Matter**, commission it to HA over Matter. Multi-admin means
   Alexa and HA both keep control.
3. **Last resort — speak to it through an Echo.** If nothing but Alexa can reach
   the bulb, use the `alexa_devices.send_text_command` action:

   ```yaml
   action: alexa_devices.send_text_command
   target:
     entity_id: media_player.echo_dot
   data:
     text: "turn on the desk lamp"
   ```

   Alexa reacts as if you had spoken it. The catch: it is **one-way**. HA sends
   the command but never learns whether the bulb is on, so there's no real state
   to show. To get a toggle in ControlHub anyway, wrap two of these in a
   [template switch](https://www.home-assistant.io/integrations/switch.template/)
   with optimistic state — it will look right, but it's a guess, not a reading.

**Google Home** — there is no integration that imports Google Home devices as
entities. The *Google Assistant SDK* integration lets HA send text commands to
Google Assistant, which is the only free way to reach a Google-only device. It
needs a Google Cloud project and OAuth client, and it has the same one-way
limitation as Alexa's `send_text_command`, so skip it unless you own something
nothing else can control. Since you already have Echo hardware, Alexa's version
covers the same job with no cloud console at all.

> **Exception: Nest devices.** Google's own thermostats, cameras and doorbells
> have a dedicated [`nest`](https://www.home-assistant.io/integrations/nest/)
> integration that produces *real* entities — a climate entity with full
> control, camera streams, motion/person/doorbell triggers. It needs a Google
> Cloud project plus Device Access Console registration, which carries a
> **one-time US$5 fee**, and a consumer Google account (Workspace accounts are
> unsupported). Worth it for a Nest thermostat; irrelevant otherwise.

### Home Assistant inside ControlHub

**Spaces → Home Assistant** embeds the full HA UI in ControlHub's shell, with
shortcut buttons for Overview, Devices, Entities, Integrations, Automations,
Settings and Logs. Everything HA can do — including adding the integrations
above and running their pairing wizards — is reachable without leaving the hub.

This is an iframe on purpose rather than a reimplementation: HA's own settings
and integration wizards change every release, and framing them means new
integrations are configurable the day HA ships them.

It works because `use_x_frame_options: false` is set in the seed
`configuration.yaml`. Be clear-eyed about the tradeoff: that header is
anti-clickjacking, and framing happens in *your* browser — so with it off, any
website you visit could iframe your HA (at its `localhost`/Tailscale address)
and, since your browser carries your HA session, overlay hidden controls to
trick you into acting on your real home. Network topology does **not** prevent
this — your own browser does the framing. On a personal kiosk the practical risk
is modest but real. The proper hardening is to serve HA behind a reverse proxy
that sets `Content-Security-Policy: frame-ancestors <controlhub-origin>`, which
re-blocks every other origin while keeping the embed. If you don't want the
embedded panel, delete the line to restore the default protection.

Two things to expect:
- HA keeps **its own login**. Sign in once inside the panel; the session
  persists per-browser.
- If you reach ControlHub over **HTTPS** (Cloudflare Tunnel) while HA is plain
  HTTP, the browser blocks the frame as mixed content. The panel detects this
  and says so with a direct link. Tailscale (plain HTTP) has no such problem.

### Devices & scenes

- **Spaces → Devices** shows every entity HA reports, grouped by room: rich
  cards for lights, switches, thermostats, locks and media players, a toggle for
  anything else controllable, and a **Readings** grid for sensors and trackers.
  Nothing is filtered out except HA's own plumbing (`zone`, `tts`,
  `conversation`, …) — see `src/lib/haDomains.ts`.
- Add scenes under Settings → **Smart Home Scenes** (load from HA, name, add an
  emoji). They appear on Today's Quick Scenes and in the command palette.
- Live state arrives over WebSocket, falling back to REST polling if the socket
  can't be reached.

---

## 9. Apple Health → the Body surface

ControlHub ingests raw Apple Health data and turns it into readiness, sleep
debt, an energy curve, and AI insights — the **Body** surface.

### One-time setup

1. On your iPhone, install **Health Auto Export** (the "REST API" export needs
   the paid tier; manual/automated REST pushes are what we use).
2. In ControlHub, open the **Body** tab. Until data arrives it shows the
   ingestion endpoint and a **copyable bearer token** (generated on first view).
3. In Health Auto Export, create a **REST API** automation:
   - **URL**: `http://<pi-over-tailscale>:3000/api/health/ingest`
   - **Header**: `Authorization: Bearer <token from the Body tab>`
   - **Format**: JSON
   - Include sleep analysis, HRV, resting heart rate, steps, active energy,
     respiratory rate, and workouts.
4. Automate the push on a schedule (e.g. every morning) via an iOS Shortcut, or
   push manually. Ingestion is idempotent — re-pushing never duplicates.

### What you get

- **Readiness (0–100)** — weighted from HRV, resting HR, last night's sleep, and
  sleep debt, all relative to your own 30-day baselines (not population norms).
  ≥70 good, 40–69 moderate, <40 take it easy.
- **Sleep debt** — rolling 14-night deficit vs. your personal sleep need.
- **Energy forecast** — a circadian curve that Flow uses to place deep work.
- **Trends** — 14-night sleep, HRV, resting HR.

Baselines mature over ~30 days, so start pushing early. The daily
`health_insight` Cortex job (8:30am) reads this and posts a Signal.

---

## 10. Email Integration

### Outlook / Microsoft 365

1. [portal.azure.com](https://portal.azure.com) → **App registrations** → **New
   registration**. Name it "ControlHub", personal accounts (or multi-tenant).
2. Redirect URI: `https://hub.yourdomain.com/api/auth/outlook/callback`.
3. **Certificates & secrets** → new client secret → copy the value.
4. Copy the **Application (client) ID** from the overview.
5. **API permissions** → add `Mail.Read`, `Calendars.Read`, `offline_access`.
6. ControlHub → Settings → **Outlook**: enter Client ID, Secret, Redirect URI →
   **Save** → **Connect Outlook**.

### Gmail

1. [console.cloud.google.com](https://console.cloud.google.com) → new project →
   enable the **Gmail API**.
2. **Credentials** → **OAuth 2.0 Client ID** → Web application.
3. Redirect URI: `https://hub.yourdomain.com/api/auth/gmail/callback`.
4. Settings → **Gmail**: enter Client ID, Secret, Redirect URI → **Save** →
   **Connect Gmail**.

Email and calendar sync every 10 minutes; **Sync Now** triggers it manually.

---

## 11. Calendar Integration

### iCloud (CalDAV)

1. [appleid.apple.com](https://appleid.apple.com) → **App-Specific Passwords** →
   generate one named "ControlHub".
2. Settings → **iCloud Calendar**: Apple ID + app-specific password. Optionally
   set a Blackboard/LMS calendar name — events from it auto-create tasks.

### ICS subscriptions

Settings → **Calendar Subscriptions** → add any `.ics` URL with a label. Synced
every 10 minutes.

### Merged feed (export)

ControlHub publishes one merged ICS feed of all your events **plus your Flow
plan blocks** (shown as `▸ Task title`). Copy the **Subscribable merged feed**
URL from Settings into Apple/Google Calendar. The URL carries a secret token;
**Rotate token** if it leaks.

---

# Part III — Intelligence & automation

## 12. Cortex — the AI job engine

Cortex is the queue every AI feature runs on. Jobs run one at a time via the
Claude CLI, at low OS priority so the kiosk never stutters, with automatic
retries and crash recovery.

| Job | Default schedule | What it does |
|-----|------------------|--------------|
| `briefing` | 07:00 & 19:00 | 12-hour summary; flags priority tasks/emails |
| `plan_day` | 07:15 | Runs Flow, then explains the day (see §13) |
| `health_insight` | 08:30 | One insight from today's biometrics vs. baselines |
| `email_triage` | after sync, on demand | Tiers + summaries unread mail (see §14) |
| `weekly_review` | Sun 18:00 | Honest week review correlating tasks ↔ health |

Every job result becomes a **Signal** — a card in the feed at the top of Today's
rail (semantic glow: green on-track, amber attention, red urgent). Tap to
expand, ✕ to dismiss.

- **Disable all schedules:** `cortex_auto=off` in Settings.
- **Run manually:** `POST /api/cortex/jobs` with `{"type":"weekly_review"}`, or
  use the per-feature buttons in the UI.

## 13. Flow — the auto-scheduler

Flow time-blocks your day into the gaps between calendar events, deterministically:

- Ranks tasks by priority, due-date pressure, AI-priority flags, and (in
  `exam_mode`) academic type.
- Places **deep work in your energy peaks** and shallow work in the troughs,
  using the Body energy curve (falls back to neutral if no health data).
- Respects a working window (`flow_day_start`/`flow_day_end`, default
  08:00–22:00), finishes due-today tasks before their due time, and truncates
  rather than dropping a task that won't fully fit.

In Today's **mission timeline**, planned blocks render as dashed leather blocks
alongside real events. Use **⚡ Plan day** to replan on demand, and the **pin**
toggle (⌖/⏚) to lock a block so replans leave it alone. The 7:15 `plan_day` job
replans automatically and posts a Signal explaining the shape of the day.
Plan blocks also flow into the merged ICS feed (§11).

## 14. Streams — email triage

Background triage sorts unread mail into **urgent / needs reply / fyi / noise**,
each with a one-line AI summary. The Streams inbox groups by tier with glowing
headers; noise collapses behind a count.

- Triage auto-runs after sync once ≥3 untriaged unread accumulate (or one sits
  >2h), and posts a Signal with the urgent items, a **reply-debt digest** (mail
  awaiting your reply 3+ days), and any **mute-rule suggestions**.
- In an email's detail: **✦ Draft reply** opens the copilot pre-filled to draft
  in your voice; **↩ Open mail app** is a `mailto:` deep link.
- The older interactive **Triage inbox** batch flow is still available too.

## 15. Routines & notifications

Routines are cross-domain automations: **trigger → conditions → actions**, in
Spaces → **Routines**.

- **Triggers:** a time (with weekday filter), a health metric crossing a
  threshold, a calendar event starting soon, a task going overdue, or an HA
  entity state.
- **Conditions (ANDed):** time-of-day window (handles overnight), day-of-week,
  a health-metric gate.
- **Actions:** notify (push + Signal), activate an HA scene, call any HA
  service, create a task, replan the day, run a Cortex job, or change a setting.

Cooldowns and per-cause dedupe stop double-fires. **test** runs a routine's
actions immediately; **on/off** toggles it.

**Push notifications:** click **Enable notifications** in the Routines tab once
per device — it registers the service worker and a VAPID subscription (keys are
auto-generated and stored on the Pi). Requires HTTPS (§5) and the app icons
(§2). Four one-click **starter routines** are provided (wind-down on sleep debt,
leave-now before events, rest day on low readiness, weekday auto-plan).

## 16. Forge — AI self-modification

The Forge lets you ask ControlHub to change its own code — and is built around a
**human review gate**, not autonomy. It lives in **Library → Forge** and is
**off by default**.

How it works:
1. Enable it with the toggle, then describe a change ("add a caffeine tracker to
   the Body tab").
2. The Forge runs Claude in an **isolated git worktree on a throwaway branch** —
   your `main` is never touched — then commits the change and runs the tests.
3. You get a **review card**: the diff (syntax-tinted) and test status, with
   **Apply** or **Discard**.
4. **Apply merges the branch only.** It does *not* rebuild or restart the live
   app — you redeploy (§4) when you're ready. Failed tests block Apply unless you
   force it.

> The Forge needs the Claude CLI (§7) and a clean git working tree. Worktree
> tests share the repo's `node_modules` via symlink; if they can't run, the job
> still shows you the diff and marks tests as "didn't run".

---

# Part IV — Using ControlHub

## 17. The six surfaces

Navigation is organized around what you're doing, not data type. Bottom tab bar
on touch/phone (<1024px), labeled sidebar on laptop (≥1024px).

| Surface | What's there |
|---------|--------------|
| **Today** | Hero clock + greeting, the mission timeline (events, deadlines, Flow blocks, now-line), a rail of Signals/briefing/tasks/weather/mail/scenes, and more instruments below the fold |
| **Plan** | **Horizon** (Now/Next/Later board, default), **Backlog** (full task manager), **Calendar** (day/week/month), **Someday** |
| **Streams** | Unified Outlook + Gmail inbox with AI triage tiers |
| **Body** | Health instruments — readiness ring, sleep debt, energy curve, trends |
| **Spaces** | **Devices** (Home Assistant control) + **Routines** (automation builder) |
| **Library** | **Notes** (daily journal), **Grades** (GPA tracker), **Forge** (self-modification) |

**Tasks** keep their full feature set inside Plan → Backlog: projects, nested
subtasks, blockers/dependencies, time-blocking, snoozing, comments, templates,
linked emails/events, and GitHub repo links.

**Grades**: classes with credit hours, weighted categories, assignments, and
cumulative GPA. **Someday**: a maybe-list; promote items to tasks in one click.

## 18. Appearance & layout

Settings → **Appearance** (previews live, applies on every device at load):

- **Accent** — Leather, Forest, Amber, Slate, or Crimson.
- **Density** — compact / cozy / comfortable.
- **Glass blur** — full / reduced / **off**. Lower is faster; **`off` is the Pi
  performance lever**, dropping the GPU-expensive backdrop blur entirely.
- Sliders for ambient glow, font scale, and glass opacity.

Settings → **Dashboard Widgets** toggles which Today widgets show and reorders
them (up/down controls — reliable on a touch kiosk). The ambient background also
shifts automatically with the time of day (dawn/day/dusk/night).

## 19. Command palette & shortcuts

Press **⌘K / Ctrl-K** anywhere for the command palette: jump to any surface,
create a task with natural language (`lab report p2 friday 3pm #school`), or
**Ask Claude** (opens the copilot pre-filled).

The **copilot** slide-over is available on every surface (the chat button, or
`controlhub:open-copilot` triggers from features like Draft reply).

| Key | Action |
|-----|--------|
| `⌘K` / `Ctrl-K` | Command palette |
| `?` | Keyboard shortcuts overlay |

---

# Part V — Operations

## 20. Settings reference

Credentials and config live in the `Settings` table (key-value), **not** env
vars. The only env vars are `DATABASE_URL` and `AUTH_PASSWORD`.

| Key | Purpose |
|-----|---------|
| `ha_url`, `ha_token` | Home Assistant connection |
| `outlook_client_id`, `outlook_client_secret` | Outlook OAuth |
| `gmail_client_id`, `gmail_client_secret` | Gmail OAuth |
| `icloud_apple_id`, `icloud_app_password` | iCloud CalDAV |
| `github_user`, `github_token` | GitHub widget |
| `weather_lat`, `weather_lon`, `weather_label` | Weather location |
| `health_ingest_token` | Bearer token for `/api/health/ingest` (auto-generated) |
| `cortex_auto` | `off` disables all scheduled AI jobs |
| `flow_day_start`, `flow_day_end` | Flow planning window (default 08:00–22:00) |
| `exam_mode` | `on` boosts academic tasks in Flow |
| `forge_enabled` | `on` enables the Forge (default off) |
| `appearance` | JSON appearance settings (managed by the panel) |
| `dashboard_widgets`, `dashboard_order` | Today widget visibility + order |
| `vapid_public_key`, `vapid_private_key` | Web push keys (auto-generated) |

## 21. Backup & maintenance

All state is one SQLite file (`dev.db`). Back it up regularly:

```bash
# Manual
cp ~/controlhub/dev.db ~/controlhub-backup-$(date +%Y%m%d).db

# Daily cron at 3am
crontab -e
0 3 * * * cp /home/pi/controlhub/dev.db /home/pi/backups/controlhub-$(date +\%Y\%m\%d).db
```

Logs:
```bash
journalctl -u controlhub -f        # app + scheduler (sync, Cortex, routines)
journalctl -u cloudflared -f       # tunnel
docker compose -f deploy/homeassistant/docker-compose.yml logs -f   # HA
```

Migrations on every update: `npx prisma migrate deploy` (see §4).

## 22. Troubleshooting

**"Could not find a production build"** — run `npm run build` (and copy static
assets, §3).

**"DATABASE_URL is not set"** — ensure `.env.local` has
`DATABASE_URL="file:./dev.db"` and systemd's `EnvironmentFile` points to it.

**AI features do nothing / Signals never appear** — the Claude CLI isn't
available to the service user. Confirm `claude -p "hi"` works as that user from
`~/controlhub`, and that `cortex_auto` isn't `off`. Check `journalctl -u
controlhub` for `[cortex]` errors.

**Health data not showing** — verify the iPhone can reach the Pi
(`curl` the ingest URL over Tailscale), the Bearer token matches the Body tab,
and you're sending JSON. Baselines need ~30 days before readiness is meaningful.

**Push notifications don't arrive** — push needs HTTPS (§5) and the app icons
(§2). Re-run **Enable notifications**; on iOS, install to the home screen first.

**Forge can't apply / merge fails** — the git working tree must be clean before
applying. Resolve or stash local changes, then retry. A failed run cleans up its
worktree automatically; orphaned ones can be removed with
`git worktree remove --force .forge/<id>`.

**Home Assistant connection failed** — `curl http://localhost:8123/api/` from
the Pi; check the token; ensure no trailing slash in the Settings URL.

**OAuth callback errors** — the redirect URI in Azure/Google must match
ControlHub's Settings exactly (scheme, host, full path).

**Slow on the Pi** — set Appearance → Glass blur to **off**, use an SSD, and
prefer a Pi 5 with 4GB+. Heavy `next build` should run on your Mac/PC.
