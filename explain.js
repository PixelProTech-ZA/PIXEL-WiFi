/* PIXEL WiFi — Explanation Engine
   MEASUREMENT -> INTERPRETATION -> STATUS -> EXPLANATION -> POSSIBLE CAUSES -> NEXT ACTION
   Never states a cause as proven — uses MEASURED / SUGGESTS / POSSIBLE / NOT CONFIRMED language. */

const PixelExplain = (function(){

  const LIBRARY = {
    device: {
      title: 'Device',
      what: () => 'This is the device you are currently using to run Pixel WiFi.',
      why: 'Every measurement in this app starts from your device\'s own network stack — its hardware, drivers and browser all shape what can be tested.',
      causes: ['N/A'],
      next: 'Compare results across devices if you suspect a device-specific rather than network-wide issue.'
    },
    interface: {
      title: 'Network Interface',
      what: (v) => v.status === 'failed' ? 'This device currently has no active network interface.' : 'This device has an active network interface.',
      why: 'The interface is the base layer everything else depends on — no interface means no possible connectivity, regardless of Wi-Fi or cellular state above it.',
      causes: ['Airplane mode enabled', 'Wi-Fi/cellular radio turned off', 'Adapter driver issue', 'Hardware switch disabled'],
      next: 'Check that Wi-Fi or mobile data is turned on, and airplane mode is off.'
    },
    transport: {
      title: 'Active Transport',
      what: (v) => v.detail,
      why: 'Knowing whether you are on Wi-Fi, mobile data, or ethernet changes which of the tests below are even meaningful — a mobile-data issue is diagnosed differently from a Wi-Fi issue.',
      causes: ['Browser privacy settings withholding transport type (very common)', 'Multiple interfaces active at once'],
      next: 'If unknown, check your device\'s own network/Wi-Fi settings screen directly — it always knows even when the browser does not say.'
    },
    gateway: {
      title: 'Local Gateway',
      what: () => 'Pixel cannot directly test your router/gateway from a browser tab — this is a genuine browser security boundary, not a missing feature.',
      why: 'Browsers are deliberately sandboxed from sending ICMP pings or addressing arbitrary local-network IPs, to prevent web pages from scanning your home network.',
      causes: ['N/A — this is a platform limitation, not a fault'],
      next: 'If you suspect the gateway itself, check your router\'s own status lights/admin page, or use your OS\'s native network diagnostics.'
    },
    dns: {
      title: 'DNS',
      what: (v) => v.value !== null && v.value !== undefined ? `Name-resolution-dependent requests completed with average timing around ${v.value} ms.` : 'DNS-dependent requests did not complete successfully.',
      why: 'Almost every connection starts with DNS. Slow DNS delays the start of every new site, even when the rest of your network is healthy.',
      causes: ['ISP resolver under load', 'Local router-level resolver issue', 'General network congestion adding to overall request time'],
      next: 'If consistently slow, this is worth comparing against a different DNS resolver at the router/device level.'
    },
    internet: {
      title: 'Internet Reachability',
      what: (v) => v.detail,
      why: 'This confirms whether your device can actually reach the open internet, distinct from just having a local network connection.',
      causes: ['ISP outage', 'Modem/router needing a restart', 'Local network fine but upstream path broken', 'Public test endpoint temporarily unavailable (rare)'],
      next: 'If this fails while your device shows "online", restart your modem/router and re-test before assuming a wider outage.'
    },
    latency: {
      title: 'Latency',
      what: (v) => v.value !== null && v.value !== undefined ? `Measured average round-trip time: ${v.value} ms.` : 'Not enough successful samples to measure.',
      why: 'Latency affects anything interactive — calls, gaming, remote desktop — more than it affects bulk downloads.',
      causes: ['Distance to the remote server', 'Local Wi-Fi conditions', 'Router or ISP congestion', 'Background devices saturating the connection'],
      next: 'Compare this against a local-only measurement where possible to see whether delay is local or upstream.'
    },
    jitter: {
      title: 'Jitter',
      what: (v) => v.value !== null && v.value !== undefined ? `Average variation between consecutive samples: ${v.value} ms.` : 'Not enough successful samples to measure.',
      why: 'Inconsistent timing disrupts real-time audio/video even when average latency looks fine.',
      causes: ['Wi-Fi interference causing intermittent retries', 'Congested link with variable queueing delay', 'Background traffic from other devices'],
      next: 'Watch the Live Event Timeline to see if jitter spikes align with anything else happening on the network.'
    },
    loss: {
      title: 'Packet Loss (approximate)',
      what: (v) => `${v.value ?? 0}% of timed requests failed or timed out during this test.`,
      why: 'Even small loss percentages are very noticeable for real-time audio/video, since retransmission cannot smooth those out the way it can for downloads.',
      causes: ['Weak or unstable Wi-Fi signal', 'Congested channel', 'ISP-side congestion', 'Temporary network blip'],
      next: 'Re-run the test — a one-off spike may be transient. A repeated non-zero result across several runs is more meaningful than a single sample.'
    },
    rssi: {
      title: 'Signal (RSSI)',
      what: (v) => v.available ? `Desktop Bridge reports your current signal as ${v.text}.` : 'Not available — this needs the optional PIXEL WiFi Desktop Bridge running on this machine, since browsers cannot read raw signal strength on their own.',
      why: 'RSSI is the actual radio signal strength your adapter is receiving from the access point, in dBm or as a normalized percentage depending on your OS.',
      causes: ['Distance from the access point', 'Walls/obstacles', 'Antenna position', 'Interference'],
      next: 'If weak, try moving closer to the access point and re-check — the Bridge refreshes this live.'
    },
    ssid: {
      title: 'Network Name (SSID)',
      what: (v) => v.available ? `Desktop Bridge reports you are connected to "${v.text}".` : 'Not available — browsers never expose SSID directly. This needs the optional PIXEL WiFi Desktop Bridge running locally.',
      why: 'The SSID confirms which network your device actually joined, useful when multiple similarly-named networks are nearby.',
      causes: ['N/A'],
      next: 'Install/run the Desktop Bridge (see Capability Detection) if you want this shown without it.'
    },
    effectiveType: {
      title: 'Effective Connection Type',
      what: (v) => v.value ? `The browser classifies this connection as roughly "${v.value}" based on recent timing/throughput.` : 'Not exposed by this browser.',
      why: 'This is the browser\'s own rough estimate, useful as a sanity check but not a precise measurement of your actual link.',
      causes: ['Classification is a heuristic, not a direct measurement — treat it as approximate'],
      next: 'Use the dedicated latency/DNS/internet tests for precise numbers instead of relying on this classification alone.'
    }
  };

  function explain(metricId, valueObj){
    const entry = LIBRARY[metricId];
    if (!entry){
      return { title: metricId, what: 'No explanation registered for this metric.', why: '', causes: [], next: '' };
    }
    return {
      title: entry.title,
      what: typeof entry.what === 'function' ? entry.what(valueObj || {}) : entry.what,
      why: entry.why,
      causes: entry.causes,
      next: entry.next
    };
  }

  return { explain, LIBRARY };
})();
