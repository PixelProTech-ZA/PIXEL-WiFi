# PIXEL WiFi — Desktop Bridge

Optional. PIXEL WiFi works fully without this — it only unlocks real SSID and
signal-strength (RSSI) readings, which browsers never expose to any web page,
on purpose, for privacy reasons.

## What it is

A tiny local program (`bridge-server.js`) that:
- reads your real Wi-Fi info from the OS (`netsh` on Windows, `system_profiler`
  on macOS, `nmcli`/`iw` on Linux)
- serves it on `http://127.0.0.1:8973` — your machine only, nothing else can
  reach it, ever
- is read-only: two GET endpoints, no writes, no arbitrary command execution

PIXEL WiFi detects it automatically a couple of seconds after it's running.
Close the terminal / stop the process and PIXEL WiFi falls straight back to
"NOT EXPOSED" — nothing breaks either way.

## Requirements

[Node.js](https://nodejs.org) 14+. Nothing else — no npm install, no
dependencies, pure Node built-ins.

## Run it

```
node bridge-server.js
```

You should see:

```
PIXEL WiFi Desktop Bridge running at http://127.0.0.1:8973
Platform detected: <your OS>
Open PIXEL WiFi in your browser — it will detect this automatically.
```

Leave that terminal window open while you use PIXEL WiFi. Ctrl+C to stop.

## Run it automatically at login (optional)

- **Windows**: put a shortcut to `node bridge-server.js` (run from this
  folder) in `shell:startup`.
- **macOS**: add a Login Item pointing at a small `.command` script that
  `cd`s here and runs `node bridge-server.js`.
- **Linux**: add a `.desktop` autostart entry or a systemd `--user` service
  that runs `node /path/to/bridge-server.js`.

None of this is required — you can just run it manually whenever you want
real SSID/signal readings.

## Security notes

- Binds to `127.0.0.1` only — Node refuses to listen on your LAN/public
  interface with this config, regardless of firewall rules.
- CORS is restricted by default to `*.github.io` and `localhost` origins.
  If you deploy PIXEL WiFi under your own domain, edit
  `ALLOWED_ORIGIN_PATTERNS` near the top of `bridge-server.js`.
- The three OS commands it runs are fixed and hardcoded — no part of any
  request is ever passed into a shell command, so there's no injection
  surface.
- It never sends anything anywhere itself — it only answers requests from
  a page you already have open.

## Troubleshooting

- **"Port already in use"** — something else is already using 8973, or the
  bridge is already running in another window.
- **Pixel still shows "not connected"** — check the terminal for errors,
  and confirm your browser is actually pointed at an allowed origin (see
  CORS note above).
- **`available:false` from `/wifi-info`** — the OS command it depends on
  (`nmcli`, `netsh`, or `system_profiler`) isn't installed, isn't on PATH,
  or there's no active Wi-Fi connection to report on right now.
