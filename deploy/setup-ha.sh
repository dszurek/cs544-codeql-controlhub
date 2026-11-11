#!/usr/bin/env bash
# Sets up Home Assistant + the Matter controller on this machine
# (designed for the Raspberry Pi). Idempotent: safe to re-run after
# updates or reboots.
set -euo pipefail

cd "$(dirname "$0")/homeassistant"

# ── 1. Docker ────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "→ Docker not found — installing via get.docker.com…"
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "  Added $USER to the docker group (takes effect on next login)."
fi

sudo systemctl enable --now docker >/dev/null 2>&1 || true

# Use sudo for docker if the group membership isn't active in this shell yet
DOCKER="docker"
if ! docker info >/dev/null 2>&1; then
  DOCKER="sudo docker"
fi

if ! $DOCKER compose version >/dev/null 2>&1; then
  echo "✗ The docker compose plugin is missing. On Raspberry Pi OS:"
  echo "  sudo apt-get install -y docker-compose-plugin"
  exit 1
fi

# ── 2. Bluetooth (Matter commissioning + HomeKit BLE accessories) ────
# Both containers talk to the host's BlueZ daemon over D-Bus. If bluetooth
# isn't running, Matter pairing silently finds nothing — worth failing loudly.
if ! systemctl is-active --quiet bluetooth 2>/dev/null; then
  echo "→ Bluetooth service inactive — enabling…"
  sudo systemctl enable --now bluetooth || \
    echo "  ⚠ Couldn't start bluetooth. Matter BLE pairing won't work until it runs."
fi

# ── 3. Start the stack ───────────────────────────────────────────────
mkdir -p matter-data
echo "→ Pulling images (Home Assistant + Matter server)…"
$DOCKER compose pull
echo "→ Starting containers…"
$DOCKER compose up -d

wait_for() { # name url timeout_units(5s each)
  local name="$1" url="$2" tries="$3"
  echo "→ Waiting for $name…"
  for _ in $(seq 1 "$tries"); do
    if curl -fsS -o /dev/null "$url" 2>/dev/null; then
      echo "✓ $name is up"
      return 0
    fi
    sleep 5
  done
  return 1
}

if ! wait_for "Home Assistant (first boot can take a few minutes)" http://localhost:8123 90; then
  echo "✗ Home Assistant didn't respond within ~7 minutes."
  echo "  Check logs with: $DOCKER compose logs -f homeassistant"
  exit 1
fi

# The Matter server speaks WebSocket; a plain GET returns 426 Upgrade Required,
# which is still proof the port is live. curl treats that as an HTTP error, so
# check the status code rather than success.
echo "→ Waiting for the Matter server…"
matter_up=false
for _ in $(seq 1 24); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5580/ws 2>/dev/null || true)
  if [ -n "$code" ] && [ "$code" != "000" ]; then
    echo "✓ Matter server is listening on ws://localhost:5580/ws"
    matter_up=true
    break
  fi
  sleep 5
done
$matter_up || echo "  ⚠ Matter server not responding yet — check: $DOCKER compose logs -f matter-server"

# ── 4. Next steps (one-time, manual) ─────────────────────────────────
cat <<'EOF'

──────────────────────────────────────────────────────────────────────
Home Assistant and the Matter controller are running.

STEP 1 — Onboard HA
  Open http://<pi-address>:8123, create your account, set your location.

STEP 2 — Token for ControlHub
  Profile (bottom-left) → Security → Long-Lived Access Tokens
  → Create Token → name it "ControlHub" → copy it.
  Then in ControlHub → Settings → Home Assistant:
    HA URL: http://localhost:8123     Token: (paste)
  Save, then Test Connection. Spaces will fill with your devices.

STEP 3 — Add the ecosystems
  All of these live under Settings → Devices & Services → + Add Integration.

  MATTER  ("Matter (BETA)")
    Choose "use an external server" and enter:  ws://localhost:5580/ws
    Then + Add device to commission. Most Matter-over-Wi-Fi devices pair
    over Bluetooth first — the Pi's built-in radio handles that.
    ⚠ Matter-over-THREAD needs a Thread border router. The Pi 5 has no
      Thread radio, and an Echo Dot 3 is not one. You'd need a USB dongle
      (SkyConnect / ZBT-1) or a HomePod / Apple TV / Nest Hub.

  HOMEKIT  ("HomeKit Device")
    Usually auto-discovered — check the Discovered section first.
    ⚠ A HomeKit accessory can only be paired to ONE controller. If it is
      already in the Apple Home app you must remove it there first, or HA
      will not be able to pair it. (Matter accessories are exempt — they
      support multi-admin and can live in both at once.)

  ALEXA  ("Alexa Devices")
    Log in with your Amazon account. Requires app-based 2FA (an
    authenticator app) — SMS 2FA will not work.
    This brings in your Echo Dot and Echo Auto as media players, announce
    /TTS targets, sensors, and buttons for your Alexa routines.
    ⚠ It does NOT import third-party devices linked to Alexa as entities —
      Amazon's API doesn't expose them. Best fix: pair those to HA directly
      (Matter, HomeKit, or their own brand integration); they can stay in
      Alexa at the same time. Fallback for anything only Alexa can reach:
      the `alexa_devices.send_text_command` action speaks a command to an
      Echo as if you'd said it ("turn on the desk lamp"). One-way — HA
      issues the command but learns nothing about the device's state.

  GOOGLE HOME  ("Google Assistant SDK") — optional
    There is no integration that imports Google Home devices as entities.
    This one lets HA send spoken/text commands to Google Assistant, which
    is the only free way to reach a Google-only device. It needs a Google
    Cloud project + OAuth client, so skip it unless you own a device that
    nothing else can control.

STEP 4 — Optional: Apple Home in the other direction
  To publish HA's devices to Siri/Apple Home, uncomment the `homekit:`
  block in deploy/homeassistant/config/configuration.yaml and restart.

Updating:   ./deploy/setup-ha.sh    (pulls latest images + restarts)
Logs:       docker compose -f deploy/homeassistant/docker-compose.yml logs -f
──────────────────────────────────────────────────────────────────────
EOF
