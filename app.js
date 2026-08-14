/* PIXEL WiFi — App Controller */
(function(){

const STORE_HISTORY = 'pixel_history_v1';
const STORE_EVENTS = 'pixel_events_v1';
const MAX_HISTORY = 720;   // ~ enough for a rolling day at typical sample rates
const MAX_EVENTS = 300;

const state = {
  caps: null,
  connInfo: null,
  lastAssessment: null,
  liveValues: { latency:null, jitter:null, loss:null, dns:null, ipFamily:null, ssid:null, rssi:null },
  mode: localStorage.getItem('pixel_mode') || 'live', // live | low | manual
  liveTimer: null,
  history: loadJSON(STORE_HISTORY, []),
  events: loadJSON(STORE_EVENTS, []),
  deferredInstallPrompt: null
};

function loadJSON(key, fallback){
  try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(_e){ return fallback; }
}
function saveJSON(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); } catch(_e){ /* storage full or unavailable — fail silently, non-critical */ }
}

/* ---------------- Toast ---------------- */
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ---------------- Event log ---------------- */
function logEvent(text, level){
  const entry = { t: Date.now(), text, level: level || 'info' };
  state.events.push(entry);
  if (state.events.length > MAX_EVENTS) state.events = state.events.slice(-MAX_EVENTS);
  saveJSON(STORE_EVENTS, state.events);
  renderTimelineIfVisible();
}
function pushHistory(sample){
  state.history.push({ t: Date.now(), ...sample });
  if (state.history.length > MAX_HISTORY) state.history = state.history.slice(-MAX_HISTORY);
  saveJSON(STORE_HISTORY, state.history);
}

/* ---------------- Time formatting ---------------- */
function fmtTime(ts){
  const d = new Date(ts);
  return d.toTimeString().slice(0,8);
}

/* ---------------- Status dot helper ---------------- */
function statusClass(status){
  if (status === 'good') return 'ok';
  if (status === 'slow' || status === 'warn') return 'warn';
  if (status === 'failed' || status === 'bad') return 'bad';
  return 'unk';
}
function statusLabel(status){
  const map = { good:'GOOD', slow:'SLOW', warn:'DEGRADED', failed:'FAILED', bad:'FAILED', unknown:'UNKNOWN', not_testable:'NOT TESTABLE', na:'N/A' };
  return map[status] || status.toUpperCase();
}

/* ---------------- Topbar transport chip ---------------- */
function updateTransportChip(){
  const info = PixelDiag.getConnectionInfo();
  state.connInfo = info;
  const chip = document.getElementById('transport-chip');
  const dot = chip.querySelector('.dot');
  const text = chip.querySelector('.chip-text');
  let cls = 'unk';
  if (info.online === false) cls = 'bad';
  else if (info.transportCertain) cls = 'ok';
  dot.className = 'dot ' + cls;
  text.textContent = info.online === false ? 'OFFLINE' : info.transport;
  document.getElementById('offline-banner').classList.toggle('show', info.online === false);
}

/* ---------------- Modal ---------------- */
function openModal(html){
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal"><button class="close-x" aria-label="Close">✕</button>${html}</div>`;
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('.close-x').addEventListener('click', close);
  function close(){ backdrop.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e){ if (e.key === 'Escape') close(); }
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  return close;
}

function explainModal(metricId, valueObj){
  const ex = PixelExplain.explain(metricId, valueObj || {});
  const causes = (ex.causes || []).map(c => `<li>${c}</li>`).join('');
  openModal(`
    <div class="explain-block">
      <h1 class="page-title" style="font-size:18px;margin-bottom:14px;">${ex.title}</h1>
      <h4>What This Means</h4><p>${ex.what}</p>
      <h4>Why It Matters</h4><p>${ex.why}</p>
      <h4>Possible Causes</h4><ul>${causes || '<li>None listed</li>'}</ul>
      <h4>What To Do Next</h4><p>${ex.next}</p>
    </div>
  `);
}

/* ---------------- Nav / routing ---------------- */
const STATIC_NAV = [
  { group:'Overview', items:[
    { id:'home', label:'Home', ic:'◆' },
    { id:'xray', label:'Network X-Ray', ic:'✕' },
    { id:'find-problem', label:'Find The Problem', ic:'▶' },
    { id:'history', label:'History', ic:'▤' }
  ]},
  { group:'Learn', items:[
    { id:'troubleshoot', label:'Why Is My Wi-Fi Bad?', ic:'?' }
  ]},
  { group:'System', items:[
    { id:'capabilities', label:'Capability Detection', ic:'⚙' },
    { id:'report', label:'Network Report', ic:'▦' },
    { id:'privacy', label:'Privacy', ic:'●' }
  ]}
];

function buildNav(){
  const nav = document.getElementById('nav');
  let html = '';
  STATIC_NAV.forEach(g => {
    if (g.group === 'Learn'){
      // insert labs after this group's own items
    }
    html += `<div class="nav-group-label">${g.group}</div>`;
    g.items.forEach(it => {
      html += `<button data-route="${it.id}"><span class="ic">${it.ic}</span>${it.label}</button>`;
    });
    if (g.group === 'Overview'){
      html += `<div class="nav-group-label">Wi-Fi Lab</div>`;
      PIXEL_LABS.forEach(lab => {
        html += `<button data-route="lab/${lab.id}"><span class="ic">${lab.icon}</span>${lab.name}</button>`;
      });
    }
  });
  nav.innerHTML = html;
  nav.querySelectorAll('button[data-route]').forEach(btn => {
    btn.addEventListener('click', () => { location.hash = '#' + btn.dataset.route; document.getElementById('nav').classList.remove('open'); });
  });
}

function setActiveNav(route){
  document.querySelectorAll('#nav button[data-route]').forEach(b => {
    b.classList.toggle('active', route === b.dataset.route || route.startsWith(b.dataset.route + '/'));
  });
}

/* ---------------- Screens ---------------- */
function screenHome(){
  const info = PixelDiag.getConnectionInfo();
  const v = state.liveValues;
  const cards = [
    { id:'transport', label:'Active Transport', value: info.online === false ? 'OFFLINE' : info.transport, status: info.online === false ? 'failed' : (info.transportCertain ? 'good' : 'unknown') },
    { id:'effectiveType', label:'Effective Type', value: info.effectiveType ? info.effectiveType.toUpperCase() : 'NOT EXPOSED', status: info.effectiveType ? 'good' : 'unknown' },
    { id:'latency', label:'Latency', value: v.latency !== null ? v.latency + ' ms' : '—', status: v.latency === null ? 'unknown' : (v.latency < 150 ? 'good' : (v.latency < 300 ? 'slow' : 'failed')) },
    { id:'jitter', label:'Jitter', value: v.jitter !== null ? v.jitter + ' ms' : '—', status: v.jitter === null ? 'unknown' : (v.jitter < 20 ? 'good' : (v.jitter < 60 ? 'slow' : 'failed')) },
    { id:'loss', label:'Packet Loss (approx.)', value: v.loss !== null ? v.loss + '%' : '—', status: v.loss === null ? 'unknown' : (v.loss === 0 ? 'good' : (v.loss <= 5 ? 'slow' : 'failed')) },
    { id:'dns', label:'DNS', value: v.dns !== null ? v.dns + ' ms' : '—', status: v.dns === null ? 'unknown' : (v.dns < 100 ? 'good' : 'slow') },
    { id:'internet', label:'Internet', value: state.lastAssessment ? (state.lastAssessment.reach.ok ? 'REACHABLE' : 'UNREACHABLE') : '—', status: state.lastAssessment ? (state.lastAssessment.reach.ok ? 'good' : 'failed') : 'unknown' },
    { id:'gateway', label:'Local Gateway', value: 'NOT TESTABLE', status: 'not_testable' }
  ];

  const cardHtml = cards.map(c => `
    <div class="card metric-card state-${c.status==='good'?'good':(c.status==='failed'?'bad':(c.status==='slow'?'warn':''))}" data-explain="${c.id}">
      <div class="label">${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="status ${c.status === 'not_testable' ? 'unknown' : c.status}">${statusLabel(c.status)}</div>
    </div>`).join('');

  return `
    <span class="eyebrow">Network X-Ray</span>
    <h1 class="page-title">PIXEL WiFi</h1>
    <p class="page-tag">See your connection. Understand your network. Know what to do next.</p>

    <div class="mode-toggle" id="mode-toggle">
      <button data-mode="live">LIVE</button>
      <button data-mode="low">LOW POWER</button>
      <button data-mode="manual">MANUAL</button>
    </div>

    <div class="grid cols-4" style="margin-top:16px;">${cardHtml}</div>

    <div class="btn-row">
      <button class="btn primary" id="btn-find-problem">FIND THE PROBLEM</button>
      <button class="btn" id="btn-run-sample">RUN A TEST NOW</button>
      <button class="btn" id="btn-open-xray">VIEW NETWORK X-RAY</button>
    </div>

    <h2 class="section-title">Live Event Timeline</h2>
    <div id="event-timeline"></div>

    ${companyFooter()}
  `;
}

function companyFooter(){
  return `<footer class="company-footer">
    <span><b>PixelProTech Solutions</b> — built, not copied.</span>
    <span>Local-first diagnostics. Nothing leaves your device without your action.</span>
  </footer>`;
}

function renderTimelineIfVisible(){
  const el = document.getElementById('event-timeline');
  if (!el) return;
  const recent = state.events.slice(-40).reverse();
  if (!recent.length){
    el.innerHTML = `<div class="faint">No events recorded yet. Run a test or stay on LIVE mode to start building a timeline.</div>`;
    return;
  }
  el.innerHTML = recent.map(e => `<div class="event-line ev-${e.level}"><span class="t">${fmtTime(e.t)}</span>${e.text}</div>`).join('');
}

function bindHomeEvents(){
  document.querySelectorAll('[data-explain]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.explain;
      const v = state.liveValues;
      const map = {
        transport: { detail: PixelDiag.getConnectionInfo().transportCertain ? `Detected as ${PixelDiag.getConnectionInfo().transport}.` : 'This browser does not expose which transport is active.' },
        effectiveType: { value: PixelDiag.getConnectionInfo().effectiveType },
        latency: { value: v.latency }, jitter: { value: v.jitter }, loss: { value: v.loss }, dns: { value: v.dns },
        internet: { detail: state.lastAssessment ? (state.lastAssessment.reach.ok ? `Reached a public endpoint in ${state.lastAssessment.reach.ms} ms.` : 'Could not reach a public endpoint.') : 'Not tested yet.' },
        gateway: {}
      };
      explainModal(id, map[id]);
    });
  });
  document.getElementById('btn-find-problem').addEventListener('click', () => { location.hash = '#find-problem'; });
  document.getElementById('btn-run-sample').addEventListener('click', () => runQuickSample(true));
  document.getElementById('btn-open-xray').addEventListener('click', () => { location.hash = '#xray'; });
  document.querySelectorAll('#mode-toggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
    b.addEventListener('click', () => setMode(b.dataset.mode));
  });
  renderTimelineIfVisible();
}

/* ---------------- Sampling / live mode ---------------- */
function setMode(mode){
  state.mode = mode;
  localStorage.setItem('pixel_mode', mode);
  document.querySelectorAll('#mode-toggle button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  scheduleLiveLoop();
  toast('Mode set to ' + mode.toUpperCase());
}

function scheduleLiveLoop(){
  if (state.liveTimer) clearInterval(state.liveTimer);
  if (state.mode === 'manual') return;
  const interval = state.mode === 'live' ? 20000 : 60000;
  state.liveTimer = setInterval(() => { if (navigator.onLine) runQuickSample(false); }, interval);
}

let lastQuickSample = null;
async function runQuickSample(userInitiated){
  if (!navigator.onLine){
    if (userInitiated) toast('Offline — live network tests unavailable offline.');
    return;
  }
  if (userInitiated) toast('Running test…');
  const lat = await PixelDiag.runLatencySamples(5);
  const dns = await PixelDiag.runDnsCheck();
  const dnsOk = dns.results.filter(r=>r.ok);
  const dnsAvg = dnsOk.length ? Math.round(dnsOk.reduce((a,r)=>a+r.ms,0)/dnsOk.length) : null;

  const prev = lastQuickSample;
  state.liveValues.latency = lat.avg;
  state.liveValues.jitter = lat.jitter;
  state.liveValues.loss = lat.lossPct;
  state.liveValues.dns = dnsAvg;
  pushHistory({ latency: lat.avg, jitter: lat.jitter, loss: lat.lossPct, dns: dnsAvg });

  if (prev){
    if (prev.latency !== null && lat.avg !== null && Math.abs(lat.avg - prev.latency) >= Math.max(40, prev.latency*0.6)){
      logEvent(`Internet latency changed: ${prev.latency} ms → ${lat.avg} ms.`, lat.avg > prev.latency ? 'warn' : 'good');
    }
    if (prev.loss !== lat.lossPct && lat.lossPct > 0){
      logEvent(`Packet loss detected: ${lat.lossPct}%.`, 'warn');
    } else if (prev.loss > 0 && lat.lossPct === 0){
      logEvent('Packet loss returned to 0%.', 'good');
    }
  } else {
    logEvent(`Baseline sample recorded: latency ${lat.avg ?? '—'} ms, loss ${lat.lossPct}%.`, 'info');
  }
  lastQuickSample = { latency: lat.avg, loss: lat.lossPct };
  if (userInitiated) toast('Test complete.');
  if (location.hash === '#home' || location.hash === '' || location.hash === '#'){ renderRoute(); }
}

/* ---------------- Network X-Ray screen ---------------- */
function screenXray(){
  const a = state.lastAssessment;
  function stateFor(id, fallback){
    if (!a) return fallback || 'unknown';
    const step = a.steps.find(s => s.id === id);
    return step ? step.status : (fallback || 'unknown');
  }
  const nodes = [
    { id:'device', label:'DEVICE', status:'good', explain:'device' },
    { id:'interface', label:'NETWORK INTERFACE', status: stateFor('interface'), explain:'interface' },
    { id:'transport', label:'WI-FI / CELLULAR', status: stateFor('transport'), explain:'transport' },
    { id:'ap', label:'ACCESS POINT', status:'not_testable', explain:'gateway' },
    { id:'gateway', label:'ROUTER / GATEWAY', status: stateFor('gateway','not_testable'), explain:'gateway' },
    { id:'dns', label:'DNS', status: stateFor('dns'), explain:'dns' },
    { id:'internet', label:'INTERNET', status: stateFor('internet'), explain:'internet' },
    { id:'remote', label:'REMOTE SERVER', status: stateFor('internet'), explain:'internet' }
  ];
  let html = '';
  nodes.forEach((n,i) => {
    html += `<div class="xray-node" data-node="${n.explain}">
      <span class="nname">${n.label}</span>
      <span class="nstate status ${n.status==='not_testable'?'unknown':n.status}">${statusLabel(n.status)}</span>
    </div>`;
    if (i < nodes.length - 1){
      const cls = n.status === 'failed' ? 'bad' : (n.status === 'good' ? 'ok' : (n.status==='slow'?'warn':''));
      html += `<div class="xray-connector ${cls}"></div>`;
    }
  });

  return `
    <span class="eyebrow">Live Topology</span>
    <h1 class="page-title">Network X-Ray</h1>
    <p class="page-tag">Your connection path, layer by layer. Click any layer for what it is, what was tested, and what to do next. Run "Find The Problem" for a fresh read.</p>
    <div id="xray-diagram">${html}</div>
    <div class="btn-row" style="justify-content:center;"><button class="btn primary" id="btn-xray-run">FIND THE PROBLEM</button></div>
    ${companyFooter()}
  `;
}
function bindXrayEvents(){
  document.querySelectorAll('.xray-node').forEach(n => n.addEventListener('click', () => explainModal(n.dataset.node, {})));
  document.getElementById('btn-xray-run').addEventListener('click', () => { location.hash = '#find-problem'; });
}

/* ---------------- Find The Problem screen ---------------- */
function screenFindProblem(){
  return `
    <span class="eyebrow">Progressive Diagnostic</span>
    <h1 class="page-title">Find The Problem</h1>
    <p class="page-tag">Pixel runs only the tests this platform genuinely supports, in order, and tells you what each one found.</p>
    <div class="btn-row"><button class="btn primary" id="btn-run-full">RUN FULL ASSESSMENT</button></div>
    <div id="assessment-steps" class="card" style="font-family:var(--mono);font-size:13px;"></div>
    <div id="assessment-result"></div>
    ${companyFooter()}
  `;
}
function bindFindProblemEvents(){
  document.getElementById('btn-run-full').addEventListener('click', runFullAssessmentUI);
}
async function runFullAssessmentUI(){
  const stepsEl = document.getElementById('assessment-steps');
  const resultEl = document.getElementById('assessment-result');
  resultEl.innerHTML = '';
  stepsEl.innerHTML = '<div class="dim">Starting…</div>';
  if (!navigator.onLine){
    stepsEl.innerHTML = '<div style="color:var(--red)">Device is offline — live network tests unavailable offline.</div>';
    return;
  }
  const lines = [];
  const result = await PixelDiag.runFullAssessment((step) => {
    lines.push(`<div>[<span class="status ${statusClass(step.status)==='ok'?'good':(statusClass(step.status)==='bad'?'failed':(statusClass(step.status)==='warn'?'slow':'unknown'))}" style="margin-right:6px;">${statusLabel(step.status)}</span>] ${step.label} — ${step.detail}</div>`);
    stepsEl.innerHTML = lines.join('');
  });
  state.lastAssessment = result;
  if (result.aborted){
    resultEl.innerHTML = `<h2 class="section-title">Result</h2><div class="card state-bad">Device appears offline. Reconnect and re-run the assessment.</div>`;
    return;
  }
  // sync liveValues from this assessment
  state.liveValues.latency = result.lat.avg;
  state.liveValues.jitter = result.lat.jitter;
  state.liveValues.loss = result.lat.lossPct;
  pushHistory({ latency: result.lat.avg, jitter: result.lat.jitter, loss: result.lat.lossPct, dns: null });

  const findingParts = [];
  const failing = result.steps.filter(s => s.status === 'failed');
  const slow = result.steps.filter(s => s.status === 'slow');
  if (!failing.length && !slow.length){
    findingParts.push('All testable layers currently measure healthy.');
  } else {
    if (failing.length) findingParts.push(`MEASURED failures at: ${failing.map(s=>s.label).join(', ')}.`);
    if (slow.length) findingParts.push(`SUGGESTS degraded performance at: ${slow.map(s=>s.label).join(', ')}.`);
  }
  const nextAction = failing.length ? `Start with ${failing[0].label} — ${LIBRARYNext(failing[0].id)}`
    : (slow.length ? `Start with ${slow[0].label} — ${LIBRARYNext(slow[0].id)}` : 'No action required based on current measurements. Re-run periodically or enable LIVE mode to catch intermittent issues.');

  resultEl.innerHTML = `
    <h2 class="section-title">Pixel Network Assessment</h2>
    <div class="grid cols-3">
      ${result.steps.map(s => `<div class="card tight" data-explain2="${s.id}"><div class="label" style="font-size:11px;color:var(--text-faint);text-transform:uppercase;">${s.label}</div><div class="status ${statusClass(s.status)==='ok'?'good':(statusClass(s.status)==='bad'?'failed':(statusClass(s.status)==='warn'?'slow':'unknown'))}" style="margin-top:6px;">${statusLabel(s.status)}</div></div>`).join('')}
    </div>
    <div class="explain-block" style="margin-top:16px;">
      <h4>Finding</h4><p>${findingParts.join(' ')} NOT CONFIRMED beyond what was directly measured.</p>
      <h4>Next Action</h4><p>${nextAction}</p>
    </div>
  `;
  resultEl.querySelectorAll('[data-explain2]').forEach(c => {
    c.style.cursor = 'pointer';
    c.addEventListener('click', () => {
      const step = result.steps.find(s => s.id === c.dataset.explain2);
      explainModal(step.id, { value: step.value, detail: step.detail });
    });
  });
  logEvent(`Find The Problem completed — ${failing.length} failed, ${slow.length} degraded.`, failing.length ? 'bad' : (slow.length ? 'warn' : 'good'));
}
function LIBRARYNext(id){
  const ex = PixelExplain.explain(id, {});
  return ex.next;
}

/* ---------------- Wi-Fi Lab ---------------- */
function screenLab(labId){
  const lab = PIXEL_LABS.find(l => l.id === labId);
  if (!lab) return `<p>Lab not found.</p>`;
  const rows = lab.concepts.map(c => `
    <div class="concept-row" data-concept="${c.id}">
      <span class="cr-title">${c.title}</span><span class="cr-arrow">→</span>
    </div>`).join('');
  return `
    <span class="eyebrow">Wi-Fi Lab</span>
    <h1 class="page-title">${lab.name}</h1>
    <p class="page-tag">Every concept below is explained using plain language first, then connected to your own live measurements where the platform exposes them.</p>
    <div class="concept-list">${rows}</div>
    ${companyFooter()}
  `;
}
function liveValueFor(key){
  const v = state.liveValues;
  const map = {
    latency: v.latency !== null ? `${v.latency} ms` : null,
    jitter: v.jitter !== null ? `${v.jitter} ms` : null,
    dns: v.dns !== null ? `${v.dns} ms` : null,
    packetLoss: v.loss !== null ? `${v.loss}%` : null,
    rssi: null, ssid: null, ipFamily: v.ipFamily
  };
  return map[key] !== undefined ? map[key] : null;
}
function bindLabEvents(labId){
  const lab = PIXEL_LABS.find(l => l.id === labId);
  document.querySelectorAll('[data-concept]').forEach(row => {
    row.addEventListener('click', () => {
      const c = lab.concepts.find(x => x.id === row.dataset.concept);
      let liveBox = '';
      if (c.liveKey !== undefined){
        const val = liveValueFor(c.liveKey);
        if (val){
          liveBox = `<div class="your-value-box">YOUR CURRENT VALUE: ${val}</div>`;
        } else {
          liveBox = `<div class="your-value-box unk">NOT EXPOSED BY THIS PLATFORM — browsers do not provide this value directly.</div>`;
        }
      }
      openModal(`
        <div class="explain-block">
          <h1 class="page-title" style="font-size:18px;margin-bottom:14px;">${c.title}</h1>
          ${liveBox}
          <h4>What It Is</h4><p>${c.what}</p>
          <h4>Why It Exists / Matters</h4><p>${c.why}</p>
          <h4>What It Affects</h4><p>${c.affects}</p>
          <h4>What You Can Do</h4><p>${c.do}</p>
        </div>
      `);
    });
  });
}

/* ---------------- Troubleshooting School ---------------- */
function screenTroubleshootList(){
  const rows = PIXEL_PROBLEMS.map(p => `<button class="problem-btn" data-problem="${p.id}">${p.title}</button>`).join('');
  return `
    <span class="eyebrow">Troubleshooting School</span>
    <h1 class="page-title">Why Is My Wi-Fi Bad?</h1>
    <p class="page-tag">Pick the symptom closest to what you're seeing. Each one follows the same loop: measure → understand → test → change one thing → measure again — so you never end up changing ten settings at once and not knowing which one worked.</p>
    <div>${rows}</div>
    ${companyFooter()}
  `;
}
function screenTroubleshootDetail(id){
  const p = PIXEL_PROBLEMS.find(x => x.id === id);
  if (!p) return `<p>Not found.</p>`;
  const steps = p.steps.map(s => `<div class="flow-step"><div class="fs-label">${s.label}</div><p>${s.text}</p></div>`).join('');
  return `
    <span class="eyebrow">Troubleshooting School</span>
    <button class="btn small" id="btn-back-tshoot" style="margin-bottom:14px;">← All Problems</button>
    <h1 class="page-title">${p.title}</h1>
    <div style="margin-top:16px;">${steps}</div>
    <div class="btn-row"><button class="btn primary" id="btn-tshoot-test">RUN A TEST NOW</button></div>
    ${companyFooter()}
  `;
}
function bindTroubleshootList(){
  document.querySelectorAll('[data-problem]').forEach(b => b.addEventListener('click', () => { location.hash = '#troubleshoot/' + b.dataset.problem; }));
}
function bindTroubleshootDetail(){
  const back = document.getElementById('btn-back-tshoot');
  if (back) back.addEventListener('click', () => { location.hash = '#troubleshoot'; });
  const t = document.getElementById('btn-tshoot-test');
  if (t) t.addEventListener('click', () => { location.hash = '#find-problem'; });
}

/* ---------------- Capability Detection ---------------- */
function screenCapabilities(){
  const caps = PixelDiag.detectCapabilities();
  state.caps = caps;
  const rows = Object.keys(caps).map(k => {
    const c = caps[k];
    const dot = c.available ? '🟢' : '🔴';
    return `<div class="cap-row"><span class="cdot">${dot}</span><span class="cname">${labelize(k)}</span><span class="cnote">${c.note}</span></div>`;
  }).join('');
  return `
    <span class="eyebrow">Platform Capability Model</span>
    <h1 class="page-title">What This Device Can Provide</h1>
    <p class="page-tag">Pixel WiFi never fakes a measurement the platform doesn't actually support. This is a live read of what your current browser/device exposes.</p>
    <div class="card">${rows}</div>
    <h2 class="section-title">Architecture</h2>
    <p class="dim" style="font-size:13.5px;line-height:1.6;">PIXEL WiFi UI → Capability Detection → Available Platform APIs → Diagnostic Engine → Explanation Engine → Next Action. Deeper desktop-level networking data (raw signal strength, channel, driver detail) would require a native companion — a future <b class="mono">Pixel WiFi Desktop Bridge</b> — rather than pretending a browser tab already has that access.</p>
    ${companyFooter()}
  `;
}
function labelize(k){
  return k.replace(/([A-Z])/g,' $1').replace(/^./, s=>s.toUpperCase());
}

/* ---------------- Network Report ---------------- */
function buildReportText(){
  const info = PixelDiag.getConnectionInfo();
  const v = state.liveValues;
  const a = state.lastAssessment;
  const lines = [];
  lines.push('PIXEL NETWORK REPORT');
  lines.push('Generated: ' + new Date().toString());
  lines.push('');
  lines.push('CONNECTION');
  lines.push('  Online: ' + (info.online === null ? 'unknown' : info.online));
  lines.push('  Transport: ' + info.transport + (info.transportCertain ? '' : ' (uncertain — not exposed by this browser)'));
  lines.push('  Effective type: ' + (info.effectiveType || 'not exposed'));
  lines.push('  Downlink estimate: ' + (info.downlink !== null ? info.downlink + ' Mbps (browser estimate)' : 'not exposed'));
  lines.push('  RTT hint: ' + (info.rttHint !== null ? info.rttHint + ' ms (browser estimate)' : 'not exposed'));
  lines.push('');
  lines.push('LAST MEASURED VALUES');
  lines.push('  Latency: ' + (v.latency !== null ? v.latency + ' ms' : 'not measured yet'));
  lines.push('  Jitter: ' + (v.jitter !== null ? v.jitter + ' ms' : 'not measured yet'));
  lines.push('  Packet loss (approx.): ' + (v.loss !== null ? v.loss + '%' : 'not measured yet'));
  lines.push('  DNS timing: ' + (v.dns !== null ? v.dns + ' ms' : 'not measured yet'));
  lines.push('');
  if (a){
    lines.push('LAST FULL ASSESSMENT');
    a.steps.forEach(s => lines.push('  ' + s.label + ': ' + statusLabel(s.status) + ' — ' + s.detail));
    lines.push('');
  }
  lines.push('LIMITATIONS');
  lines.push('  - Raw Wi-Fi signal strength (RSSI), channel, BSSID and SSID are not exposed to web browsers.');
  lines.push('  - The local router/gateway cannot be pinged or addressed directly from a browser tab.');
  lines.push('  - Packet loss is approximated from repeated timed HTTP requests, not true ICMP ping.');
  lines.push('');
  lines.push('This report was generated locally on your device by PIXEL WiFi (PixelProTech Solutions).');
  return lines.join('\n');
}
function screenReport(){
  return `
    <span class="eyebrow">Exportable Summary</span>
    <h1 class="page-title">Pixel Network Report</h1>
    <p class="page-tag">Everything below reflects only what has actually been measured this session. Nothing is sent anywhere unless you choose to share it.</p>
    <div class="btn-row">
      <button class="btn" id="btn-report-refresh">REFRESH</button>
      <button class="btn primary" id="btn-report-copy">COPY REPORT</button>
      <button class="btn" id="btn-report-download">DOWNLOAD .TXT</button>
      <button class="btn" id="btn-report-share">SHARE</button>
    </div>
    <div id="report-output"></div>
    ${companyFooter()}
  `;
}
function bindReportEvents(){
  function refresh(){ document.getElementById('report-output').textContent = buildReportText(); }
  refresh();
  document.getElementById('btn-report-refresh').addEventListener('click', refresh);
  document.getElementById('btn-report-copy').addEventListener('click', async () => {
    try{ await navigator.clipboard.writeText(buildReportText()); toast('Report copied.'); }
    catch(_e){ toast('Copy failed — select the text manually.'); }
  });
  document.getElementById('btn-report-download').addEventListener('click', () => {
    const blob = new Blob([buildReportText()], { type:'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pixel-network-report.txt'; a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById('btn-report-share').addEventListener('click', async () => {
    const text = buildReportText();
    if (navigator.share){
      try{ await navigator.share({ title:'Pixel Network Report', text }); }
      catch(_e){ /* user cancelled share sheet — no action needed */ }
    } else {
      toast('Sharing not supported here — use Copy or Download instead.');
    }
  });
}

/* ---------------- Privacy ---------------- */
function screenPrivacy(){
  return `
    <span class="eyebrow">Data Handling</span>
    <h1 class="page-title">Privacy</h1>
    <div class="explain-block">
      <h4>What Stays Local</h4>
      <p>All diagnostics, history and the event timeline are stored only in this browser's local storage on this device. Nothing is uploaded automatically.</p>
      <h4>What Ever Leaves This Device</h4>
      <p>Only the timed requests needed to actually run a test (reaching a public endpoint to measure latency/DNS/reachability), and — only if you explicitly open a public IP lookup — a request to an IP lookup service. Report sharing only happens when you tap Copy, Download or Share yourself.</p>
      <h4>What Pixel Never Collects Silently</h4>
      <p>SSIDs, IP addresses, MAC addresses and device identifiers are never collected or transmitted without you directly triggering that specific action.</p>
      <h4>Scope</h4>
      <p>Pixel WiFi is built to diagnose your own device and networks you are authorized to test. It does not scan for, identify, or attempt to access other people's networks or devices.</p>
    </div>
    ${companyFooter()}
  `;
}

/* ---------------- History ---------------- */
function screenHistory(){
  return `
    <span class="eyebrow">Measured Over Time</span>
    <h1 class="page-title">History</h1>
    <p class="page-tag">Only values Pixel actually measured on this device are shown here — nothing is backfilled or estimated.</p>
    <div class="mode-toggle" id="history-range">
      <button data-range="all" class="active">ALL SAVED</button>
      <button data-range="hour">LAST HOUR</button>
      <button data-range="today">TODAY</button>
    </div>
    <div id="history-charts" style="margin-top:16px;"></div>
    ${companyFooter()}
  `;
}
function sparkSvg(values, color){
  if (!values.length) return `<div class="faint" style="padding:20px 0;">No data points in this range yet.</div>`;
  const w = 600, h = 52, pad = 4;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = (max - min) || 1;
  const step = values.length > 1 ? (w - pad*2) / (values.length - 1) : 0;
  const pts = values.map((v,i) => {
    const x = pad + i*step;
    const y = h - pad - ((v - min) / range) * (h - pad*2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
}
function bindHistoryEvents(){
  function render(range){
    const now = Date.now();
    let cutoff = 0;
    if (range === 'hour') cutoff = now - 3600*1000;
    if (range === 'today') { const d = new Date(); d.setHours(0,0,0,0); cutoff = d.getTime(); }
    const rows = state.history.filter(h => h.t >= cutoff);
    const el = document.getElementById('history-charts');
    if (!rows.length){
      el.innerHTML = `<div class="card faint">No saved measurements in this range yet. Run a test or leave LIVE mode on for a while.</div>`;
      return;
    }
    const latency = rows.filter(r=>r.latency!==null && r.latency!==undefined).map(r=>r.latency);
    const jitter = rows.filter(r=>r.jitter!==null && r.jitter!==undefined).map(r=>r.jitter);
    const loss = rows.filter(r=>r.loss!==null && r.loss!==undefined).map(r=>r.loss);
    el.innerHTML = `
      <div class="card" style="margin-bottom:12px;"><h3>Latency (ms) — ${rows.length} samples</h3>${sparkSvg(latency, 'var(--gold)')}</div>
      <div class="card" style="margin-bottom:12px;"><h3>Jitter (ms)</h3>${sparkSvg(jitter, 'var(--green)')}</div>
      <div class="card"><h3>Packet Loss (%)</h3>${sparkSvg(loss, 'var(--red)')}</div>
    `;
  }
  document.querySelectorAll('#history-range button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#history-range button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      render(b.dataset.range);
    });
  });
  render('all');
}

/* ---------------- Router ---------------- */
function renderRoute(){
  const hash = (location.hash || '#home').slice(1);
  const parts = hash.split('/');
  const route = parts[0] || 'home';
  setActiveNav(route === 'lab' ? 'lab/' + parts[1] : (route === 'troubleshoot' ? 'troubleshoot' : route));
  const main = document.getElementById('main-content');

  if (route === 'home'){ main.innerHTML = screenHome(); bindHomeEvents(); }
  else if (route === 'xray'){ main.innerHTML = screenXray(); bindXrayEvents(); }
  else if (route === 'find-problem'){ main.innerHTML = screenFindProblem(); bindFindProblemEvents(); }
  else if (route === 'history'){ main.innerHTML = screenHistory(); bindHistoryEvents(); }
  else if (route === 'troubleshoot' && parts[1]){ main.innerHTML = screenTroubleshootDetail(parts[1]); bindTroubleshootDetail(); }
  else if (route === 'troubleshoot'){ main.innerHTML = screenTroubleshootList(); bindTroubleshootList(); }
  else if (route === 'lab' && parts[1]){ main.innerHTML = screenLab(parts[1]); bindLabEvents(parts[1]); }
  else if (route === 'capabilities'){ main.innerHTML = screenCapabilities(); }
  else if (route === 'report'){ main.innerHTML = screenReport(); bindReportEvents(); }
  else if (route === 'privacy'){ main.innerHTML = screenPrivacy(); }
  else { main.innerHTML = screenHome(); bindHomeEvents(); }

  window.scrollTo(0,0);
}

/* ---------------- Init ---------------- */
function init(){
  buildNav();
  updateTransportChip();
  PixelDiag.watchConnectionChanges((info, kind) => {
    updateTransportChip();
    if (kind === 'online') logEvent('Connection restored.', 'good');
    if (kind === 'offline') logEvent('Device went offline.', 'bad');
    if (kind === 'change') logEvent(`Transport reported as ${info.transport}.`, 'info');
    if (location.hash === '#home' || location.hash === '' || location.hash === '#') renderRoute();
  });
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
  scheduleLiveLoop();
  if (navigator.onLine) runQuickSample(false);

  document.getElementById('brand-home').addEventListener('click', () => { location.hash = '#home'; });
  document.getElementById('mobile-nav-toggle').addEventListener('click', () => document.getElementById('nav').classList.toggle('open'));

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredInstallPrompt = e;
    document.getElementById('install-btn').classList.remove('hidden');
  });
  document.getElementById('install-btn').addEventListener('click', async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    document.getElementById('install-btn').classList.add('hidden');
  });

  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline caching just won't be available — app still works online */ });
  }
}

document.addEventListener('DOMContentLoaded', init);
})();
