# ControlHub — Design Spec

**Date:** 2026-04-14  
**Status:** Approved

---

## Overview

ControlHub is a personal productivity hub web app designed for daily use. It merges email, calendars, tasks, and smart home control into a single responsive interface. The primary display is a 7–10" touch screen connected to a Raspberry Pi 5 (4GB) running Chromium in kiosk mode. The same app is accessible from a phone and laptop via Tailscale.

**Developed on:** macOS  
**Deployed to:** Raspberry Pi 5 (4GB, ARM64, Linux) — deployment handled separately after development

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 15 (App Router) |
| Database | SQLite via Prisma |
| Scheduler | node-schedule (runs inside Next.js server process) |
| Smart home | Home Assistant (Docker on Pi) via REST + WebSocket |
| Remote access | Tailscale |
| Kiosk | Chromium in kiosk mode, autostart on Pi boot |
| Weather | Open-Meteo (no API key, called client-side) |
| Fonts | Inter (body), Playfair Display (headings) |

---

## Integrations

| Service | Protocol | Auth | Data |
|---|---|---|---|
| Outlook Mail + Calendar | Microsoft Graph API | OAuth 2.0 + refresh token | Email inbox, calendar events |
| Gmail | Google API | OAuth 2.0 + refresh token | Email inbox |
| iCloud Calendar | CalDAV | Apple app-specific password | Calendar events + Blackboard assignments |
| Home Assistant | REST + WebSocket | HA long-lived token | Device state, scenes, automations |
| Open-Meteo | HTTP | None | Weather (current + hourly) |

Blackboard assignments are accessed via the iCloud CalDAV integration — the user has already imported their Blackboard calendar into Apple Calendar, so no direct Blackboard integration is needed.

---

## Architecture

One Next.js process runs on the Pi (via pm2 in production). API routes serve as the backend. A scheduler runs inside the server process and refreshes external data on intervals, writing normalized results into SQLite. The UI always reads from SQLite — no external API calls at render time (except weather and HA live state).

```
┌─────────────────────────────────────────────────────┐
│                    Next.js Server                   │
│                                                     │
│  App Router (React)    API Routes (/api/*)          │
│         │                    │                      │
│         └──────────┬─────────┘                      │
│                    │                                │
│              SQLite (Prisma)                        │
│                    │                                │
│            node-schedule jobs                       │
│          (email, calendar, tasks)                   │
└─────────────────────────────────────────────────────┘
         │                          │
   External APIs              Home Assistant
   (Graph, Gmail,            REST + WebSocket
    iCloud CalDAV,           (real-time state)
    Open-Meteo)
```

**Sync intervals (configurable in Settings):**
- Email (Outlook + Gmail): every 10 min
- Calendar (all sources): every 10 min
- Blackboard task import: every 30 min

**Pi boot sequence (production):**
1. Docker starts Home Assistant on port 8123
2. pm2 resurrects Next.js on port 3000
3. Chromium autostart opens `localhost:3000` in kiosk mode

**Remote access:** Tailscale mesh network — no open ports, no port forwarding required.

---

## Visual Design

**Theme:** Dark glassmorphism with earthy palette matching the user's portfolio.

```css
--dark:           #050505
--dark2:          #0a0a0a
--leather:        #8b5a3c
--leather-light:  #a67c52
--forest:         #2d4a3e
--forest-light:   #3d5a4e
--beige:          #d4c5b9
--beige-light:    #e8dfd5
```

Cards use frosted glass: `background: rgba(13,13,13,0.45)` with `backdrop-filter: blur(20px)` and a beige border at low opacity. Background has subtle radial gradients in forest green and leather brown. Leather brown is used for labels, active states, and accent tags. Forest green for device "on" states.

**Navigation:**
- **Touch / phone (< 1024px):** Bottom tab bar with SVG line icons, small uppercase labels, leather-brown active indicator dot
- **Laptop / desktop (≥ 1024px):** Full labeled sidebar (expanded, always visible)

Both navs contain the same 5 sections: Home, Tasks, Calendar, Mail, Spaces.

---

## Pages

### Home (Dashboard)

Always-on kiosk view. Shows at a glance:
- Current weather (temperature, condition, location) via Open-Meteo
- Hourly weather strip
- Today's events merged from all calendars, color-coded by source
- Due-today tasks with priority indicator
- Unread email badges (Outlook + Gmail separately)
- Smart home quick presets (user-configured scenes: "Morning", "Night", "Away")
- Clock (prominent, top of screen)

### Tasks

Todoist-quality task management.

**Task fields:** title, notes, type, priority (P1–P4), due date + time, recurrence, project, subtasks, source

**Task types:** Assignment, Meeting/Event, Shopping, General

**Views:**
- Today — tasks due today
- Upcoming — next 7 days
- All Tasks — everything
- By Project — grouped by project/category

**Sorting:** due date, priority, creation date, alphabetical (asc/desc)

**Filtering:** by type, priority, completion status, date range, overdue-only

**Grouping:** by project, priority, or due date within any view

**Interactions:**
- Floating `+` button → bottom sheet with full field entry and natural language date parsing via `chrono-node` ("due friday", "tomorrow at 3pm")
- Swipe-to-complete on touch, checkbox click on desktop
- Long press (touch) or right-click (desktop) → context menu for bulk actions
- Bulk: mark complete, change priority, move to project, delete

**Auto-import:** Background job syncs iCloud CalDAV every 30 min. Events from the Blackboard-imported calendar are created as `type: assignment` tasks with due dates pre-filled. Deduped by `external_id`.

### Calendar

Full calendar with month / week / day views, switchable via segmented control.

- All four calendar sources merged and color-coded by source
- Tap an event to see full details (title, time, location, calendar source)
- Day view shows a vertical timeline
- Read-only sync (no write-back to providers in v1)
- Manual event creation stored locally only

### Mail

Unified inbox from Outlook + Gmail, sorted by received date.

- Unread badge count per account
- Tap to read full message
- Mark read/unread
- Filter by account (All / Outlook / Gmail)
- Read-only in v1 (no compose, no reply)

### Spaces (Smart Home)

Home Assistant device control.

- Room-based layout of devices
- Toggle lights on/off, adjust brightness
- Thermostat control (set temperature, mode)
- Lock/unlock doors
- Trigger HA scenes/automations
- Preset scenes at top of page (user-configured from Settings)
- Real-time state via HA WebSocket — no stale data

### Settings

- OAuth setup for Outlook and Gmail (guided flow)
- iCloud app-specific password entry
- Home Assistant URL + long-lived token
- Sync interval configuration
- Display preferences (brightness schedule, kiosk timeout)
- Sync status / last synced timestamps per integration
- Manual "Sync Now" buttons per integration

---

## Data Model (SQLite via Prisma)

### `tasks`
```
id, title, notes, type, priority (1-4), status (pending|completed|cancelled),
due_date, due_time, recurrence, project_id, parent_task_id,
source (manual|blackboard_sync), external_id, created_at, completed_at
```

### `projects`
```
id, name, color, icon, sort_order
```

### `calendar_events` (cached, read-only)
```
id, title, start_at, end_at, all_day, location,
source (outlook|gmail|icloud), source_id, calendar_name, color, raw_data
```

### `emails` (cached, read-only)
```
id, subject, sender_name, sender_email, preview, is_read,
received_at, source (outlook|gmail), source_id
```

### `home_assistant_scenes`
```
id, ha_entity_id, name, icon, sort_order
```

### `settings`
```
key, value  (flat key-value store for credentials and preferences)
```

### `sync_log`
```
id, source, synced_at, status, error
```

---

## Integration Modules (`/src/lib/integrations/`)

Each module exports a `sync()` function called by the scheduler.

- **`outlook.ts`** — Microsoft Graph API. OAuth 2.0 with refresh tokens in `settings`. Fetches mail + calendar. Auto-refreshes tokens.
- **`gmail.ts`** — Google OAuth 2.0. Same pattern. Read-only inbox.
- **`icloud.ts`** — CalDAV with Apple app-specific password. Fetches all calendars. Identifies Blackboard events by calendar name. Writes assignments to `tasks` table.
- **`homeassistant.ts`** — REST for device listing and scene triggering. WebSocket for real-time state subscriptions.

Weather is called client-side from the weather widget component — no backend integration needed.

---

## Responsive Breakpoints

| Breakpoint | Nav | Layout |
|---|---|---|
| < 640px (phone) | Bottom tab bar | Single column, stacked widgets |
| 640–1023px (touch panel, portrait or landscape) | Bottom tab bar | 2-column grid |
| ≥ 1024px (laptop/desktop) | Full labeled sidebar | Multi-column dashboard |

Touch targets minimum 44×44px across all breakpoints.

---

## Out of Scope (v1)

- Email compose / reply
- Write-back to external calendars
- Push notifications
- Multi-user support
- Direct Blackboard API integration (CalDAV import covers this)
- Pi-specific deployment configuration (handled post-development)
