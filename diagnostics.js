/* PIXEL WiFi — Diagnostics Engine
   TRUTH-FIRST RULE: this file must never invent a measurement. Every function either
   returns a value obtained from a real browser API / real network request, or returns
   { available:false, reason:'...' } which the UI renders as "NOT EXPOSED BY THIS PLATFORM". */

const PIXEL_PROBE_ENDPOINTS = [
  'https://www.gstatic.com/generate_204',
  'https://www.cloudflare.com/cdn-cgi/trace',
  'https://www.microsoft.com/favicon.ico'
];
const PIXEL_IP_ENDPOINT = 'https://api.ipify.org?format=json';

const PixelDiag = (function(){

  /* ---------- Capability detection ---------- */
  function detectCapabilities(){
    const nav = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
    return {
      onlineState: { available: typeof nav.onLine === 'boolean', note: 'navigator.onLine' },
      connectionApi: { available: !!conn, note: conn ? 'Network Information API' : 'not supported by this browser' },
      effectiveType: { available: !!(conn && conn.effectiveType), note: 'connection.effectiveType' },
      downlinkEstimate: { available: !!(conn && typeof conn.downlink === 'number'), note: 'connection.downlink' },
      rttEstimate: { available: !!(conn && typeof conn.rtt === 'number'), note: 'connection.rtt' },
      transportType: { available: !!(conn && conn.type), note: conn && conn.type ? 'connection.type' : 'most browsers withhold this for privacy' },
      saveData: { available: !!(conn && typeof conn.saveData === 'boolean'), note: 'connection.saveData' },
      resourceTiming: { available: typeof performance !== 'undefined' && !!performance.getEntriesByType, note: 'Resource Timing API' },
      serviceWorker: { available: 'serviceWorker' in navigator, note: 'installability / offline caching' },
      indexedDB: { available: 'indexedDB' in window, note: 'local history storage' },
      rssiScan: { available: false, note: 'no browser exposes raw signal strength' },
      channelScan: { available: false, note: 'no browser exposes Wi-Fi channel/BSSID' },
      gatewayPing: { available: false, note: 'browsers cannot send ICMP or address the LAN gateway directly' },
      macAddress: { available: false, note: 'never exposed to web pages, by design' }
    };
  }

  /* ---------- Basic connection state ---------- */
  function getConnectionInfo(){
    const nav = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
    const online = typeof nav.onLine === 'boolean' ? nav.onLine : null;
    let transport = 'UNKNOWN';
    let transportCertain = false;
    if (online === false){
      transport = 'OFFLINE';
      transportCertain = true;
    } else if (conn && conn.type && conn.type !== 'unknown'){
      const map = { wifi:'WI-FI', cellular:'MOBILE DATA', ethernet:'ETHERNET', bluetooth:'BLUETOOTH', wimax:'WIMAX', none:'OFFLINE', other:'OTHER' };
      transport = map[conn.type] || conn.type.toUpperCase();
      transportCertain = true;
    }
    return {
      online,
      transport,
      transportCertain,
      effectiveType: conn && conn.effectiveType ? conn.effectiveType : null,
      downlink: conn && typeof conn.downlink === 'number' ? conn.downlink : null,
      rttHint: conn && typeof conn.rtt === 'number' ? conn.rtt : null,
      saveData: conn && typeof conn.saveData === 'boolean' ? conn.saveData : null
    };
  }

  function watchConnectionChanges(cb){
    window.addEventListener('online', () => cb(getConnectionInfo(), 'online'));
    window.addEventListener('offline', () => cb(getConnectionInfo(), 'offline'));
    const nav = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
    if (conn && conn.addEventListener){
      conn.addEventListener('change', () => cb(getConnectionInfo(), 'change'));
    }
  }

  /* ---------- Timed request primitive ---------- */
  async function timedRequest(url, timeoutMs){
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || 6000);
    const t0 = performance.now();
    try{
      await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
      const t1 = performance.now();
      clearTimeout(timer);
      return { ok: true, ms: Math.round(t1 - t0) };
    } catch(e){
      clearTimeout(timer);
      const t1 = performance.now();
      return { ok: false, ms: Math.round(t1 - t0), error: e.name === 'AbortError' ? 'timeout' : 'network_error' };
    }
  }

  /* ---------- Resource-timing-backed request (for DNS breakdown where exposed) ---------- */
  async function timedRequestWithBreakdown(url, timeoutMs){
    const bustUrl = url + (url.includes('?') ? '&' : '?') + '_px=' + Date.now() + Math.random().toString(36).slice(2);
    const res = await timedRequest(bustUrl, timeoutMs);
    let dnsMs = null, dnsExposed = false;
    try{
      const entries = performance.getEntriesByName(bustUrl);
      if (entries && entries.length){
        const e = entries[entries.length - 1];
        if (e.domainLookupEnd > 0 && e.domainLookupStart >= 0 && (e.domainLookupEnd - e.domainLookupStart) > 0){
          dnsMs = Math.round(e.domainLookupEnd - e.domainLookupStart);
          dnsExposed = true;
        }
      }
    } catch(_e){ /* resource timing may be pruned or unavailable; fall through */ }
    return { ...res, dnsMs, dnsExposed };
  }

  /* ---------- Latency / jitter / loss over N samples ---------- */
  async function runLatencySamples(count, endpoint){
    const url = endpoint || PIXEL_PROBE_ENDPOINTS[0];
    const samples = [];
    for (let i = 0; i < count; i++){
      const r = await timedRequest(url, 5000);
      samples.push(r);
      await new Promise(res => setTimeout(res, 120));
    }
    const okSamples = samples.filter(s => s.ok).map(s => s.ms);
    const lossCount = samples.filter(s => !s.ok).length;
    const lossPct = Math.round((lossCount / samples.length) * 100);
    let avg = null, jitter = null;
    if (okSamples.length){
      avg = Math.round(okSamples.reduce((a,b)=>a+b,0) / okSamples.length);
      if (okSamples.length > 1){
        const diffs = [];
        for (let i = 1; i < okSamples.length; i++) diffs.push(Math.abs(okSamples[i] - okSamples[i-1]));
        jitter = Math.round(diffs.reduce((a,b)=>a+b,0) / diffs.length);
      } else {
        jitter = 0;
      }
    }
    return { samples, avg, jitter, lossPct, sampleCount: samples.length };
  }

  /* ---------- DNS-ish timing ---------- */
  async function runDnsCheck(){
    const results = [];
    for (const url of PIXEL_PROBE_ENDPOINTS.slice(0,2)){
      const r = await timedRequestWithBreakdown(url, 5000);
      results.push({ url, ...r });
    }
    const anyExposed = results.some(r => r.dnsExposed);
    return { results, anyExposed };
  }

  /* ---------- Internet reachability ---------- */
  async function checkInternetReachable(){
    const r = await timedRequest(PIXEL_PROBE_ENDPOINTS[0], 5000);
    return r;
  }

  /* ---------- Public IP (opt-in, explicit call only) ---------- */
  async function getPublicIp(){
    try{
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(PIXEL_IP_ENDPOINT, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (!res.ok) return { available: false, reason: 'lookup service returned an error' };
      const data = await res.json();
      const family = data.ip && data.ip.includes(':') ? 'IPv6' : 'IPv4';
      return { available: true, ip: data.ip, family };
    } catch(e){
      return { available: false, reason: 'lookup request failed or timed out' };
    }
  }

  /* ---------- Full "Find The Problem" sequence ---------- */
  async function runFullAssessment(onProgress){
    const steps = [];
    function report(step){ steps.push(step); if (onProgress) onProgress(step, steps.length); }

    // 1. Interface / online state
    const connInfo = getConnectionInfo();
    report({ id:'interface', label:'Interface', status: connInfo.online === false ? 'failed' : (connInfo.online === true ? 'good' : 'unknown'),
      detail: connInfo.online === null ? 'Browser did not report an online state.' : (connInfo.online ? 'Device reports an active network interface.' : 'Device reports no network connection.') });

    if (connInfo.online === false){
      report({ id:'connection', label:'Connection', status:'failed', detail:'Device is offline — remaining tests skipped.' });
      return { steps, connInfo, aborted:true };
    }

    // 2. Transport
    report({ id:'transport', label:'Active Transport', status: connInfo.transportCertain ? 'good' : 'unknown',
      detail: connInfo.transportCertain ? `Detected as ${connInfo.transport}.` : 'This browser does not expose which transport (Wi-Fi vs mobile data) is active.' });

    // 3. Local network / gateway — honestly not testable
    report({ id:'gateway', label:'Local Gateway', status:'not_testable',
      detail:'Browsers cannot address your router/gateway directly or send ICMP pings. Local-network health is inferred indirectly from whether internet tests below succeed at all.' });

    // 4. DNS
    const dns = await runDnsCheck();
    const dnsOkAny = dns.results.some(r => r.ok);
    const dnsAvgMs = dns.results.filter(r=>r.ok).length ? Math.round(dns.results.filter(r=>r.ok).reduce((a,r)=>a+r.ms,0) / dns.results.filter(r=>r.ok).length) : null;
    report({ id:'dns', label:'DNS', status: !dnsOkAny ? 'failed' : 'good',
      detail: dnsOkAny ? `Lookups completed. ${dns.anyExposed ? 'Isolated DNS timing was available for at least one request.' : 'Isolated DNS timing was not exposed for these endpoints — timing reflects the full request instead.'}` : 'Name-resolution-dependent requests failed.',
      value: dnsAvgMs });

    // 5. Internet reachability
    const reach = await checkInternetReachable();
    report({ id:'internet', label:'Internet Reachability', status: reach.ok ? 'good' : 'failed',
      detail: reach.ok ? `Reached a public endpoint in ${reach.ms} ms.` : 'Could not reach a public endpoint before timing out.' });

    // 6. Latency / jitter / loss
    const lat = await runLatencySamples(6);
    let latStatus = 'unknown';
    if (lat.avg !== null){
      latStatus = lat.avg < 60 ? 'good' : (lat.avg < 150 ? 'good' : (lat.avg < 300 ? 'slow' : 'failed'));
    }
    report({ id:'latency', label:'Latency', status: latStatus, detail: lat.avg !== null ? `Average ${lat.avg} ms across ${lat.sampleCount} samples.` : 'No samples succeeded.', value: lat.avg });
    report({ id:'jitter', label:'Jitter', status: lat.jitter === null ? 'unknown' : (lat.jitter < 20 ? 'good' : (lat.jitter < 60 ? 'slow' : 'failed')),
      detail: lat.jitter !== null ? `Average variation between samples: ${lat.jitter} ms.` : 'Not enough successful samples to compute jitter.', value: lat.jitter });
    report({ id:'loss', label:'Packet Loss (approx.)', status: lat.lossPct === 0 ? 'good' : (lat.lossPct <= 5 ? 'slow' : 'failed'),
      detail: `${lat.lossPct}% of ${lat.sampleCount} timed HTTP requests failed or timed out. This approximates loss — it is not a true ICMP ping test, which browsers cannot perform.`, value: lat.lossPct });

    return { steps, connInfo, dns, reach, lat, aborted:false };
  }

  return {
    detectCapabilities,
    getConnectionInfo,
    watchConnectionChanges,
    timedRequest,
    runLatencySamples,
    runDnsCheck,
    checkInternetReachable,
    getPublicIp,
    runFullAssessment,
    PROBE_ENDPOINTS: PIXEL_PROBE_ENDPOINTS
  };
})();
