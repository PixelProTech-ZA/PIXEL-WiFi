#!/usr/bin/env node
/*
 * PIXEL WiFi — Desktop Bridge
 * ---------------------------
 * A small local-only HTTP server that reads real Wi-Fi info (SSID, signal,
 * channel, security) from the operating system and serves it to the
 * PIXEL WiFi PWA over 127.0.0.1. This exists because browsers deliberately
 * do not expose this information to web pages — see the "Why can't the PWA
 * just read this?" note at the bottom of this file.
 *
 * TRUTH-FIRST: this bridge never invents a value. If a platform command
 * fails or its output can't be parsed, it returns { available:false, reason }
 * and the PWA falls back to "NOT EXPOSED" exactly as it does without the
 * bridge running at all.
 *
 * SECURITY:
 *  - Binds to 127.0.0.1 ONLY. Never reachable from your local network or the
 *    internet, even if your firewall allows it — Node itself refuses the bind.
 *  - Only serves two read-only GET endpoints. No data is ever written,
 *    executed, or forwarded anywhere.
 *  - Only three fixed, hardcoded OS commands are ever run — nothing from the
 *    request is passed into a shell command, so there is no injection surface.
 *  - CORS is restricted to *.github.io and localhost by default. Edit
 *    ALLOWED_ORIGIN_PATTERNS below if you deploy PIXEL WiFi elsewhere.
 *
 * RUN IT:
 *   node bridge-server.js
 * Then open PIXEL WiFi in your browser — it detects the bridge automatically
 * within a couple of seconds and starts showing real SSID/signal values.
 */

const http = require('http');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PORT = 8973;
const HOST = '127.0.0.1';
const VERSION = '1.0.0';

// Who's allowed to query this bridge from a browser tab.
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.github\.io$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i
];

function isAllowedOrigin(origin){
  if (!origin) return true; // non-browser requests (curl, health checks) have no Origin header
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

/* ---------------- Platform readers ---------------- */

async function readWindows(){
  try{
    const { stdout } = await execAsync('netsh wlan show interfaces', { timeout: 5000 });
    if (!/State\s*:\s*connected/i.test(stdout)){
      return { available:false, reason:'No connected Wi-Fi interface reported by netsh.' };
    }
    const field = (name) => {
      const m = stdout.match(new RegExp(name + '\\s*:\\s*(.+)'));
      return m ? m[1].trim() : null;
    };
    const signalPct = field('Signal');
    const signalPercent = signalPct ? parseInt(signalPct.replace('%',''), 10) : null;
    return {
      available: true,
      ssid: field('SSID'),
      bssid: field('BSSID'),
      channel: field('Channel'),
      phyMode: field('Radio type'),
      security: field('Authentication'),
      signalPercent: Number.isFinite(signalPercent) ? signalPercent : null,
      signalDbm: null, // netsh does not report raw dBm, only a normalized percent
      txRateMbps: field('Transmit rate (Mbps)'),
      source: 'netsh wlan show interfaces'
    };
  } catch(e){
    return { available:false, reason:'netsh command failed or Wi-Fi adapter unavailable.' };
  }
}

async function readMac(){
  try{
    const { stdout } = await execAsync('system_profiler SPAirPortDataType', { timeout: 8000 });
    const section = stdout.split('Current Network Information:')[1];
    if (!section){
      return { available:false, reason:'No active Wi-Fi network reported by system_profiler.' };
    }
    const ssidMatch = section.match(/^\s*([^\n:][^:\n]*):\s*$/m);
    const ssid = ssidMatch ? ssidMatch[1].trim() : null;
    const field = (name) => {
      const m = section.match(new RegExp(name + '\\s*:\\s*(.+)'));
      return m ? m[1].trim() : null;
    };
    const sn = field('Signal / Noise');
    let signalDbm = null;
    if (sn){
      const m = sn.match(/(-?\d+)\s*dBm/);
      if (m) signalDbm = parseInt(m[1], 10);
    }
    return {
      available: true,
      ssid,
      bssid: null, // macOS no longer exposes BSSID via system_profiler
      channel: field('Channel'),
      phyMode: field('PHY Mode'),
      security: field('Security'),
      signalPercent: null,
      signalDbm,
      txRateMbps: field('Transmit Rate'),
      source: 'system_profiler SPAirPortDataType'
    };
  } catch(e){
    return { available:false, reason:'system_profiler command failed or Wi-Fi unavailable.' };
  }
}

async function readLinux(){
  try{
    const { stdout } = await execAsync("nmcli -t -f active,ssid,signal,chan,security dev wifi", { timeout: 5000 });
    const line = stdout.split('\n').find((l) => l.startsWith('yes:'));
    if (!line){
      return { available:false, reason:'No active Wi-Fi connection reported by nmcli.' };
    }
    const parts = line.split(':');
    const ssid = parts[1] || null;
    const signalPercent = parts[2] ? parseInt(parts[2], 10) : null;
    const channel = parts[3] || null;
    const security = parts.slice(4).join(':') || null;

    // nmcli doesn't give raw dBm — try `iw dev <iface> link` for that, best-effort only.
    let signalDbm = null;
    try{
      const { stdout: ifaceOut } = await execAsync("nmcli -t -f DEVICE,TYPE dev status", { timeout: 3000 });
      const ifaceLine = ifaceOut.split('\n').find((l) => l.endsWith(':wifi'));
      const iface = ifaceLine ? ifaceLine.split(':')[0] : null;
      if (iface){
        const { stdout: linkOut } = await execAsync(`iw dev ${iface} link`, { timeout: 3000 });
        const m = linkOut.match(/signal:\s*(-?\d+)\s*dBm/);
        if (m) signalDbm = parseInt(m[1], 10);
      }
    } catch(_e){ /* iw not installed or not permitted — signalPercent from nmcli still stands */ }

    return {
      available: true,
      ssid,
      bssid: null,
      channel,
      phyMode: null,
      security,
      signalPercent: Number.isFinite(signalPercent) ? signalPercent : null,
      signalDbm,
      txRateMbps: null,
      source: 'nmcli'
    };
  } catch(e){
    return { available:false, reason:'nmcli command failed, not installed, or no Wi-Fi connection active.' };
  }
}

async function readWifiInfo(){
  const platform = os.platform();
  if (platform === 'win32') return await readWindows();
  if (platform === 'darwin') return await readMac();
  if (platform === 'linux') return await readLinux();
  return { available:false, reason:`Platform "${platform}" is not supported by this bridge.` };
}

/* ---------------- HTTP server ---------------- */

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);

  if (allowed && origin){
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  if (!allowed){
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'origin not allowed' }));
    return;
  }

  if (req.url === '/health'){
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, version: VERSION, platform: os.platform() }));
    return;
  }

  if (req.url === '/wifi-info'){
    const info = await readWifiInfo();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found', endpoints: ['/health', '/wifi-info'] }));
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE'){
    console.error(`Port ${PORT} is already in use. Is the bridge already running? If not, close whatever else is using it.`);
  } else {
    console.error('Bridge server error:', e.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`PIXEL WiFi Desktop Bridge running at http://${HOST}:${PORT}`);
  console.log(`Platform detected: ${os.platform()}`);
  console.log('Open PIXEL WiFi in your browser — it will detect this automatically.');
  console.log('Press Ctrl+C to stop.');
});

/*
 * Why can't the PWA just read this itself?
 * Browsers intentionally withhold SSID/BSSID/RSSI from web pages because a
 * page that could read your SSID could roughly geolocate you via public
 * wardriving databases (e.g. WiGLE) without ever requesting location
 * permission. That sandboxing is correct and this bridge doesn't try to
 * defeat it — it just gives *you*, running a program *you* started on *your
 * own machine*, a deliberate, visible way to hand that data to a page you
 * chose to open. Nothing here runs unless you start it.
 */
