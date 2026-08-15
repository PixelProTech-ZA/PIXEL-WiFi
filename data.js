/* PIXEL WiFi — concept & troubleshooting data
   Every concept entry can optionally bind to a live value key so the education
   screen can show "YOUR CURRENT VALUE" pulled from the diagnostics engine. */

const PIXEL_LABS = [
  {
    id: 'fundamentals',
    name: 'Wi-Fi Fundamentals',
    icon: 'F',
    concepts: [
      {
        id: 'what-is-wifi',
        title: 'What is Wi-Fi?',
        what: 'Wi-Fi is a way for devices to exchange data over radio waves instead of cables, using the IEEE 802.11 family of standards.',
        why: 'It exists so phones, laptops and other devices can reach a network without being physically wired to it.',
        affects: 'Range, speed and reliability all depend on radio conditions rather than a fixed cable, which is why Wi-Fi behaves differently room to room.',
        do: 'Think of Wi-Fi as a shared radio conversation — the more devices and obstacles involved, the more that conversation has to compete for airtime.'
      },
      {
        id: 'access-point',
        title: 'Access Point',
        what: 'An access point (AP) is the device that turns a wired network into a wireless one your devices can join.',
        why: 'It is the "base station" your device is actually talking to over the air — often built into a home router.',
        affects: 'Its placement, antenna design and load (how many devices are connected) directly affect the signal you receive.',
        do: 'If you can see or move the access point, central and elevated placement usually improves coverage.'
      },
      {
        id: 'router-modem',
        title: 'Router vs Modem',
        what: 'A modem connects your home to your Internet Service Provider\'s network. A router directs traffic between your devices and, via the modem, the internet.',
        why: 'Many home devices combine both roles in a single box, which can make the two functions look like one thing.',
        affects: 'Problems can originate in either device — a modem issue looks like "no internet", a router issue can look like "no local network".',
        do: 'When troubleshooting, it helps to know whether your home device is a combined modem-router or two separate boxes.',
        liveKey: null
      },
      {
        id: 'ssid-bssid',
        title: 'SSID & BSSID',
        what: 'The SSID is the network name you pick from a list ("Home-WiFi"). The BSSID is the physical MAC address of the specific radio you connected to.',
        why: 'One SSID can be broadcast by several physical access points (as in mesh systems) — each with its own BSSID.',
        affects: 'If a device seems to "hop" between good and bad performance in the same room, it may be roaming between BSSIDs under one SSID.',
        do: 'BSSID/SSID detail is only exposed to native apps with location permission on most platforms — browsers generally cannot read it.',
        liveKey: 'ssid'
      },
      {
        id: 'client-device',
        title: 'Client / Device',
        what: 'Your phone, laptop or tablet is the "client" — the end of the wireless conversation opposite the access point.',
        why: 'Every client has its own radio hardware, antenna quality and driver, which is why two devices on the same network can perform differently.',
        affects: 'An older device with a weaker antenna will show a worse signal in the same spot than a newer one.',
        do: 'When comparing "my phone is slow but my laptop is fine", account for hardware differences before assuming the network is at fault.'
      },
      {
        id: 'channel',
        title: 'Channel',
        what: 'A channel is a narrow slice of radio frequency that an access point transmits on within a band.',
        why: 'Nearby networks on the same or overlapping channel compete for airtime, which shows up as congestion.',
        affects: 'Crowded channels (common at 2.4 GHz in apartment buildings) increase retries and reduce throughput.',
        do: 'Browsers cannot scan channels — this requires native OS or router-level tools.',
        liveKey: null
      },
      {
        id: 'channel-width',
        title: 'Channel Width',
        what: 'Channel width is how much spectrum a single channel uses — wider channels carry more data per second but are more prone to interference.',
        why: 'Modern Wi-Fi standards can use 20, 40, 80 or 160 MHz-wide channels depending on hardware and band.',
        affects: 'A wide channel in a crowded 2.4 GHz environment can perform worse than a narrower, cleaner one.',
        do: 'This is configured on the access point/router, not the browser — check router admin settings if available.'
      },
      {
        id: 'frequency-24',
        title: '2.4 GHz Band',
        what: 'The original Wi-Fi band. Lower frequency waves travel further and penetrate walls better.',
        why: 'It is also used by many other devices (microwaves, some cordless phones, Bluetooth), which increases interference.',
        affects: 'Expect longer range but a greater chance of congestion, especially in dense housing.',
        do: 'Good default for devices far from the access point or with thick walls in between.'
      },
      {
        id: 'frequency-5',
        title: '5 GHz Band',
        what: 'A higher-frequency band offering more usable channels and generally higher throughput than 2.4 GHz.',
        why: 'Higher frequency waves carry more data but attenuate faster through walls and distance.',
        affects: 'Typically faster close to the access point, weaker at range or through obstructions.',
        do: 'Best for devices near the access point that want maximum speed.'
      },
      {
        id: 'frequency-6',
        title: '6 GHz Band (Wi-Fi 6E / 7)',
        what: 'Additional spectrum opened for Wi-Fi in many regions, offering the least congestion of the three bands.',
        why: 'Availability depends on your device radio, the access point, your operating system, and local spectrum regulation all supporting it simultaneously.',
        affects: 'Where available it offers cleaner, higher-capacity connections — but shortest range of the three bands.',
        do: 'Do not assume 6 GHz exists just because a device is new — confirm the access point and regulatory domain support it.'
      },
      {
        id: 'generations',
        title: 'Wi-Fi Generations & Standards',
        what: 'Wi-Fi standards (802.11n/ac/ax/be, marketed as Wi-Fi 4/5/6/6E/7) define the maximum theoretical speed, efficiency and feature set of a connection.',
        why: 'A connection is limited by whichever device in the chain supports the oldest standard — client and access point both matter.',
        affects: 'A Wi-Fi 6 router talking to a Wi-Fi 4 client connects using Wi-Fi 4 rules.',
        do: 'The browser can sometimes report an effective connection class (like 4g-equivalent) but not the specific 802.11 standard in use.'
      },
      {
        id: 'roaming-mesh',
        title: 'Roaming & Mesh',
        what: 'Roaming is a client moving its connection from one access point to another as it moves through a space. Mesh systems use multiple coordinated access points to extend coverage under one network name.',
        why: 'Poor roaming (a device holding onto a distant, weak AP instead of switching to a closer one) is a common source of "my Wi-Fi randomly gets slow in this room" complaints.',
        affects: 'Mesh backhaul (how the mesh nodes talk to each other) can itself become a bottleneck if wireless rather than wired.',
        do: 'If one area is consistently weak, a mesh node or wired access point placed near it usually helps more than boosting router power.'
      },
      {
        id: 'hotspot-repeater',
        title: 'Hotspot, Repeater & Bridge',
        what: 'A hotspot shares one device\'s internet connection wirelessly. A repeater/extender rebroadcasts an existing Wi-Fi signal. A bridge connects two network segments together.',
        why: 'Each adds a hop, and each hop can add latency or halve throughput (classic single-radio repeaters especially).',
        affects: 'A phone hotspot is bound by cellular conditions; a repeater is bound by the signal it itself receives from the router.',
        do: 'If using a repeater/extender, its own connection back to the router is often the actual bottleneck to test.'
      }
    ]
  },
  {
    id: 'signal',
    name: 'Signal Lab',
    icon: 'S',
    concepts: [
      {
        id: 'rssi',
        title: 'RSSI (Received Signal Strength Indicator)',
        what: 'RSSI is a relative measurement of how strong the radio signal is at the receiver, usually expressed in dBm (decibel-milliwatts).',
        why: 'It is logarithmic, not linear — small dBm changes represent large real-world power differences.',
        affects: 'Typical ranges: above -50 dBm is excellent, -50 to -67 dBm is good, -67 to -75 dBm is workable but weak, below -80 dBm is unreliable.',
        do: 'Browsers do not expose RSSI directly for privacy/security reasons. Native OS network settings or router admin pages usually show it.',
        liveKey: 'rssi'
      },
      {
        id: 'noise-snr',
        title: 'Noise & SNR',
        what: 'Noise is unwanted radio energy in the same space. SNR (signal-to-noise ratio) compares your signal strength against that noise floor.',
        why: 'A strong signal sitting in a noisy environment can still perform poorly — SNR matters more than raw signal alone.',
        affects: 'Low SNR causes retransmissions even when RSSI looks "good" on paper.',
        do: 'Not measurable from a browser. Spectrum analyzer apps or enterprise access points expose this.'
      },
      {
        id: 'interference',
        title: 'Interference',
        what: 'Interference is any competing radio energy — other networks, Bluetooth devices, microwaves, baby monitors — that disrupts reception.',
        why: '2.4 GHz is especially crowded because many unrelated devices share it.',
        affects: 'Symptoms include intermittent slowdowns that come and go rather than a constant weak signal.',
        do: 'Try the 5 GHz band if available, or physically move suspected interference sources away from the access point.'
      },
      {
        id: 'distance-obstacles',
        title: 'Distance & Obstacles',
        what: 'Signal strength drops with distance, and drops further when passing through walls, floors, metal, or glass.',
        why: 'Different materials absorb radio energy differently — concrete and metal are far worse than drywall.',
        affects: 'A device two rooms away through concrete can perform worse than one further away with a clear line of sight.',
        do: 'This is the single most testable variable: move closer and watch the live measurement change.'
      },
      {
        id: 'antenna-position',
        title: 'Antenna Position',
        what: 'Both the access point\'s and the device\'s antenna orientation affects how well radio energy is sent and received.',
        why: 'Antennas radiate unevenly by direction — pointing them a different way can meaningfully change reception.',
        affects: 'Laptops/phones lying flat on metal desks or inside bags can noticeably reduce signal.',
        do: 'For routers with external antennas, vertical orientation is a reasonable general-purpose default.'
      }
    ]
  },
  {
    id: 'speed-latency',
    name: 'Speed & Latency Lab',
    icon: 'L',
    concepts: [
      {
        id: 'link-vs-internet',
        title: 'Link Speed vs Internet Speed',
        what: 'Link speed is the negotiated rate between your device and the access point. Internet speed is what actually gets delivered end to end from a remote server.',
        why: 'A device can report a high Wi-Fi link rate while the internet connection behind it is much slower, or vice versa.',
        affects: 'Never assume a high link-speed number means fast browsing — the bottleneck could be anywhere along the path.',
        do: 'Compare local network tests (gateway) against internet tests to isolate which segment is limiting you.'
      },
      {
        id: 'latency',
        title: 'Latency / Round-Trip Time',
        what: 'Latency is how long it takes a small piece of data to travel to a destination and a reply to come back, usually measured in milliseconds.',
        why: 'It matters most for interactive things — calls, gaming, remote desktop — where delay is felt directly, unlike bulk downloads.',
        affects: 'Under ~50ms feels instant, 50-150ms is generally fine for most use, above 150ms becomes noticeable, above 300ms is disruptive for real-time use.',
        do: 'Compare latency to your gateway against latency to the wider internet to see whether delay is local or upstream.',
        liveKey: 'latency'
      },
      {
        id: 'jitter',
        title: 'Jitter',
        what: 'Jitter is the variation in latency between consecutive measurements, rather than the latency value itself.',
        why: 'A steady 100ms is far less disruptive than latency that swings between 20ms and 200ms.',
        affects: 'High jitter is a common cause of choppy calls even when average speed and latency look acceptable.',
        do: 'Pixel calculates jitter from the spread of its own repeated latency samples.',
        liveKey: 'jitter'
      },
      {
        id: 'packet-loss',
        title: 'Packet Loss',
        what: 'Packet loss is the percentage of data packets that never arrive and must be retransmitted or are simply lost.',
        why: 'Even small amounts of loss (1-2%) are very noticeable in real-time audio/video; bulk downloads tolerate it better because of retransmission.',
        affects: 'Consistent loss usually points to a congested or unstable link somewhere in the path; occasional loss can be normal.',
        do: 'Pixel estimates loss from repeated timed requests — this is an approximation, not a true ICMP ping test, which browsers cannot perform.',
        liveKey: 'packetLoss'
      },
      {
        id: 'speed-test-limits',
        title: 'What a Speed Test Actually Measures',
        what: 'A download/upload speed test measures throughput to one specific test server over one specific time window.',
        why: 'It does not measure your Wi-Fi signal quality, your latency to other services, or your experience with a specific website.',
        affects: 'A high speed-test number does not guarantee a smooth video call, because that depends on latency and jitter too, not just throughput.',
        do: 'Treat a speed test as one data point in the picture, not the full diagnosis.'
      }
    ]
  },
  {
    id: 'dns-ip',
    name: 'DNS & IP Lab',
    icon: 'D',
    concepts: [
      {
        id: 'dns',
        title: 'DNS (Domain Name System)',
        what: 'DNS translates human-readable names like example.com into the numeric IP address computers use to route traffic.',
        why: 'Almost every connection starts with a DNS lookup, so a slow or failing resolver delays everything that follows, even if the rest of the network is fine.',
        affects: 'Symptoms of DNS trouble: sites are slow to start loading but fast once loaded, or specific sites fail while others work.',
        do: 'Pixel times DNS-dependent lookups by timing requests to different hostnames and comparing them to raw IP-based timing where possible.',
        liveKey: 'dns'
      },
      {
        id: 'resolver-caching',
        title: 'Resolvers & Caching',
        what: 'A DNS resolver is the server that performs the lookup on your behalf (often your ISP\'s, or a public one like 1.1.1.1 / 8.8.8.8). Results are cached briefly to avoid repeating lookups.',
        why: 'A slow or overloaded resolver adds delay to every new site you visit until its answer is cached.',
        affects: 'Switching resolvers can help if your current one is consistently slow — it will not increase raw internet speed.',
        do: 'This is configured at the router or device level, outside what a browser can change directly.'
      },
      {
        id: 'ipv4-ipv6',
        title: 'IPv4 vs IPv6',
        what: 'IPv4 is the original, widely used addressing system (e.g. 192.0.2.1). IPv6 is the newer, much larger address space (e.g. 2001:db8::1) designed to replace it.',
        why: 'Most networks today run both side by side ("dual-stack"); which one a connection uses depends on what both ends support.',
        affects: 'Occasionally a broken IPv6 path causes slowdowns on some sites while IPv4-only ones work fine, or vice versa.',
        do: 'Pixel shows whichever address family your browser exposes for the current connection where available.',
        liveKey: 'ipFamily'
      },
      {
        id: 'private-public-ip',
        title: 'Private vs Public IP',
        what: 'A private IP address (like 192.168.x.x or 10.x.x.x) identifies your device inside your home network. A public IP identifies your entire network to the internet.',
        why: 'NAT (below) translates between the two so many private devices can share one public address.',
        affects: 'Browsers generally cannot read your local private IP directly for privacy reasons; a public IP can be seen by external services you query.',
        do: 'Pixel only shows what a public IP-lookup service reports back, and only when you choose to run that check.'
      },
      {
        id: 'subnet-gateway',
        title: 'Subnet & Gateway',
        what: 'A subnet is the local block of addresses your device shares with other devices on the same network. The gateway is the device (usually your router) that connects that subnet to everything beyond it.',
        why: 'All traffic leaving your local network passes through the gateway first.',
        affects: 'If the gateway is unreachable, local devices may still talk to each other but nothing can reach the internet.',
        do: 'Browsers cannot address the gateway directly by IP for a genuine reachability test — Pixel infers gateway health from whether any local-network-dependent activity succeeds.'
      },
      {
        id: 'dhcp-static',
        title: 'DHCP vs Static Addressing',
        what: 'DHCP automatically assigns your device an IP address and settings when it joins a network. Static addressing means those settings are fixed manually.',
        why: 'DHCP is the default for nearly all home and mobile devices because it requires no manual setup.',
        affects: 'DHCP problems can cause a device to fail to get network access at all ("no IP assigned").',
        do: 'Not directly testable from a browser — this is an OS/network-adapter-level detail.'
      },
      {
        id: 'nat-mac',
        title: 'NAT & MAC Address',
        what: 'NAT (Network Address Translation) lets many private devices share one public IP address. A MAC address is a hardware identifier burned into a network adapter.',
        why: 'NAT is why your home devices can all reach the internet through a single ISP connection.',
        affects: 'Modern devices often randomize the MAC address they present to new networks for privacy.',
        do: 'Browsers do not expose MAC addresses to web pages.'
      }
    ]
  },
  {
    id: 'router',
    name: 'Router Lab',
    icon: 'R',
    concepts: [
      {
        id: 'router-ap-modem',
        title: 'Router, Access Point & Modem',
        what: 'These three roles are often combined into a single home device, but are logically separate functions: modem talks to your ISP, router directs traffic, access point provides the wireless radio.',
        why: 'Understanding the separation helps target troubleshooting — a Wi-Fi-only issue is different from a modem/ISP issue.',
        affects: 'Restarting a combined device restarts all three functions at once, which is why it fixes such a wide range of problems.',
        do: 'If you have separate devices, isolate which one is involved by checking whether wired devices are also affected.'
      },
      {
        id: 'firewall-lan-wan',
        title: 'Firewall, LAN & WAN',
        what: 'LAN (local area network) is everything inside your home. WAN (wide area network) is the connection out to your ISP and the internet. A firewall controls what traffic is allowed to cross that boundary.',
        why: 'Overly strict firewall rules can block legitimate traffic and look like a broader connectivity failure.',
        affects: 'Most home firewalls are permissive outbound by default — inbound restrictions are more common.',
        do: 'Firewall configuration lives on the router, not something a browser can inspect or change.'
      }
    ]
  },
  {
    id: 'security',
    name: 'Security Lab',
    icon: '!',
    concepts: [
      {
        id: 'wpa',
        title: 'WPA2 vs WPA3',
        what: 'WPA2 and WPA3 are Wi-Fi encryption standards that protect data traveling between your device and the access point. WPA3 is the newer, stronger standard.',
        why: 'Weaker or absent encryption lets nearby devices potentially read or inject traffic on the network.',
        affects: 'Older devices may not support WPA3, which can force a network to run in a mixed or weaker mode.',
        do: 'Use the strongest option your router and devices both support, with a long, unique password.'
      },
      {
        id: 'guest-networks',
        title: 'Guest Networks',
        what: 'A guest network gives visitors internet access while keeping them isolated from your main devices and files.',
        why: 'It limits the damage a compromised visitor device or IoT gadget can do to the rest of your network.',
        affects: 'Smart-home and IoT devices are good candidates for a guest or dedicated IoT network.',
        do: 'Enable a guest network on your router if you regularly have visitors or many IoT devices.'
      },
      {
        id: 'public-wifi-vpn',
        title: 'Public Wi-Fi Risks & VPN Basics',
        what: 'Public networks (cafes, airports) put your device on the same local segment as strangers, and traffic can sometimes be intercepted if unencrypted. A VPN encrypts your traffic to a trusted point before it reaches the open internet.',
        why: 'HTTPS already encrypts most modern web traffic end-to-end, which covers much of the practical risk — a VPN adds another layer, particularly against local network snooping.',
        affects: 'Avoid sensitive logins over unknown open networks without HTTPS or a VPN.',
        do: 'Prefer networks that require a password, and check for HTTPS (padlock) on sites carrying sensitive data.'
      },
      {
        id: 'rogue-ap',
        title: 'Rogue Access Points',
        what: 'A rogue access point is an unauthorized device impersonating a trusted network name to intercept traffic.',
        why: 'It relies on a device auto-connecting to a familiar-looking SSID without verifying it is the real one.',
        affects: 'Public places with common network names ("Airport_WiFi") are the highest-risk environment for this.',
        do: 'Pixel WiFi is a diagnostic tool for your own device and networks you are authorized to test — it does not scan for or identify other people\'s access points.'
      },
      {
        id: 'firmware',
        title: 'Firmware Updates',
        what: 'Firmware is the software running on your router/access point itself, separate from any app or website.',
        why: 'Outdated firmware can carry known security vulnerabilities that are already patched in newer releases.',
        affects: 'Many routers can auto-update; where not, periodic manual checks in the router admin page are worthwhile.',
        do: 'Check your router manufacturer\'s admin page or app for firmware update status.'
      }
    ]
  },
  {
    id: 'hardware',
    name: 'Driver & Adapter Lab',
    icon: 'H',
    concepts: [
      {
        id: 'adapter-chipset',
        title: 'Wi-Fi Adapter & Chipset',
        what: 'The Wi-Fi adapter is the physical radio hardware in your device; the chipset is the specific silicon that implements it.',
        why: 'Different chipsets support different standards, band combinations and maximum speeds.',
        affects: 'Two devices in the same spot can perform differently purely because of adapter capability.',
        do: 'Check your device manufacturer specs for the adapter\'s supported standards and bands.'
      },
      {
        id: 'driver-firmware',
        title: 'Driver & Firmware',
        what: 'The driver is the OS-level software that controls the Wi-Fi adapter. The adapter also has its own onboard firmware.',
        why: 'Outdated or buggy drivers are a common, under-suspected cause of random disconnects on desktop systems.',
        affects: 'Symptoms include a device that reconnects fine but drops randomly under load or after sleep.',
        do: 'Where the OS permits, check for adapter driver updates through the manufacturer or OS update channel.'
      },
      {
        id: 'os-standards',
        title: 'Supported Standards',
        what: 'The maximum Wi-Fi standard, band, and channel width your device can use is capped by hardware and confirmed/enabled by its driver and OS.',
        why: 'A device physically capable of Wi-Fi 6 will not use it if the driver or OS has not enabled that mode.',
        affects: 'Especially relevant on older laptops running newer operating systems, or vice versa.',
        do: 'Compare your device\'s spec sheet against what your access point supports to find the actual ceiling.'
      }
    ]
  }
];

/* ---------------- Troubleshooting School ---------------- */
const PIXEL_PROBLEMS = [
  {
    id: 'weak-signal',
    title: 'Weak Signal',
    steps: [
      { label: 'Measure', text: 'Check the current signal-related value on the Home screen or via Find The Problem.' },
      { label: 'Understand', text: 'Weak signal is usually a function of distance, obstacles, or antenna position between your device and the access point.' },
      { label: 'Test', text: 'Move roughly halfway closer to the access point.' },
      { label: 'Change one thing', text: 'Only change position — do not also change Wi-Fi band, channel or router settings in the same test.' },
      { label: 'Measure again', text: 'Re-check the same value. Did it improve? If yes, placement/range is the relevant factor here. If no, look at interference or hardware next.' }
    ]
  },
  {
    id: 'slow-internet',
    title: 'Slow Internet',
    steps: [
      { label: 'Measure', text: 'Run Find The Problem to capture gateway, DNS, latency and internet reachability together.' },
      { label: 'Understand', text: 'Slowness can originate locally (Wi-Fi/router), at your ISP, or at the remote service itself.' },
      { label: 'Test', text: 'Compare device-to-gateway timing against device-to-internet timing.' },
      { label: 'Change one thing', text: 'If local timing is fine but internet timing is poor, the issue is likely upstream of your router, not your Wi-Fi.' },
      { label: 'Measure again', text: 'Re-run the test at a different time of day to see whether it is constant (more likely local/ISP) or time-dependent (more likely congestion).' }
    ]
  },
  {
    id: 'connected-no-internet',
    title: 'Connected But No Internet',
    steps: [
      { label: 'Measure', text: 'Check whether the device shows a network connection at all (Wi-Fi/mobile icon) versus actual internet reachability.' },
      { label: 'Understand', text: 'A device can successfully join a local network (get an IP address) while the network itself has no path to the internet — these are separate layers.' },
      { label: 'Test', text: 'Pixel tests internet reachability directly via timed requests. If those fail while the connection API still reports "online", the fault sits between your router and the wider internet.' },
      { label: 'Change one thing', text: 'Restart just the modem/router, wait for it to fully reconnect, then re-test before changing anything else.' },
      { label: 'Measure again', text: 'If it is still failing after that, the issue is most likely upstream with your ISP rather than your local setup.' }
    ]
  },
  {
    id: 'random-disconnects',
    title: 'Random Disconnects',
    steps: [
      { label: 'Measure', text: 'Watch the Live Event Timeline over time to see if disconnects correlate with anything (time of day, specific activity).' },
      { label: 'Understand', text: 'Random drops can come from signal instability, driver/firmware bugs, power-saving settings, or access point overload.' },
      { label: 'Test', text: 'Note whether the disconnect affects only this device or all devices at once.' },
      { label: 'Change one thing', text: 'If only one device drops, focus on that device\'s driver and power settings first rather than the router.' },
      { label: 'Measure again', text: 'After any single change, keep the timeline running to see whether the pattern actually stops.' }
    ]
  },
  {
    id: 'high-ping',
    title: 'High Ping',
    steps: [
      { label: 'Measure', text: 'Run the Latency Lab test to see current round-trip timing and jitter.' },
      { label: 'Understand', text: 'High but stable ping is different from unstable, jittery ping — they point to different causes.' },
      { label: 'Test', text: 'Compare local-network timing to internet timing to isolate where the delay is introduced.' },
      { label: 'Change one thing', text: 'If local timing is low and internet timing is high, the delay is outside your control locally (ISP/routing/remote server).' },
      { label: 'Measure again', text: 'Re-test after closing bandwidth-heavy background activity (large downloads, cloud backups, streaming).' }
    ]
  },
  {
    id: 'buffering',
    title: 'Buffering',
    steps: [
      { label: 'Measure', text: 'Check packet loss and jitter, not just raw speed — buffering is more sensitive to consistency than peak throughput.' },
      { label: 'Understand', text: 'A connection can have high average speed and still buffer if loss or jitter spikes intermittently.' },
      { label: 'Test', text: 'Watch the Live Event Timeline while the buffering happens to see if Pixel logs a loss or latency spike at the same moment.' },
      { label: 'Change one thing', text: 'Reduce concurrent network usage on other devices, then retest.' },
      { label: 'Measure again', text: 'If buffering continues with no other load, the fault likely sits upstream of your local network.' }
    ]
  },
  {
    id: 'slow-dns',
    title: 'Slow DNS',
    steps: [
      { label: 'Measure', text: 'Open the DNS Lab and run a DNS timing check.' },
      { label: 'Understand', text: 'DNS problems show up as a delay before a page starts loading, even though the page loads quickly once it starts.' },
      { label: 'Test', text: 'Compare timing across a couple of different hostnames to see if it is consistently slow or only for specific sites.' },
      { label: 'Change one thing', text: 'If consistently slow across sites, consider testing with a different DNS resolver configured at the router or device level.' },
      { label: 'Measure again', text: 'Re-run the DNS timing check after the change to confirm an actual improvement rather than assuming one.' }
    ]
  },
  {
    id: 'one-device-slow',
    title: 'Only One Device Is Slow',
    steps: [
      { label: 'Measure', text: 'Run the same Find The Problem test on the affected device and, if possible, on another device in the same location.' },
      { label: 'Understand', text: 'If only one device is affected, the network itself is less likely to be the cause — look at that device\'s hardware, driver, or settings.' },
      { label: 'Test', text: 'Check if the device is on an older Wi-Fi standard/band than the others.' },
      { label: 'Change one thing', text: 'Try switching just that device to the other available band, if supported.' },
      { label: 'Measure again', text: 'Compare its results before and after the band switch.' }
    ]
  },
  {
    id: 'every-device-slow',
    title: 'Every Device Is Slow',
    steps: [
      { label: 'Measure', text: 'Run Find The Problem to check gateway, DNS and internet reachability as the shared path all devices depend on.' },
      { label: 'Understand', text: 'A shared-cause problem points to the access point, router, modem, or the ISP connection itself rather than any one device.' },
      { label: 'Test', text: 'Check how many devices are actively using bandwidth at the same time.' },
      { label: 'Change one thing', text: 'Restart the router/modem as a single controlled change, then retest before changing anything else.' },
      { label: 'Measure again', text: 'If the problem persists immediately after a clean restart with normal load, it is more likely an ISP-side issue.' }
    ]
  },
  {
    id: 'site-specific',
    title: 'Wi-Fi Works But Certain Sites Don\'t',
    steps: [
      { label: 'Measure', text: 'Confirm general internet reachability works (Find The Problem) while noting which specific site fails.' },
      { label: 'Understand', text: 'This pattern usually points to that specific service (outage, regional block, DNS entry) rather than your network.' },
      { label: 'Test', text: 'Try the same site on mobile data instead of Wi-Fi to see if the problem follows the network or the site.' },
      { label: 'Change one thing', text: 'If it fails on both networks, the issue is very likely on the site/service\'s side, not yours.' },
      { label: 'Measure again', text: 'Recheck later — many single-site issues are temporary outages that resolve on their own.' }
    ]
  },
  {
    id: 'mobile-vs-wifi-a',
    title: 'Mobile Data Works But Wi-Fi Doesn\'t',
    steps: [
      { label: 'Measure', text: 'Switch the Home screen transport view to confirm which is actually active, then run Find The Problem on Wi-Fi.' },
      { label: 'Understand', text: 'This points at your local Wi-Fi/router/ISP path specifically, since the device itself clearly has working internet capability via cellular.' },
      { label: 'Test', text: 'Check whether other devices on the same Wi-Fi are also affected.' },
      { label: 'Change one thing', text: 'Restart the router/modem, then retest Wi-Fi before changing anything else.' },
      { label: 'Measure again', text: 'If Wi-Fi is still failing after a clean restart, contact your ISP — the fault is upstream of your device.' }
    ]
  },
  {
    id: 'mobile-vs-wifi-b',
    title: 'Wi-Fi Works But Mobile Data Doesn\'t',
    steps: [
      { label: 'Measure', text: 'Confirm mobile data is actually toggled on and airplane mode is off.' },
      { label: 'Understand', text: 'This points at the cellular radio, SIM/account, or carrier signal specifically — not your home network.' },
      { label: 'Test', text: 'Check signal bars for cellular and try in a different physical location.' },
      { label: 'Change one thing', text: 'Toggle airplane mode on and off as a single controlled change to force the radio to reconnect.' },
      { label: 'Measure again', text: 'If mobile data still fails afterward, this is best diagnosed with your carrier directly.' }
    ]
  }
];
