export function generateSingleLineDiagram(params: {
  panelQuantity: number;
  panelWattage: number;
  seriesCount: number;
  parallelCount: number;
  batteryQuantity: number;
  batteryType: string;
  batteryCapacityAh: number;
  batteryVoltage: number;
  inverterSizeKva: number;
  inverterType: string;
  dcStringFuse: string;
  dcStringIsolator: string;
  batteryBreaker: string;
  acOutputBreaker: string;
  pvCableSize: string;
  batteryCableSize: string;
  acCableSize: string;
}): string {
  // We'll return a beautiful, well-labeled SVG diagram.
  // Deep blue: #123A63, VoltSolar Blue: #156DB7, VoltSolar Green: #69BD45, Orange: #F59E0B
  
  const svgWidth = 800;
  const svgHeight = 420;

  const svg = `
<svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full h-auto bg-slate-900 border border-slate-800 rounded-3xl" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background grid -->
    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.03" />
    </pattern>
    <!-- Arrow marker for electrical paths -->
    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#156DB7" />
    </marker>
    <!-- Solar Cell Icon Component -->
    <g id="pv-icon">
      <rect x="0" y="0" width="44" height="60" rx="3" fill="#1e293b" stroke="#156DB7" stroke-width="2" />
      <line x1="11" y1="0" x2="11" y2="60" stroke="#334155" stroke-width="1" />
      <line x1="22" y1="0" x2="22" y2="60" stroke="#334155" stroke-width="1.5" />
      <line x1="33" y1="0" x2="33" y2="60" stroke="#334155" stroke-width="1" />
      <line x1="0" y1="15" x2="44" y2="15" stroke="#334155" stroke-width="1" />
      <line x1="0" y1="30" x2="44" y2="30" stroke="#334155" stroke-width="1.5" />
      <line x1="0" y1="45" x2="44" y2="45" stroke="#334155" stroke-width="1" />
    </g>
    <!-- Battery Cell Icon Component -->
    <g id="batt-icon">
      <rect x="0" y="5" width="50" height="40" rx="4" fill="#1e293b" stroke="#69BD45" stroke-width="2" />
      <rect x="15" y="0" width="6" height="5" fill="#69BD45" rx="1" />
      <rect x="29" y="0" width="6" height="5" fill="#69BD45" rx="1" />
      <line x1="18" y1="20" x2="18" y2="30" stroke="#69BD45" stroke-width="2" />
      <line x1="13" y1="25" x2="23" y2="25" stroke="#69BD45" stroke-width="2" />
      <line x1="29" y1="25" x2="37" y2="25" stroke="#69BD45" stroke-width="2" />
    </g>
    <!-- Inverter Icon Component -->
    <g id="inv-icon">
      <rect x="0" y="0" width="80" height="90" rx="8" fill="#123A63" stroke="#156DB7" stroke-width="2" />
      <!-- Wave indicator -->
      <path d="M 15 55 Q 25 40 35 55 T 55 55" fill="none" stroke="#ffffff" stroke-width="2.5" />
      <text x="40" y="30" font-family="monospace" font-size="11" font-weight="black" fill="#ffffff" text-anchor="middle">DC / AC</text>
    </g>
  </defs>

  <!-- Apply background pattern -->
  <rect width="100%" height="100%" fill="url(#grid)" />
  
  <!-- Diagram Title Header -->
  <text x="25" y="30" font-family="sans-serif" font-size="12" font-weight="900" fill="#ffffff" letter-spacing="1">ELECTRICAL SINGLE-LINE DIAGRAM (SLD)</text>
  <text x="25" y="46" font-family="monospace" font-size="9" fill="#64748b" font-weight="bold">VoltSolar® Standard Engineering Layout (IEC 60364 compliant)</text>

  <!-- ==================== PV ARRAY BLOCK ==================== -->
  <g transform="translate(40, 80)">
    <use href="#pv-icon" x="0" y="0" />
    <use href="#pv-icon" x="12" y="10" />
    <text x="35" y="-12" font-family="sans-serif" font-size="10" font-weight="bold" fill="#f59e0b" text-anchor="middle">PV Array</text>
    <text x="35" y="85" font-family="monospace" font-size="8" fill="#94a3b8" text-anchor="middle" font-weight="bold">${params.seriesCount}S × ${params.parallelCount}P</text>
    <text x="35" y="96" font-family="monospace" font-size="8" fill="#64748b" text-anchor="middle">${params.panelQuantity}x ${params.panelWattage}Wp</text>
  </g>

  <!-- Connection: PV Array to DC Fuse -->
  <line x1="110" y1="125" x2="160" y2="125" stroke="#f59e0b" stroke-width="2" marker-end="url(#arrow)" />
  <text x="135" y="115" font-family="monospace" font-size="7" fill="#64748b" text-anchor="middle" font-weight="bold">PV Cable: ${params.pvCableSize.split(' ')[0]}mm²</text>

  <!-- ==================== DC PROTECTION BLOCK ==================== -->
  <g transform="translate(160, 95)">
    <!-- DC Fuse Box -->
    <rect x="0" y="0" width="50" height="60" rx="4" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5" />
    <line x1="10" y1="30" x2="40" y2="30" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2,2" />
    <circle cx="25" cy="30" r="10" fill="none" stroke="#f59e0b" stroke-width="1.5" />
    <text x="25" y="18" font-family="sans-serif" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle">DC Fuse</text>
    <text x="25" y="48" font-family="monospace" font-size="7" fill="#f59e0b" text-anchor="middle" font-weight="bold">${params.dcStringFuse.split(' ')[0]}</text>
  </g>

  <!-- Connection: Fuse to DC Isolator -->
  <line x1="210" y1="125" x2="250" y2="125" stroke="#f59e0b" stroke-width="2" />

  <g transform="translate(250, 95)">
    <!-- DC Isolator Box -->
    <rect x="0" y="0" width="50" height="60" rx="4" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5" />
    <!-- Switch symbol -->
    <line x1="10" y1="30" x2="25" y2="30" stroke="#ffffff" stroke-width="2" />
    <line x1="25" y1="30" x2="40" y2="20" stroke="#ffffff" stroke-width="2" />
    <text x="25" y="18" font-family="sans-serif" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle">DC Switch</text>
    <text x="25" y="48" font-family="monospace" font-size="7" fill="#64748b" text-anchor="middle" font-weight="bold">${params.dcStringIsolator.split(' ')[0]}</text>
  </g>

  <!-- Connection: DC Isolator to Inverter -->
  <line x1="300" y1="125" x2="360" y2="125" stroke="#f59e0b" stroke-width="2" marker-end="url(#arrow)" />

  <!-- ==================== HYBRID INVERTER ==================== -->
  <g transform="translate(360, 80)">
    <use href="#inv-icon" x="0" y="0" />
    <text x="40" y="105" font-family="sans-serif" font-size="10" font-weight="black" fill="#ffffff" text-anchor="middle">Inverter</text>
    <text x="40" y="117" font-family="monospace" font-size="9" fill="#156DB7" text-anchor="middle" font-weight="bold">${params.inverterSizeKva} kVA</text>
    <text x="40" y="128" font-family="monospace" font-size="7.5" fill="#64748b" text-anchor="middle" font-weight="bold" class="capitalize">${params.inverterType} Type</text>
  </g>

  <!-- ==================== BATTERY BANK & PROTECTION ==================== -->
  <!-- Connection: Inverter Down to Battery Breaker -->
  <line x1="400" y1="170" x2="400" y2="220" stroke="#69BD45" stroke-width="2" marker-end="url(#arrow)" />
  <text x="340" y="200" font-family="monospace" font-size="7" fill="#64748b" font-weight="bold">Batt Cable: ${params.batteryCableSize.split(' ')[0]}mm²</text>

  <g transform="translate(370, 220)">
    <!-- Battery Breaker Box -->
    <rect x="0" y="0" width="60" height="50" rx="4" fill="#0f172a" stroke="#69BD45" stroke-width="1.5" />
    <line x1="15" y1="25" x2="30" y2="25" stroke="#ffffff" stroke-width="1.5" />
    <line x1="30" y1="25" x2="45" y2="15" stroke="#ffffff" stroke-width="1.5" />
    <text x="30" y="14" font-family="sans-serif" font-size="7" font-weight="bold" fill="#ffffff" text-anchor="middle">Batt Breaker</text>
    <text x="30" y="38" font-family="monospace" font-size="7" fill="#69BD45" text-anchor="middle" font-weight="bold">${params.batteryBreaker.split(' ')[0]}</text>
  </g>

  <!-- Connection: Battery Breaker to Battery Bank -->
  <line x1="400" y1="270" x2="400" y2="310" stroke="#69BD45" stroke-width="2" marker-end="url(#arrow)" />

  <g transform="translate(375, 310)">
    <use href="#inv-icon" x="-100" y="-100" style="display:none;" /> <!-- prefetch helper -->
    <use href="#batt-icon" x="0" y="0" />
    <text x="25" y="58" font-family="sans-serif" font-size="9" font-weight="bold" fill="#69BD45" text-anchor="middle">Battery Bank</text>
    <text x="25" y="68" font-family="monospace" font-size="7.5" fill="#94a3b8" text-anchor="middle" font-weight="bold">${params.batteryQuantity}x ${params.batteryCapacityAh}Ah / ${params.batteryVoltage}V</text>
    <text x="25" y="78" font-family="monospace" font-size="7.5" fill="#64748b" text-anchor="middle" class="capitalize">${params.batteryType}</text>
  </g>

  <!-- ==================== AC SIDE PROTECTION & LOADS ==================== -->
  <!-- Connection: Inverter Right to AC Breaker -->
  <line x1="440" y1="125" x2="490" y2="125" stroke="#156DB7" stroke-width="2" marker-end="url(#arrow)" />
  <text x="465" y="115" font-family="monospace" font-size="7" fill="#64748b" text-anchor="middle" font-weight="bold">AC: ${params.acCableSize.split(' ')[0]}mm²</text>

  <g transform="translate(490, 95)">
    <!-- AC Main MCB Box -->
    <rect x="0" y="0" width="55" height="60" rx="4" fill="#0f172a" stroke="#156DB7" stroke-width="1.5" />
    <!-- Breaker diagram symbol -->
    <line x1="10" y1="30" x2="25" y2="30" stroke="#ffffff" stroke-width="2" />
    <polyline points="25,30 35,18 45,30" fill="none" stroke="#ffffff" stroke-width="2" />
    <text x="27.5" y="16" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="#ffffff" text-anchor="middle">AC MCB</text>
    <text x="27.5" y="48" font-family="monospace" font-size="7" fill="#156DB7" text-anchor="middle" font-weight="bold">${params.acOutputBreaker.split(' ')[0]}</text>
  </g>

  <!-- Connection: AC Breaker to MDB -->
  <line x1="545" y1="125" x2="600" y2="125" stroke="#156DB7" stroke-width="2" marker-end="url(#arrow)" />

  <g transform="translate(600, 80)">
    <!-- Main Distribution Board Box -->
    <rect x="0" y="0" width="75" height="90" rx="6" fill="#1e293b" stroke="#156DB7" stroke-width="2" />
    <!-- Load breakers inside DB -->
    <line x1="15" y1="20" x2="60" y2="20" stroke="#334155" stroke-width="3" />
    <line x1="20" y1="35" x2="20" y2="70" stroke="#69BD45" stroke-width="2" />
    <line x1="38" y1="35" x2="38" y2="70" stroke="#69BD45" stroke-width="2" />
    <line x1="55" y1="35" x2="55" y2="70" stroke="#69BD45" stroke-width="2" />
    <text x="37.5" y="-10" font-family="sans-serif" font-size="9" font-weight="black" fill="#ffffff" text-anchor="middle">AC Loads MDB</text>
    <text x="37.5" y="80" font-family="monospace" font-size="7" fill="#94a3b8" text-anchor="middle" font-weight="bold">Distribution</text>
  </g>

  <!-- Connection: MDB to Consumer Circuits -->
  <line x1="675" y1="125" x2="730" y2="125" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
  <text x="750" y="128" font-family="sans-serif" font-size="9" font-weight="bold" fill="#ffffff">Home</text>

  <!-- ==================== GRID CONNECT ==================== -->
  <!-- Connection: Inverter UP to Utility Grid -->
  <line x1="400" y1="80" x2="400" y2="40" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3,3" />
  <line x1="400" y1="40" x2="460" y2="40" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="3,3" marker-end="url(#arrow)" />
  <g transform="translate(465, 25)">
    <!-- Grid Utility Pole Symbol -->
    <rect x="0" y="0" width="40" height="30" fill="none" stroke="#94a3b8" stroke-width="0" />
    <line x1="10" y1="5" x2="10" y2="30" stroke="#94a3b8" stroke-width="1.5" />
    <line x1="5" y1="10" x2="15" y2="10" stroke="#94a3b8" stroke-width="1.5" />
    <line x1="0" y1="18" x2="20" y2="18" stroke="#94a3b8" stroke-width="1.5" />
    <text x="24" y="20" font-family="sans-serif" font-size="8.5" font-weight="bold" fill="#64748b">Grid</text>
  </g>

  <!-- ==================== GROUNDING EARTH ELECTRODE ==================== -->
  <line x1="637" y1="170" x2="637" y2="240" stroke="#69BD45" stroke-width="1.5" stroke-dasharray="2,2" />
  <g transform="translate(627, 240)">
    <!-- Grounding Symbol -->
    <line x1="0" y1="5" x2="20" y2="5" stroke="#69BD45" stroke-width="2" />
    <line x1="3" y1="10" x2="17" y2="10" stroke="#69BD45" stroke-width="2" />
    <line x1="6" y1="15" x2="14" y2="15" stroke="#69BD45" stroke-width="2" />
    <line x1="9" y1="20" x2="11" y2="20" stroke="#69BD45" stroke-width="2" />
    <text x="10" y="32" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="#64748b" text-anchor="middle">EARTH</text>
  </g>

</svg>
`;

  return svg.trim();
}
