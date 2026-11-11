#!/usr/bin/env python3
"""Render ControlHub's PWA / push-notification icons.

The mark is an instrument gauge — the same idea as Today's hero clock and the
readiness dial on Body: a graphite dial face, a track arc, a value arc running
the wordmark's beige -> leather -> forest gradient, and a needle.

Renders once at 2048px and downsamples, so both sizes stay identical in weight.
Content sits inside the maskable safe zone (centre 80%), so the same file works
for `purpose: "any maskable"`.

    python3 scripts/generate-icons.py     # writes public/icon-{192,512}.png

Requires Pillow + numpy (dev-machine only; the PNGs are committed).
"""

import numpy as np
from PIL import Image

S = 2048                      # master render size
OUT = {512: "public/icon-512.png", 192: "public/icon-192.png"}

# Heirloom Futurism palette — keep in sync with src/app/globals.css
BG_TOP, BG_BOT = (0x2A, 0x2F, 0x35), (0x14, 0x16, 0x1A)
TRACK = (0x3A, 0x40, 0x48)
BEIGE, LEATHER, FOREST = (0xEF, 0xE7, 0xDD), (0xC7, 0x9A, 0x6B), (0x5A, 0x82, 0x70)

CORNER = 0.23 * S             # squircle-ish corner radius
R = 0.30 * S                  # gauge radius
W = 0.055 * S                 # gauge stroke width
START, SWEEP = 150.0, 240.0   # lower-left, clockwise, 120 deg gap at the bottom
VALUE = 0.72                  # fraction of the sweep the value arc fills
AA = 1.2                      # edge softness, in master pixels

y, x = np.mgrid[0:S, 0:S].astype(np.float64)
px, py = x - S / 2 + 0.5, y - S / 2 + 0.5
rad = np.hypot(px, py)
# degrees from 3 o'clock, increasing clockwise (y points down)
ang = np.degrees(np.arctan2(py, px)) % 360.0


def cover(d):
    """Signed distance -> antialiased coverage in [0, 1]."""
    return np.clip(0.5 - d / AA, 0.0, 1.0)


def at(deg, r):
    t = np.radians(deg)
    return S / 2 + r * np.cos(t), S / 2 + r * np.sin(t)


def disc(cx, cy, r):
    return cover(np.hypot(px - (cx - S / 2), py - (cy - S / 2)) - r)


def capsule(ax, ay, bx, by, r):
    """Round-capped line segment."""
    apx, apy = px - (ax - S / 2), py - (ay - S / 2)
    abx, aby = bx - ax, by - ay
    h = np.clip((apx * abx + apy * aby) / (abx * abx + aby * aby), 0.0, 1.0)
    return cover(np.hypot(apx - abx * h, apy - aby * h) - r)


def arc(start, sweep):
    """Coverage + progress-along-arc for a round-capped arc."""
    band = cover(np.abs(rad - R) - W / 2)
    rel = (ang - start) % 360.0
    a = np.where(rel <= sweep, band, 0.0)
    for end in (0.0, sweep):
        a = np.maximum(a, disc(*at(start + end, R), W / 2))
    # Pixels in the start cap sit just *before* the arc, so their unsigned rel
    # has wrapped to ~360. Anything past the middle of the gap belongs to the
    # start of the ramp, not the end of it.
    t = np.where(rel > (sweep + 360.0) / 2, 0.0, np.clip(rel / sweep, 0.0, 1.0))
    return a, t


def ramp(t):
    """beige -> leather -> forest, matching the login wordmark."""
    t = t[..., None]
    lo = np.array(BEIGE) + (np.array(LEATHER) - np.array(BEIGE)) * (t / 0.5)
    hi = np.array(LEATHER) + (np.array(FOREST) - np.array(LEATHER)) * ((t - 0.5) / 0.5)
    return np.where(t < 0.5, lo, hi)


# --- dial face: vertical gradient inside a rounded square --------------------
g = (y / (S - 1))[..., None]
img = np.array(BG_TOP) + (np.array(BG_BOT) - np.array(BG_TOP)) * g

qx = np.abs(px) - (S / 2 - CORNER)
qy = np.abs(py) - (S / 2 - CORNER)
alpha = cover(
    np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
    + np.minimum(np.maximum(qx, qy), 0)
    - CORNER
)


def draw(a, color):
    global img
    img = img * (1 - a[..., None]) + color * a[..., None]


track, _ = arc(START, SWEEP)
draw(track, np.array(TRACK, dtype=float))

value, t = arc(START, SWEEP * VALUE)
draw(value, ramp(t))

tip = START + SWEEP * VALUE
draw(capsule(S / 2, S / 2, *at(tip, R - W * 0.9), 0.015 * S), np.array(BEIGE, dtype=float))
draw(disc(S / 2, S / 2, 0.048 * S), np.array(BEIGE, dtype=float))

master = Image.fromarray(
    np.dstack([img, alpha * 255]).round().clip(0, 255).astype(np.uint8), "RGBA"
)
for size, path in OUT.items():
    master.resize((size, size), Image.LANCZOS).save(path)
    print(f"wrote {path} ({size}x{size})")
