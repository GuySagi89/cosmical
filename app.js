// ── Star field ──────────────────────────────────────────────────

(function () {
  const canvas = document.getElementById('stars-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLORS = ['#ffffff', '#ffffff', '#ffffff', '#cce8ff', '#fffbe0', '#ddd0ff'];

  const SILLY_NAMES = [
    'The Drowsy Kettle',        "Philosopher's Thumb",       'Biscuit Minor',
    'The Persistent Noodle',    'The Upside-Down Umbrella',  'The Confused Spatula',
    'Great Sock of the North',  'The Anxious Penguin',       'Mrs Flibbertigibbet',
    'The Wobbly Accordion',     'The Reluctant Trapezoid',   'Donut of Orion',
    'The Forgotten Spoon',      "Captain Biscuit's Belt",    'The Melancholy Hamster',
    'The Overzealous Teapot',   "Schrödinger's Mitten",      'The Tipsy Flamingo',
    'The Bewildered Zucchini',  'Baron Von Fluffington',     'The Accidental Rhombus',
    'The Perpetual Hiccup',     'The Soggy Pretzel',         'The Indecisive Blancmange',
    'The Mysterious Courgette', 'The Reluctant Waltz',       'The Overenthusiastic Snail',
    "Aunt Mildred's Elbow",     'The Philosophical Pickle',  'The Wistful Ladle',
    'The Sneezing Cormorant',   'The Slightly Damp Wizard',  'The Optimistic Crumpet',
    "The Bewildered Archipelago","Uncle Norbert's Sideburn", 'The Galactic Croissant',
    'The Hesitant Trapeze Artist','Madame Wobblebottom',     'The Cosmic Ketchup Bottle',
    'The Nervous Cauliflower',  'The Magnificent Dressing Gown','The Inconclusive Badminton',
    'Reggie the Oblong',        'The Solemn Digestive',      'The Napping Gondolier',
    'The Pensive Kipper',       'The Philosophical Baguette','The Wandering Clog',
    'The Startled Bureaucrat',  'The Dignified Casserole',   'The Perplexed Mandolin',
    'Sir Wobbles a Lot',        'The Timid Pretzel',         'The Existential Waffle',
    'The Muttering Almanac',    'The Chronic Ditherer',      'The Enthusiastic Potato',
    'The Brooding Marmalade',   'The Accidental Maestro',    'The Exasperated Monocle',
    'The Cosmic Oven Mitt',     'The Loitering Syllabub',    'The Oblong Conspiracy',
    'The Disgruntled Accordion','The Snoring Bureaucrat',    "Professor Noodle's Paradox",
    'The Interminable Crouton', 'The Lurching Almanac',      'The Indignant Plunger',
    'The Sentimental Crumpet',  'The Majestic Toadstool',    'The Stuttering Vortex',
    'The Apologetic Nebula',    'The Forgotten Semicolon',   'The Wheezing Contraption',
    'The Dignified Fumble',     'The Galactic Macaron',      'The Solemn Wobble',
    'The Ambitious Sock Drawer','The Bewildered Quiche',     'The Trembling Hypothesis',
    'Countess Bumbersnatch',    'The Meandering Tuba',       'The Cosmic Hiccup Minor',
    'The Philosophical Spanner','The Timid Nebula',          'The Pensive Shoelace',
    'The Reclusive Fondue',     'The Spectacular Anticlimax','The Languishing Obelisk',
    'The Glum Croissant',       'The Restless Semicolon',    'The Ponderous Blancmange',
    'The Indecisive Vortex',    'Brigadier Fluffington',     'The Cosmic Dressing Gown',
    'The Confused Meridian',    'The Melancholy Trapezoid',  'The Oscillating Biscuit Tin',
    'The Magnificent Kerfuffle', 'Elkabetzium Supreme', 'Eladilolo Major', 'Fredul Minor',
  ];

  // ── Constellation geometry constants ─────────────────────────────────────────
  const ZONE_PAD_X       = 0.12;  // horizontal inner-margin as fraction of zone width
  const ZONE_PAD_Y       = 0.10;  // vertical inner-margin as fraction of zone height
  const CLUSTER_R_MIN    = 0.055; // minimum cluster radius (fraction of min screen dimension)
  const CLUSTER_R_RNG    = 0.055; // random range added to CLUSTER_R_MIN
  const CLUSTER_TRIES    = 150;   // max attempts to find a valid cluster centre
  const MIN_STAR_SEP     = 0.022; // minimum separation between stars (fraction of screen)
  const STAR_CNT_MIN     = 4;     // fewest stars per constellation
  const STAR_CNT_RNG     = 4;     // added random count — gives range 4–7
  const BG_STAR_COUNT    = 210;   // non-constellation background stars
  const EXCL_RADIUS_MAX  = 340;   // hard cap on globe exclusion zone (px)
  const EXCL_RADIUS_FRAC = 0.40;  // exclusion zone as fraction of min screen dimension

  // 3×2 grid — tablet/desktop
  const ZONES = [
    [0.00, 0.00, 0.33, 0.50],
    [0.33, 0.00, 0.67, 0.50],
    [0.67, 0.00, 1.00, 0.50],
    [0.00, 0.50, 0.33, 1.00],
    [0.33, 0.50, 0.67, 1.00],
    [0.67, 0.50, 1.00, 1.00],
  ];

  // 2×2 grid — mobile (fewer, larger zones so clusters fit inside)
  const ZONES_MOBILE = [
    [0.00, 0.00, 0.50, 0.50],
    [0.50, 0.00, 1.00, 0.50],
    [0.00, 0.50, 0.50, 1.00],
    [0.50, 0.50, 1.00, 1.00],
  ];

  function cross2D(ax, ay, bx, by) { return ax * by - ay * bx; }

  // True iff segment (pts[a]–pts[b]) properly crosses (pts[c]–pts[d]).
  // Shared endpoints are never counted as crossings.
  function segsCross(pts, a, b, c, d) {
    if (a === c || a === d || b === c || b === d) return false;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const [cx, cy] = pts[c], [dx, dy] = pts[d];
    const d1 = cross2D(dx - cx, dy - cy, ax - cx, ay - cy);
    const d2 = cross2D(dx - cx, dy - cy, bx - cx, by - cy);
    const d3 = cross2D(bx - ax, by - ay, cx - ax, cy - ay);
    const d4 = cross2D(bx - ax, by - ay, dx - ax, dy - ay);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  function buildNonCrossingChain(pts, maxEdge = Infinity) {
    if (pts.length <= 1) return [];
    const visited = new Set([0]);
    const edges   = [];
    let   current = 0;

    while (visited.size < pts.length) {
      let bestDist = Infinity, bestNext = -1;
      for (let b = 0; b < pts.length; b++) {
        if (visited.has(b)) continue;
        const d = Math.hypot(pts[current][0] - pts[b][0], pts[current][1] - pts[b][1]);
        if (d >= bestDist || d > maxEdge) continue;
        if (edges.every(([u, v]) => !segsCross(pts, current, b, u, v))) {
          bestDist = d; bestNext = b;
        }
      }
      if (bestNext === -1) break;
      edges.push([current, bestNext]);
      visited.add(bestNext);
      current = bestNext;
    }

    return edges;
  }

  // Add one closing edge to create a loop with an open tail.
  // Tail nodes must lie on the EXTERIOR side of the closing edge — prevents
  // tails from visually entering the closed shape.
  function addTailLoop(pts, chainEdges) {
    if (chainEdges.length < 3) return [...chainEdges];

    const order = [chainEdges[0][0], ...chainEdges.map(e => e[1])];
    const n = order.length;

    const candidates = [];
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue; // full closure — no tail

        const pi = order[i], pj = order[j];
        if (!chainEdges.every(([u, v]) => !segsCross(pts, pi, pj, u, v))) continue;

        const [ax, ay] = pts[pi], [bx, by] = pts[pj];
        const midIdx = order[Math.floor((i + j) / 2)];
        const [mx, my] = pts[midIdx];
        const loopSide = cross2D(bx - ax, by - ay, mx - ax, my - ay);
        if (loopSide === 0) continue;

        let ok = true;
        if (i > 0) {
          const [tx, ty] = pts[order[i - 1]];
          if (cross2D(bx - ax, by - ay, tx - ax, ty - ay) * loopSide > 0) ok = false;
        }
        if (ok && j < n - 1) {
          const [tx, ty] = pts[order[j + 1]];
          if (cross2D(bx - ax, by - ay, tx - ax, ty - ay) * loopSide > 0) ok = false;
        }
        if (!ok) continue;

        const bothInterior = i > 0 && j < n - 1;
        const d = Math.hypot(pts[pi][0] - pts[pj][0], pts[pi][1] - pts[pj][1]);
        candidates.push({ pi, pj, d, bothInterior });
      }
    }

    if (candidates.length === 0) return [...chainEdges];

    candidates.sort((a, b) =>
      a.bothInterior !== b.bothInterior ? (a.bothInterior ? -1 : 1) : a.d - b.d
    );

    const { pi, pj } = candidates[0];
    return [...chainEdges, [pi, pj]];
  }

  function generateConstellationInZone([x0, y0, x1, y1]) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const exclPx = Math.min(EXCL_RADIUS_MAX, Math.min(vw, vh) * EXCL_RADIUS_FRAC);

    const pw = x1 - x0, ph = y1 - y0;
    const ix0 = x0 + pw * ZONE_PAD_X, ix1 = x1 - pw * ZONE_PAD_X;
    const iy0 = y0 + ph * ZONE_PAD_Y, iy1 = y1 - ph * ZONE_PAD_Y;

    const clusterR = CLUSTER_R_MIN + Math.random() * CLUSTER_R_RNG;
    let clusterX, clusterY, centerFound = false;
    for (let a = 0; a < CLUSTER_TRIES; a++) {
      const cx = ix0 + Math.random() * (ix1 - ix0);
      const cy = iy0 + Math.random() * (iy1 - iy0);
      const dx = (cx - 0.5) * vw, dy = (cy - 0.5) * vh;
      if (Math.hypot(dx, dy) >= exclPx + clusterR * Math.min(vw, vh)) {
        clusterX = cx; clusterY = cy; centerFound = true; break;
      }
    }
    if (!centerFound) return null;

    const startAngle = Math.random() * Math.PI * 2;
    const startR     = clusterR * 0.3 + Math.random() * clusterR * 0.7;
    const pts = [[
      Math.max(ix0, Math.min(ix1, clusterX + Math.cos(startAngle) * startR)),
      Math.max(iy0, Math.min(iy1, clusterY + Math.sin(startAngle) * startR)),
    ]];

    const starCount = STAR_CNT_MIN + Math.floor(Math.random() * STAR_CNT_RNG);

    for (let attempts = 0; pts.length < starCount && attempts < 500; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.random() * clusterR;
      const x = clusterX + Math.cos(angle) * r;
      const y = clusterY + Math.sin(angle) * r;
      if (x < ix0 || x > ix1 || y < iy0 || y > iy1) continue;
      const dx = (x - 0.5) * vw, dy = (y - 0.5) * vh;
      if (Math.hypot(dx, dy) < exclPx) continue;
      if (pts.every(([px, py]) => Math.hypot(x - px, y - py) >= MIN_STAR_SEP)) {
        pts.push([x, y]);
      }
    }

    if (pts.length < 2) return null;

    const chain = buildNonCrossingChain(pts, clusterR * 2.0);
    const edges = addTailLoop(pts, chain);
    return { pts, edges };
  }

  function generateSessionDefs() {
    const vmin = Math.min(window.innerWidth, window.innerHeight);
    const zones = vmin < 600 ? ZONES_MOBILE : ZONES;
    const count = vmin < 600 ? 3 : vmin >= 900 ? 6 : 5;

    const defs = [];
    for (const zone of zones.slice().sort(() => Math.random() - 0.5)) {
      if (defs.length >= count) break;
      const def = generateConstellationInZone(zone);
      if (def) defs.push(def);
    }
    return defs;
  }

  let sessionDefs, sessionNames;
  let bgStars = [], conStars = [], constellations = [], shooting = null;
  let rafId = null, shootTimer = null, active = false, t = 0, lastTimestamp = null;
  let bgGrad = null, neb1 = null, neb2 = null, neb3 = null;
  let mouseX = -1, mouseY = -1;
  let blackHole = null;
  let dyingBlackHoles = [];
  let spaceship = null;
  let smokeParticles = [];
  let comets  = [];

  function buildBackground() {
    bgGrad = ctx.createRadialGradient(
      canvas.width * 0.45, 0, 0,
      canvas.width * 0.5, canvas.height * 0.6, Math.max(canvas.width, canvas.height) * 1.2
    );
    bgGrad.addColorStop(0,    '#1c0a3a');
    bgGrad.addColorStop(0.35, '#0d0d1e');
    bgGrad.addColorStop(0.75, '#07070f');
    bgGrad.addColorStop(1,    '#030308');

    neb1 = ctx.createRadialGradient(
      canvas.width * 0.72, canvas.height * 0.28, 0,
      canvas.width * 0.72, canvas.height * 0.28, canvas.width * 0.5
    );
    neb1.addColorStop(0,   'rgba(110,20,170,0.38)');
    neb1.addColorStop(0.4, 'rgba(70,10,120,0.18)');
    neb1.addColorStop(1,   'rgba(0,0,0,0)');

    neb2 = ctx.createRadialGradient(
      canvas.width * 0.18, canvas.height * 0.72, 0,
      canvas.width * 0.18, canvas.height * 0.72, canvas.width * 0.42
    );
    neb2.addColorStop(0,   'rgba(15,65,160,0.30)');
    neb2.addColorStop(0.4, 'rgba(10,45,110,0.14)');
    neb2.addColorStop(1,   'rgba(0,0,0,0)');

    neb3 = ctx.createRadialGradient(
      canvas.width * 0.48, canvas.height * 0.85, 0,
      canvas.width * 0.48, canvas.height * 0.85, canvas.width * 0.38
    );
    neb3.addColorStop(0,   'rgba(160,20,90,0.22)');
    neb3.addColorStop(0.5, 'rgba(90,10,55,0.10)');
    neb3.addColorStop(1,   'rgba(0,0,0,0)');
  }

  function buildStars() {
    bgStars = Array.from({ length: BG_STAR_COUNT }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() ** 1.4 * 1.7 + 0.3,
      base:  Math.random() * 0.55 + 0.3,
      amp:   Math.random() * 0.28 + 0.05,
      freq:  Math.random() * 0.5 + 0.15,
      phase: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    conStars = [];
    constellations = sessionDefs.map((def, ci) => {
      const indices = def.pts.map(([fx, fy]) => {
        const idx = conStars.length;
        conStars.push({
          x:     fx * canvas.width,
          y:     fy * canvas.height,
          r:     0.85 + Math.random() * 0.55,
          base:  0.62,
          amp:   0.22,
          freq:  0.08 + Math.random() * 0.14,
          phase: Math.random() * Math.PI * 2,
          color: '#cce8ff',
        });
        return idx;
      });
      return {
        name:       sessionNames[ci],
        edges:      def.edges,
        indices,
        hoverAlpha: 0,
        flashAlpha: 0,
        flashing:   false,
        flashP:     0,
        nextFlash:  ci * 1.8 + 1.5 + Math.random() * 4,
      };
    });
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    buildBackground();
    buildStars();
  }

  function spawnShooting() {
    if (shooting) return;
    const angle = Math.PI * 0.3 + (Math.random() - 0.5) * 0.7;
    const speed = 7 + Math.random() * 5;
    shooting = {
      x:    -20 + Math.random() * canvas.width * 0.55,
      y:    Math.random() * canvas.height * 0.45,
      dx:   Math.cos(angle),
      dy:   Math.sin(angle),
      speed,
      tail: 90 + Math.random() * 70,
      life: 1.0,
    };
  }

  function scheduleNext() {
    shootTimer = setTimeout(() => {
      if (active) { spawnShooting(); scheduleNext(); }
    }, 5000 + Math.random() * 8000);
  }

  function findHoveredCon() {
    if (mouseX < 0 || mouseY < 0) return -1;
    const threshold = Math.max(42, canvas.width * 0.028);
    for (let ci = 0; ci < constellations.length; ci++) {
      for (const idx of constellations[ci].indices) {
        if (Math.hypot(conStars[idx].x - mouseX, conStars[idx].y - mouseY) < threshold) return ci;
      }
    }
    return -1;
  }

  function drawTooltip(text, x, y, alpha) {
    const pad = 14, h = 28;
    ctx.save();
    ctx.font = 'italic 13px Georgia, "Times New Roman", serif';
    const tw = ctx.measureText(text).width;
    const bw = tw + pad * 2;
    const bx = Math.max(6, Math.min(canvas.width - bw - 6, x - bw / 2));
    const by = Math.max(6, y - h - 14);
    const r  = h / 2;

    ctx.globalAlpha = alpha * 0.30;
    ctx.shadowColor = 'rgba(150, 175, 255, 1)';
    ctx.shadowBlur  = 16;
    ctx.fillStyle   = 'rgba(110, 140, 255, 0.18)';
    ctx.beginPath();
    ctx.roundRect(bx - 6, by - 6, bw + 12, h + 12, r + 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.globalAlpha = alpha * 0.92;
    ctx.fillStyle   = 'rgba(7, 4, 26, 0.86)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, h, r);
    ctx.fill();

    ctx.strokeStyle = 'rgba(165, 190, 255, 0.45)';
    ctx.lineWidth   = 0.9;
    ctx.stroke();

    ctx.globalAlpha  = alpha;
    ctx.fillStyle    = 'rgba(215, 228, 255, 0.97)';
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + pad, by + h / 2);
    ctx.restore();
  }

  function spawnBlackHole(x, y) {
    if (blackHole) {
      blackHole.age = blackHole.maxAge * 0.92;
      if (!blackHole.explodeFired) {
        window.dispatchEvent(new CustomEvent('blackhole-explode', { detail: { x: blackHole.x, y: blackHole.y } }));
        blackHole.explodeFired = true;
      }
      dyingBlackHoles.push(blackHole);
    }
    blackHole = { x, y, baseRadius: 28, age: 0, maxAge: 5.5, rotation: 0, explodeFired: false };
  }
  window.spawnBlackHole = spawnBlackHole;

  // Returns the apparent (lensed) screen position of a star near the black hole,
  // or null if it has crossed the event horizon and should not be drawn.
  // Uses simplified Schwarzschild angular deflection: Δθ = (rs/d)^1.5
  function lensedPos(sx, sy, bh) {
    const frac     = bh.age / bh.maxAge;
    const bhAlpha  = frac < 0.05 ? frac / 0.05
                   : frac > 0.92 ? (1 - (frac - 0.92) / 0.08)
                   : 1;
    const evapFrac = Math.max(0, (frac - 0.92) / 0.08);
    const rs       = bh.baseRadius * Math.max(0.05, 1 - evapFrac * 0.9);

    const dx = sx - bh.x, dy = sy - bh.y;
    const d  = Math.hypot(dx, dy);
    if (d > bh.baseRadius * 22) return { x: sx, y: sy }; // beyond lens radius
    if (d < rs) return null;
    if (d === 0) return { x: sx, y: sy };

    const ratio    = rs / d;
    // Angular: Schwarzschild bending + differential frame-dragging (inner rotates faster)
    const deflect  = Math.pow(ratio, 1.5) * bhAlpha;
    const orbit    = bh.rotation * ratio * ratio * bhAlpha;
    // Radial inward compression — stars appear pulled toward the BH, strongest up close,
    // fading with distance so the gradient from heavy warp to subtle warp is clearly visible
    const compress = Math.pow(ratio, 1.5) * 0.32 * bhAlpha;
    const newD     = d * (1 - compress);

    const θ = Math.atan2(dy, dx);
    return {
      x: bh.x + newD * Math.cos(θ + deflect + orbit),
      y: bh.y + newD * Math.sin(θ + deflect + orbit),
    };
  }

  function applyAllLensing(sx, sy) {
    let pos = { x: sx, y: sy };
    for (const bh of dyingBlackHoles) {
      const p = lensedPos(pos.x, pos.y, bh);
      if (!p) return null;
      pos = p;
    }
    if (blackHole) {
      const p = lensedPos(pos.x, pos.y, blackHole);
      if (!p) return null;
      pos = p;
    }
    return pos;
  }

  function screenEdgeDist(bh) {
    return Math.max(
      Math.hypot(bh.x,                  bh.y),
      Math.hypot(canvas.width - bh.x,   bh.y),
      Math.hypot(bh.x,                  canvas.height - bh.y),
      Math.hypot(canvas.width - bh.x,   canvas.height - bh.y)
    );
  }

  function drawBlackHole(bh) {
    const frac     = bh.age / bh.maxAge;
    const bhAlpha  = frac < 0.05 ? frac / 0.05
                   : frac > 0.92 ? (1 - (frac - 0.92) / 0.08)
                   : 1;
    const evapFrac = Math.max(0, (frac - 0.92) / 0.08);
    const rs       = bh.baseRadius * Math.max(0.05, 1 - evapFrac * 0.9);

    ctx.save();
    ctx.globalAlpha = bhAlpha;

    // ── Gravitational shadow ──────────────────────────────────────────────────
    // Darkens the region around the singularity so the vortex reads as a void
    const shadow = ctx.createRadialGradient(bh.x, bh.y, rs, bh.x, bh.y, rs * 13);
    shadow.addColorStop(0,    'rgba(0, 0,  0, 0.80)');
    shadow.addColorStop(0.12, 'rgba(2, 0,  8, 0.50)');
    shadow.addColorStop(0.40, 'rgba(4, 0, 12, 0.20)');
    shadow.addColorStop(1,    'rgba(0, 0,  0, 0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, rs * 13, 0, Math.PI * 2);
    ctx.fill();

    // ── Event horizon rim ─────────────────────────────────────────────────────
    // Thin purple-white edge gives the singularity a crisp, defined boundary
    ctx.save();
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, rs * 1.02, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(190, 160, 255, ${0.22 + evapFrac * 0.78})`;
    ctx.lineWidth   = 0.7 + evapFrac * 3.5;
    ctx.shadowColor = 'rgba(180, 150, 255, 1)';
    ctx.shadowBlur  = 5 + evapFrac * 28;
    ctx.stroke();
    ctx.restore();

    // ── Evaporation explosion ─────────────────────────────────────────────────
    if (evapFrac > 0) {
      const maxR = screenEdgeDist(bh);

      // Nova flash — radial flood of light, peaks at mid-evaporation then fades
      const flashPeak = Math.sin(evapFrac * Math.PI);
      if (flashPeak > 0.01) {
        const flash = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, rs * 14);
        flash.addColorStop(0,    `rgba(255, 255, 255, ${flashPeak * 0.65})`);
        flash.addColorStop(0.08, `rgba(210, 175, 255, ${flashPeak * 0.40})`);
        flash.addColorStop(0.30, `rgba(130,  90, 255, ${flashPeak * 0.14})`);
        flash.addColorStop(1,    'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flash;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, rs * 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // Primary shockwave — ease-out so it bursts fast then slows to screen edge
      const easeOut = t => 1 - Math.pow(1 - t, 3);
      const wave1R = easeOut(evapFrac) * maxR;
      ctx.save();
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, rs + wave1R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(220, 190, 255, ${(1 - evapFrac) * 0.75})`;
      ctx.lineWidth   = 4 * (1 - evapFrac) + 0.5;
      ctx.shadowColor = 'rgba(210, 180, 255, 1)';
      ctx.shadowBlur  = 30;
      ctx.stroke();
      ctx.restore();

      // Secondary shockwave — launches slightly later, slower, dimmer
      if (evapFrac > 0.18) {
        const w2f  = (evapFrac - 0.18) / 0.82;
        const wave2R = easeOut(w2f) * maxR * 0.74;
        ctx.save();
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, rs + wave2R, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(180, 140, 255, ${(1 - w2f) * 0.45})`;
        ctx.lineWidth   = 2.5 * (1 - w2f) + 0.3;
        ctx.shadowColor = 'rgba(180, 140, 255, 1)';
        ctx.shadowBlur  = 18;
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Event horizon disc ────────────────────────────────────────────────────
    ctx.shadowBlur = 0;
    ctx.fillStyle  = '#000000';
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, rs, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function checkBHWave(bh) {
    const frac     = bh.age / bh.maxAge;
    const evapFrac = Math.max(0, (frac - 0.92) / 0.08);
    if (evapFrac <= 0) return;
    if (!bh.waveHits) bh.waveHits = new Set();

    const rs      = bh.baseRadius * Math.max(0.05, 1 - evapFrac * 0.9);
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const maxR    = screenEdgeDist(bh);
    const waveR   = rs + easeOut(evapFrac) * maxR;

    // Globe — fire once when the ring crosses the near surface edge
    if (!bh.waveHits.has('globe')) {
      const globeEl = document.getElementById('globe-canvas');
      if (globeEl) {
        const gr     = globeEl.getBoundingClientRect();
        const gcx    = gr.left + gr.width  / 2;
        const gcy    = gr.top  + gr.height / 2;
        const globeR = gr.width * 0.22;
        const dist   = Math.hypot(bh.x - gcx, bh.y - gcy);
        if (waveR >= dist - globeR) {
          bh.waveHits.add('globe');
          const nx   = dist > 0 ? (gcx - bh.x) / dist : 1;
          const ny   = dist > 0 ? (gcy - bh.y) / dist : 0;
          // Impact point = globe surface nearest to BH
          const impX = gcx - nx * globeR;
          const impY = gcy - ny * globeR;
          if (window.triggerGlobeRipple) window.triggerGlobeRipple(impX, impY);
        }
      }
    }

    // Spaceship — destroy when wave reaches it
    if (!bh.waveHits.has('spaceship') && spaceship && !spaceship.exploding) {
      if (waveR >= Math.hypot(bh.x - spaceship.x, bh.y - spaceship.y)) {
        bh.waveHits.add('spaceship');
        triggerShipExplosion();
      }
    }

    // Comets — blast each one the wave crosses
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      if (waveR >= Math.hypot(bh.x - c.x, bh.y - c.y) - 8) {
        blastComet(c, bh.x, bh.y);
        comets.splice(i, 1);
      }
    }
  }

  // ── Spaceship ────────────────────────────────────────────────────
  function lerpAngle(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d >  Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * Math.min(1, t);
  }

  function emitSmoke() {
    if (!spaceship) return;
    const bx = -Math.sin(spaceship.angle); // backward unit vector
    const by =  Math.cos(spaceship.angle);
    const rx = spaceship.x + bx * 12 + (Math.random() - 0.5) * 3;
    const ry = spaceship.y + by * 12 + (Math.random() - 0.5) * 3;
    const spread = (Math.random() - 0.5) * 0.65;
    const cs = Math.cos(spread), ss = Math.sin(spread);
    const speed = 32 + Math.random() * 35;
    const maxLife = 0.50 + Math.random() * 0.35;
    smokeParticles.push({
      x: rx, y: ry,
      vx: (bx * cs - by * ss) * speed + spaceship.vx * 0.12,
      vy: (bx * ss + by * cs) * speed + spaceship.vy * 0.12,
      life: maxLife,
      maxLife,
      r: 2.5 + Math.random() * 2.5,
      core: Math.random() < 0.45,
    });
  }

  function updateSpaceship(dt) {
    if (!spaceship) return;

    if (spaceship.exploding) {
      spaceship.explodeAge += dt;
      spaceship.alpha = Math.max(0, 1 - spaceship.explodeAge / (spaceship.explodeMaxAge * 0.28));
      spaceship.vx *= Math.pow(0.95, dt * 60);
      spaceship.vy *= Math.pow(0.95, dt * 60);
      spaceship.x  += spaceship.vx * dt;
      spaceship.y  += spaceship.vy * dt;
      if (spaceship.explodeAge >= spaceship.explodeMaxAge) spaceship = null;
      return;
    }

    if (spaceship.swirl) {
      const sw = spaceship.swirl;
      sw.age += dt;
      const frac = sw.age / sw.maxAge;
      if (frac >= 1) { spaceship = null; return; }
      const r     = sw.r * Math.pow(1 - frac, 0.65);
      sw.angle   += (3 + frac * 10) * dt;
      spaceship.x     = sw.bh.x + Math.cos(sw.angle) * r;
      spaceship.y     = sw.bh.y + Math.sin(sw.angle) * r;
      spaceship.angle = sw.angle + Math.PI / 2;
      spaceship.alpha = 1 - Math.pow(frac, 0.6);
      return;
    }

    if (spaceship.active) {
      const dx = spaceship.targetX - spaceship.x;
      const dy = spaceship.targetY - spaceship.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const gain = 28;
        spaceship.vx += (dx / dist) * Math.min(dist, 160) * gain * dt;
        spaceship.vy += (dy / dist) * Math.min(dist, 160) * gain * dt;
      }
    }

    // Speed cap
    const speed = Math.hypot(spaceship.vx, spaceship.vy);
    if (speed > 520) { spaceship.vx = spaceship.vx / speed * 520; spaceship.vy = spaceship.vy / speed * 520; }

    // Drag — lighter when active so momentum carries through turns
    const drag = Math.pow(spaceship.active ? 0.97 : 0.96, dt * 60);
    spaceship.vx *= drag;
    spaceship.vy *= drag;

    // Integrate
    spaceship.x += spaceship.vx * dt;
    spaceship.y += spaceship.vy * dt;

    const spd = Math.hypot(spaceship.vx, spaceship.vy);
    if (spd > 12) {
      spaceship.angle = lerpAngle(spaceship.angle, Math.atan2(spaceship.vy, spaceship.vx) + Math.PI / 2, Math.min(1, dt * 14));
    }

    // Exhaust smoke
    if (spd > 25 && smokeParticles.length < 300) {
      spaceship.emitAccum += dt * (spd / 80) * 60;
      while (spaceship.emitAccum >= 1) { emitSmoke(); spaceship.emitAccum--; }
    }

    // Bounce cooldown (gates effects only — not the hard boundary)
    if (spaceship.bounceCD > 0) spaceship.bounceCD -= dt;

    // Globe solid boundary
    const globeEl = document.getElementById('globe-canvas');
    if (globeEl) {
      const gr     = globeEl.getBoundingClientRect();
      const gcx    = gr.left + gr.width  / 2;
      const gcy    = gr.top  + gr.height / 2;
      const globeR = gr.width * 0.22;
      const bdx    = spaceship.x - gcx, bdy = spaceship.y - gcy;
      const bdist  = Math.hypot(bdx, bdy);
      if (bdist < globeR + 8) {
        const nx  = bdx / (bdist || 1), ny = bdy / (bdist || 1);
        // Always push position to surface
        spaceship.x = gcx + nx * (globeR + 8);
        spaceship.y = gcy + ny * (globeR + 8);
        const dot = spaceship.vx * nx + spaceship.vy * ny;
        if (spaceship.bounceCD <= 0) {
          // First contact: full reflection + effects
          if (dot < 0) {
            const inVx = spaceship.vx, inVy = spaceship.vy;
            spaceship.vx = (spaceship.vx - 2 * dot * nx) * 0.65;
            spaceship.vy = (spaceship.vy - 2 * dot * ny) * 0.65;
            spawnImpactDebris(spaceship.x, spaceship.y);
            window.dispatchEvent(new CustomEvent('comet-globe-impact',
              { detail: { x: spaceship.x, y: spaceship.y, vx: inVx, vy: inVy, source: 'spaceship' } }));
            spaceship.hits++;
            if (spaceship.hits >= 10) triggerShipExplosion();
          }
          spaceship.bounceCD = 0.5;
        } else if (dot < 0) {
          // Sustained contact: strip the inward component so drag can't push through
          spaceship.vx -= dot * nx;
          spaceship.vy -= dot * ny;
        }
      }
    }

    // Moon solid boundary
    if (window.getMoonScreenPos) {
      const m     = window.getMoonScreenPos();
      const bdx   = spaceship.x - m.x, bdy = spaceship.y - m.y;
      const bdist = Math.hypot(bdx, bdy);
      if (bdist < m.r + 8) {
        const nx  = bdx / (bdist || 1), ny = bdy / (bdist || 1);
        spaceship.x = m.x + nx * (m.r + 8);
        spaceship.y = m.y + ny * (m.r + 8);
        const dot = spaceship.vx * nx + spaceship.vy * ny;
        if (spaceship.bounceCD <= 0) {
          if (dot < 0) {
            const inVx = spaceship.vx, inVy = spaceship.vy;
            spaceship.vx = (spaceship.vx - 2 * dot * nx) * 0.65;
            spaceship.vy = (spaceship.vy - 2 * dot * ny) * 0.65;
            spawnImpactDebris(spaceship.x, spaceship.y);
            window.dispatchEvent(new CustomEvent('comet-moon-impact',
              { detail: { vx: inVx, vy: inVy, source: 'spaceship' } }));
            spaceship.hits++;
            if (spaceship.hits >= 10) triggerShipExplosion();
          }
          spaceship.bounceCD = 0.5;
        } else if (dot < 0) {
          spaceship.vx -= dot * nx;
          spaceship.vy -= dot * ny;
        }
      }
    }

    // Enter BH swirl once inside the dark shadow zone
    const allBHsShip = blackHole ? [blackHole, ...dyingBlackHoles] : [...dyingBlackHoles];
    for (const bh of allBHsShip) {
      const dx = bh.x - spaceship.x, dy = bh.y - spaceship.y;
      const d  = Math.hypot(dx, dy);
      if (d < bh.baseRadius * 3) {
        spaceship.swirl  = { bh, angle: Math.atan2(spaceship.y - bh.y, spaceship.x - bh.x), r: Math.max(d, 5), age: 0, maxAge: 0.9 };
        spaceship.active = false;
        break;
      }
    }

    if (!spaceship.active) {
      spaceship.alpha = Math.max(0, spaceship.alpha - dt * 1.3);
      if (spaceship.alpha <= 0) { spaceship = null; return; }
    }
  }

  function updateSmoke(dt) {
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
      const p = smokeParticles[i];
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vx *= Math.pow(0.88, dt * 60);
      p.vy *= Math.pow(0.88, dt * 60);
      p.life -= dt;
      if (p.life <= 0) smokeParticles.splice(i, 1);
    }
  }

  function drawSmoke() {
    if (!smokeParticles.length) return;
    ctx.save();
    smokeParticles.forEach(p => {
      const frac  = 1 - p.life / p.maxLife;
      const alpha = (p.life / p.maxLife) * (p.core ? 0.78 : 0.48);
      const r     = Math.max(0.01, p.r * (1 + frac * 2.8));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      if (p.comet) {
        g.addColorStop(0,   `rgba(180, 240, 255, ${alpha})`);
        g.addColorStop(0.4, `rgba(80,  180, 255, ${alpha * 0.45})`);
        g.addColorStop(1,   'rgba(20, 80, 200, 0)');
      } else if (p.core) {
        g.addColorStop(0,    `rgba(218, 198, 255, ${alpha})`);
        g.addColorStop(0.35, `rgba(158, 112, 255, ${alpha * 0.50})`);
        g.addColorStop(1,    'rgba(88, 48, 200, 0)');
      } else {
        g.addColorStop(0,    `rgba(128, 88, 228, ${alpha})`);
        g.addColorStop(0.5,  `rgba(78, 50, 178, ${alpha * 0.35})`);
        g.addColorStop(1,    'rgba(38, 18, 118, 0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawSpaceship() {
    if (!spaceship) return;
    ctx.save();

    if (spaceship.exploding) {
      const prog    = spaceship.explodeAge / spaceship.explodeMaxAge;
      const easeOut = t => 1 - Math.pow(1 - t, 3);

      // Broad radial flash
      const flashPeak = Math.sin(prog * Math.PI);
      if (flashPeak > 0.01) {
        const flash = ctx.createRadialGradient(spaceship.x, spaceship.y, 0, spaceship.x, spaceship.y, 145);
        flash.addColorStop(0,    `rgba(255, 252, 255, ${flashPeak * 0.98})`);
        flash.addColorStop(0.06, `rgba(255, 215, 255, ${flashPeak * 0.74})`);
        flash.addColorStop(0.22, `rgba(175,  95, 255, ${flashPeak * 0.40})`);
        flash.addColorStop(0.55, `rgba(100,  45, 200, ${flashPeak * 0.16})`);
        flash.addColorStop(1,    'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flash;
        ctx.beginPath();
        ctx.arc(spaceship.x, spaceship.y, 145, 0, Math.PI * 2);
        ctx.fill();
      }

      // Primary shockwave ring
      const wave1R = easeOut(prog) * 230;
      ctx.beginPath();
      ctx.arc(spaceship.x, spaceship.y, wave1R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(230, 200, 255, ${(1 - prog) * 0.92})`;
      ctx.lineWidth   = 5.5 * (1 - prog) + 0.4;
      ctx.shadowColor = 'rgba(215, 180, 255, 1)';
      ctx.shadowBlur  = 32;
      ctx.stroke();
      ctx.shadowBlur  = 0;

      // Secondary shockwave — launches slightly after primary, stays smaller
      if (prog > 0.12) {
        const p2     = (prog - 0.12) / 0.88;
        const wave2R = easeOut(p2) * 165;
        ctx.beginPath();
        ctx.arc(spaceship.x, spaceship.y, wave2R, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200, 158, 255, ${(1 - p2) * 0.58})`;
        ctx.lineWidth   = 3.2 * (1 - p2) + 0.3;
        ctx.shadowColor = 'rgba(190, 148, 255, 1)';
        ctx.shadowBlur  = 18;
        ctx.stroke();
        ctx.shadowBlur  = 0;
      }
    }

    // Damage colour state — sample time once for the whole draw call
    const hits    = spaceship.hits;
    const hitFrac = Math.min(hits / 9, 1);
    const now     = Date.now();
    const cl = (a, b, t) => Math.round(a + (b - a) * t);
    let fl = 0, warnFreq = 0;
    if (hits >= 7) {
      warnFreq = [0.7, 1.3, 2.2][Math.min(hits - 7, 2)];
      fl = (Math.sin(now / 1000 * warnFreq * Math.PI * 2) + 1) / 2;
    }
    // Hull gradient: purple → red → blinding flash-red
    const topR = cl(cl(192, 255, hitFrac), 255, fl * 0.92);
    const topG = cl(cl(162,  65, hitFrac),  15, fl * 0.92);
    const topB = cl(cl(255,  65, hitFrac),  15, fl * 0.92);
    const midR = cl(cl(126, 215, hitFrac), 255, fl * 0.92);
    const midG = cl(cl( 90,  35, hitFrac),   5, fl * 0.92);
    const midB = cl(cl(228,  35, hitFrac),   5, fl * 0.92);
    const botR = cl(cl( 78, 170, hitFrac), 220, fl * 0.92);
    const botG = cl(cl( 55,  18, hitFrac),   2, fl * 0.92);
    const botB = cl(cl(180,  18, hitFrac),   2, fl * 0.92);
    const glR  = cl(cl(158, 255, hitFrac), 255, fl);
    const glG  = cl(cl(118,  45, hitFrac),   0, fl);
    const glB  = cl(cl(255,  45, hitFrac),   0, fl);
    const stR  = cl(220, 255, hitFrac);
    const stG  = cl(208, 140, hitFrac);
    const stB  = cl(255, 140, hitFrac);

    ctx.globalAlpha = spaceship.alpha;
    ctx.translate(spaceship.x, spaceship.y);

    // Warning rings — suppressed while swirling into a BH
    if (hits >= 7 && !spaceship.swirl) {
      const period   = 1000 / warnFreq;
      const maxRingR = 55 + (hits - 7) * 14;
      ctx.save();
      for (let ri = 0; ri < 2; ri++) {
        const phase  = ((now + ri * period * 0.5) % period) / period;
        const ringR  = 14 + phase * maxRingR;
        const rAlpha = (1 - phase) * (0.45 + fl * 0.45);
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 20, 20, ${rAlpha})`;
        ctx.lineWidth   = (1 - phase) * 5 + 0.5;
        ctx.shadowColor = 'rgba(255, 0, 0, 1)';
        ctx.shadowBlur  = 18;
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.rotate(spaceship.angle);

    if (spaceship.swirl) {
      const s = Math.max(0, 1 - Math.pow(spaceship.swirl.age / spaceship.swirl.maxAge, 0.6));
      ctx.scale(s, s);
    }

    // Body glow — shifts purple → red, pulses hard on last 3 hits
    ctx.shadowColor = `rgba(${glR}, ${glG}, ${glB}, 0.9)`;
    ctx.shadowBlur  = 14 + (hits >= 7 ? fl * 28 : 0);

    // Hull polygon
    ctx.beginPath();
    ctx.moveTo( 0, -15);
    ctx.lineTo(-12,   7);
    ctx.lineTo( -5,   2);
    ctx.lineTo(  0,  11);
    ctx.lineTo(  5,   2);
    ctx.lineTo( 12,   7);
    ctx.closePath();

    const bg = ctx.createLinearGradient(0, -15, 0, 11);
    bg.addColorStop(0,   `rgba(${topR}, ${topG}, ${topB}, 0.97)`);
    bg.addColorStop(0.5, `rgba(${midR}, ${midG}, ${midB}, 0.93)`);
    bg.addColorStop(1,   `rgba(${botR}, ${botG}, ${botB}, 0.88)`);
    ctx.fillStyle = bg;
    ctx.fill();

    ctx.shadowBlur  = 0;
    ctx.strokeStyle = `rgba(${stR}, ${stG}, ${stB}, 0.92)`;
    ctx.lineWidth   = 1.2;
    ctx.lineJoin    = 'round';
    ctx.stroke();

    // Cockpit
    ctx.shadowColor = 'rgba(148, 232, 255, 0.9)';
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.ellipse(0, -6, 2.5, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle   = 'rgba(172, 238, 255, 0.92)';
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = 'rgba(210, 248, 255, 0.50)';
    ctx.lineWidth   = 0.7;
    ctx.stroke();

    ctx.restore();
  }

  window.startSpaceship = function(x, y) {
    spaceship = { x, y, targetX: x, targetY: y, vx: 0, vy: 0, angle: 0, active: true, alpha: 1, emitAccum: 0, bounceCD: 0, hits: 0 };
  };
  window.updateSpaceshipTarget = function(x, y) {
    if (spaceship) { spaceship.targetX = x; spaceship.targetY = y; }
  };
  window.releaseSpaceship = function() {
    if (spaceship) spaceship.active = false;
  };

  function triggerShipExplosion() {
    if (!spaceship || spaceship.exploding) return;
    spaceship.active        = false;
    spaceship.exploding     = true;
    spaceship.explodeAge    = 0;
    spaceship.explodeMaxAge = 1.8;

    // Fast radial burst — sharp shard-like particles
    for (let i = 0; i < 42; i++) {
      const angle   = (Math.PI * 2 * i / 42) + (Math.random() - 0.5) * 0.55;
      const speed   = 140 + Math.random() * 340;
      const maxLife = 0.55 + Math.random() * 0.85;
      smokeParticles.push({
        x: spaceship.x + (Math.random() - 0.5) * 12,
        y: spaceship.y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife, maxLife,
        r: 3.5 + Math.random() * 5.5,
        core: Math.random() < 0.55,
      });
    }
    // Slow inner cloud — lingers behind the rings
    for (let i = 0; i < 22; i++) {
      const angle   = Math.random() * Math.PI * 2;
      const speed   = 18 + Math.random() * 65;
      const maxLife = 0.9 + Math.random() * 0.85;
      smokeParticles.push({
        x: spaceship.x + (Math.random() - 0.5) * 18,
        y: spaceship.y + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife, maxLife,
        r: 7 + Math.random() * 10,
        core: false,
      });
    }
  }

  // ── Comet ────────────────────────────────────────────────────────
  function spawnComet(x, y, vx, vy) {
    if (comets.length >= 5) blastComet(comets.shift(), x, y);
    comets.push({ x, y, vx, vy });
  }
  window.spawnComet = spawnComet;

  function spawnImpactDebris(x, y) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd   = 60 + Math.random() * 120;
      smokeParticles.push({
        x, y,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 0.3 + Math.random() * 0.2, maxLife: 0.5,
        r: 2 + Math.random() * 3,
        core: Math.random() < 0.5, comet: true,
      });
    }
  }

  function blastComet(c, srcX, srcY) {
    const dx = c.x - srcX, dy = c.y - srcY;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    for (let i = 0; i < 18; i++) {
      let sdx, sdy;
      if (i < 13) {
        const spread = (Math.random() - 0.5) * Math.PI * 1.4;
        const cs = Math.cos(spread), ss = Math.sin(spread);
        sdx = nx * cs - ny * ss;
        sdy = nx * ss + ny * cs;
      } else {
        const a = Math.random() * Math.PI * 2;
        sdx = Math.cos(a); sdy = Math.sin(a);
      }
      const spd     = 110 + Math.random() * 270;
      const maxLife = 0.28 + Math.random() * 0.32;
      smokeParticles.push({
        x: c.x + (Math.random() - 0.5) * 14,
        y: c.y + (Math.random() - 0.5) * 14,
        vx: sdx * spd, vy: sdy * spd,
        life: maxLife, maxLife,
        r: 1.5 + Math.random() * 2.5,
        core: Math.random() < 0.6, comet: true,
      });
    }
  }

  function updateComet(dt) {
    const allBHs  = blackHole ? [blackHole, ...dyingBlackHoles] : [...dyingBlackHoles];
    const globeEl = document.getElementById('globe-canvas');
    const gr      = globeEl ? globeEl.getBoundingClientRect() : null;
    const moon    = window.getMoonScreenPos ? window.getMoonScreenPos() : null;
    const margin  = 120;

    // Comet-comet collisions — both explode on contact
    for (let i = comets.length - 1; i >= 1; i--) {
      if (comets[i].swirl) continue;
      for (let j = i - 1; j >= 0; j--) {
        if (comets[j].swirl) continue;
        if (Math.hypot(comets[i].x - comets[j].x, comets[i].y - comets[j].y) < 18) {
          blastComet(comets[i], comets[j].x, comets[j].y);
          blastComet(comets[j], comets[i].x, comets[i].y);
          comets.splice(i, 1);
          comets.splice(j, 1);
          i = j; // after for-loop's i--, outer loop resumes at j-1 (safe)
          break;
        }
      }
    }

    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];

      // Comet already spiralling into a BH — animate until it reaches centre
      if (c.swirl) {
        const sw = c.swirl;
        sw.age += dt;
        const frac = sw.age / sw.maxAge;
        if (frac >= 1) { comets.splice(i, 1); continue; }
        const r   = sw.r * Math.pow(1 - frac, 0.65);
        sw.angle += (3 + frac * 10) * dt;
        c.x = sw.bh.x + Math.cos(sw.angle) * r;
        c.y = sw.bh.y + Math.sin(sw.angle) * r;
        continue;
      }

      // BH gravity pull; enter swirl once inside the dark shadow zone
      for (const bh of allBHs) {
        const dx = bh.x - c.x, dy = bh.y - c.y;
        const d  = Math.hypot(dx, dy);
        if (d < bh.baseRadius * 3) {
          c.swirl = { bh, angle: Math.atan2(c.y - bh.y, c.x - bh.x), r: Math.max(d, 4), age: 0, maxAge: 0.75 };
          break;
        }
        if (d < bh.baseRadius * 20) {
          const g = 18000 / (d * d);
          c.vx += (dx / d) * g * dt;
          c.vy += (dy / d) * g * dt;
        }
      }
      if (c.swirl) continue;

      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Trail particles
      if (smokeParticles.length < 600) {
        const spd = Math.hypot(c.vx, c.vy) || 1;
        const bx  = -c.vx / spd, by = -c.vy / spd;
        for (let j = 0; j < 3; j++) {
          const spread = (Math.random() - 0.5) * 0.8;
          const cs = Math.cos(spread), ss = Math.sin(spread);
          smokeParticles.push({
            x: c.x + bx * 6 + (Math.random() - 0.5) * 4,
            y: c.y + by * 6 + (Math.random() - 0.5) * 4,
            vx: (bx * cs - by * ss) * (20 + Math.random() * 30),
            vy: (bx * ss + by * cs) * (20 + Math.random() * 30),
            life: 0.25 + Math.random() * 0.25,
            maxLife: 0.4,
            r: 1.5 + Math.random() * 2,
            core: Math.random() < 0.4,
            comet: true,
          });
        }
      }

      // Off-screen
      if (c.x < -margin || c.x > canvas.width  + margin ||
          c.y < -margin || c.y > canvas.height + margin) {
        comets.splice(i, 1); continue;
      }

      // Collision: Globe
      if (gr) {
        const gcx = gr.left + gr.width  / 2;
        const gcy = gr.top  + gr.height / 2;
        if (Math.hypot(c.x - gcx, c.y - gcy) < gr.width * 0.22) {
          window.dispatchEvent(new CustomEvent('comet-globe-impact',
            { detail: { x: c.x, y: c.y, vx: c.vx, vy: c.vy, source: 'comet' } }));
          spawnImpactDebris(c.x, c.y);
          comets.splice(i, 1); continue;
        }
      }

      // Collision: Moon
      if (moon && Math.hypot(c.x - moon.x, c.y - moon.y) < moon.r * 1.4) {
        window.dispatchEvent(new CustomEvent('comet-moon-impact',
          { detail: { x: c.x, y: c.y, vx: c.vx, vy: c.vy, source: 'comet' } }));
        spawnImpactDebris(c.x, c.y);
        comets.splice(i, 1); continue;
      }

      // Collision: Spaceship — deals 3 hits of damage
      if (spaceship && !spaceship.exploding &&
          Math.hypot(c.x - spaceship.x, c.y - spaceship.y) < 22) {
        spaceship.hits += 3;
        spawnImpactDebris(c.x, c.y);
        if (spaceship.hits >= 10) triggerShipExplosion();
        comets.splice(i, 1); continue;
      }
    }
  }

  function drawComet() {
    for (const c of comets) {
      // Swirling into BH: draw only a shrinking core, no tail
      if (c.swirl) {
        const frac  = c.swirl.age / c.swirl.maxAge;
        const scale = Math.max(0, 1 - Math.pow(frac, 0.55));
        if (scale < 0.02) continue;
        const r = Math.max(0.1, 10 * scale);
        ctx.save();
        ctx.globalAlpha = scale;
        ctx.shadowColor = 'rgba(160, 240, 255, 1)';
        ctx.shadowBlur  = 18 * scale;
        const cg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
        cg.addColorStop(0,   'rgba(255, 255, 255, 1)');
        cg.addColorStop(0.4, 'rgba(180, 240, 255, 0.85)');
        cg.addColorStop(1,   'rgba(60, 160, 255, 0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      const spd = Math.hypot(c.vx, c.vy);
      if (spd < 1) continue;
      const nx = c.vx / spd, ny = c.vy / spd;

      ctx.save();
      const tailLen = Math.min(60, spd * 0.1);
      const tx = c.x - nx * tailLen, ty = c.y - ny * tailLen;

      const tailGrad = ctx.createLinearGradient(c.x, c.y, tx, ty);
      tailGrad.addColorStop(0,   'rgba(220, 240, 255, 0.80)');
      tailGrad.addColorStop(0.3, 'rgba(100, 220, 255, 0.45)');
      tailGrad.addColorStop(1,   'rgba(60, 140, 255, 0)');
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth   = 3.5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.shadowColor = 'rgba(160, 240, 255, 1)';
      ctx.shadowBlur  = 18;
      const coreGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 10);
      coreGrad.addColorStop(0,   'rgba(255, 255, 255, 1)');
      coreGrad.addColorStop(0.4, 'rgba(180, 240, 255, 0.85)');
      coreGrad.addColorStop(1,   'rgba(60, 160, 255, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function draw(timestamp) {
    const dt = lastTimestamp === null ? 1 / 60 : Math.min(0.1, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;
    t = (t + dt) % 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = neb1;   ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = neb2;   ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = neb3;   ctx.fillRect(0, 0, canvas.width, canvas.height);

    bgStars.forEach(s => {
      let drawX = s.x, drawY = s.y;
      if (blackHole || dyingBlackHoles.length) {
        const pos = applyAllLensing(s.x, s.y);
        if (!pos) return;
        drawX = pos.x; drawY = pos.y;
      }
      ctx.globalAlpha = Math.max(0.04, Math.min(1, s.base + Math.sin(t * s.freq * Math.PI * 2 + s.phase) * s.amp));
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(drawX, drawY, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    conStars.forEach(s => {
      let drawX = s.x, drawY = s.y;
      if (blackHole || dyingBlackHoles.length) {
        const pos = applyAllLensing(s.x, s.y);
        if (!pos) return;
        drawX = pos.x; drawY = pos.y;
      }
      ctx.globalAlpha = Math.max(0.04, Math.min(1, s.base + Math.sin(t * s.freq * Math.PI * 2 + s.phase) * s.amp));
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(drawX, drawY, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    const hovered    = findHoveredCon();
    const anyHovered = hovered >= 0;

    for (let ci = 0; ci < constellations.length; ci++) {
      const con = constellations[ci];

      con.nextFlash -= dt;
      if (con.nextFlash <= 0 && !con.flashing) {
        con.flashing  = true;
        con.flashP    = 0;
        con.nextFlash = 4 + Math.random() * 9;
      }
      if (con.flashing) {
        con.flashP += dt / 6.0;
        if (con.flashP >= 1) { con.flashing = false; con.flashP = 0; }
        const fp  = con.flashP;
        const env = fp < 0.2 ? Math.sin((fp / 0.2) * Math.PI / 2)
                  : fp < 0.8 ? 1
                  : Math.cos(((fp - 0.8) / 0.2) * Math.PI / 2);
        con.flashAlpha = env * 0.58;
      } else {
        con.flashAlpha = 0;
      }

      con.hoverAlpha += ((ci === hovered ? 1 : 0) - con.hoverAlpha) * 0.07;

      const isHovered = ci === hovered;
      const alpha = isHovered
        ? con.hoverAlpha
        : anyHovered
          ? con.flashAlpha * 0.20
          : Math.max(con.hoverAlpha, con.flashAlpha);
      if (alpha < 0.01) continue;

      ctx.globalAlpha = alpha * (isHovered ? 0.75 : 0.28);
      ctx.strokeStyle = isHovered ? 'rgba(220, 235, 255, 1)' : 'rgba(180, 210, 255, 1)';
      ctx.lineWidth   = isHovered ? 1.3 : 0.7;
      ctx.lineCap = 'round';
      for (const [i, j] of con.edges) {
        const sa = conStars[con.indices[i]];
        const sb = conStars[con.indices[j]];
        let ax = sa.x, ay = sa.y, bx = sb.x, by = sb.y;
        if (blackHole || dyingBlackHoles.length) {
          const pa = applyAllLensing(sa.x, sa.y);
          const pb = applyAllLensing(sb.x, sb.y);
          if (!pa || !pb) continue;
          ax = pa.x; ay = pa.y; bx = pb.x; by = pb.y;
        }
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      if (con.hoverAlpha > 0.12) {
        let centX = 0, topY = Infinity;
        for (const idx of con.indices) {
          const s = conStars[idx];
          let sx = s.x, sy = s.y;
          if (blackHole || dyingBlackHoles.length) {
            const pos = applyAllLensing(s.x, s.y);
            if (pos) { sx = pos.x; sy = pos.y; }
          }
          centX += sx;
          if (sy < topY) topY = sy;
        }
        centX /= con.indices.length;
        drawTooltip(con.name, centX, topY, con.hoverAlpha);
      }
    }

    ctx.globalAlpha = 1;

    for (let i = dyingBlackHoles.length - 1; i >= 0; i--) {
      const bh = dyingBlackHoles[i];
      bh.age      += dt;
      bh.rotation += dt * 2.8;
      drawBlackHole(bh);
      checkBHWave(bh);
      if (bh.age >= bh.maxAge) dyingBlackHoles.splice(i, 1);
    }

    if (blackHole) {
      blackHole.age      += dt;
      blackHole.rotation += dt * 2.8; // faster vortex; (rs/d)² exponent keeps inner much faster
      drawBlackHole(blackHole);
      checkBHWave(blackHole);
      if (!blackHole.explodeFired && blackHole.age / blackHole.maxAge > 0.92) {
        window.dispatchEvent(new CustomEvent('blackhole-explode', { detail: { x: blackHole.x, y: blackHole.y } }));
        blackHole.explodeFired = true;
      }
      if (blackHole.age >= blackHole.maxAge) blackHole = null;
    }

    updateSmoke(dt);
    drawSmoke();
    updateSpaceship(dt);
    drawSpaceship();
    updateComet(dt);
    drawComet();

    if (shooting) {
      const tailX = shooting.x - shooting.dx * shooting.tail;
      const tailY = shooting.y - shooting.dy * shooting.tail;

      const grad = ctx.createLinearGradient(shooting.x, shooting.y, tailX, tailY);
      grad.addColorStop(0,   `rgba(255,255,255,${shooting.life})`);
      grad.addColorStop(0.2, `rgba(200,230,255,${shooting.life * 0.65})`);
      grad.addColorStop(1,   'rgba(140,170,255,0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shooting.x, shooting.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      const glowG = ctx.createRadialGradient(shooting.x, shooting.y, 0, shooting.x, shooting.y, 5);
      glowG.addColorStop(0, `rgba(255,255,255,${shooting.life * 0.9})`);
      glowG.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = glowG;
      ctx.beginPath();
      ctx.arc(shooting.x, shooting.y, 5, 0, Math.PI * 2);
      ctx.fill();

      shooting.x += shooting.dx * shooting.speed;
      shooting.y += shooting.dy * shooting.speed;
      shooting.life -= 0.018;
      if (shooting.life <= 0 || shooting.x > canvas.width + 120 || shooting.y > canvas.height + 120) {
        shooting = null;
      }
    }

    if (active) rafId = requestAnimationFrame(draw);
  }

  function stop() {
    active = false;
    cancelAnimationFrame(rafId);
    clearTimeout(shootTimer);
  }

  function start() {
    if (active) return;
    active = true;
    lastTimestamp = null;
    sessionDefs = generateSessionDefs();
    sessionNames = (() => {
      const names = SILLY_NAMES.slice().sort(() => Math.random() - 0.5);
      if (Math.random() < 0.05) names[Math.floor(Math.random() * sessionDefs.length)] = 'Yashi Pozmantiria';
      return names;
    })();
    resize();
    rafId = requestAnimationFrame(draw);
    scheduleNext();
  }

  window.addEventListener('resize', () => { if (active) resize(); });

  // Skip events that originate from the globe canvas — pointer capture makes those
  // bubble to document even mid-drag, which would falsely trigger constellation hover.
  const notGlobe = e => e.target.id !== 'globe-canvas';
  document.addEventListener('pointermove',  e => { if (notGlobe(e)) { mouseX = e.clientX; mouseY = e.clientY; } });
  document.addEventListener('pointerleave', () => { mouseX = -1; mouseY = -1; });
  document.addEventListener('pointerdown', e => {
    if (!notGlobe(e)) return;
    mouseX = e.clientX; mouseY = e.clientY;
  });
  document.addEventListener('pointerup',    () => { mouseX = -1; mouseY = -1; });

  // Prevent mobile scroll and pinch-zoom across the whole page.
  // CSS overflow:hidden + overscroll-behavior don't stop iOS Safari's elastic
  // scroll; a non-passive touchmove listener with preventDefault() does.
  document.addEventListener('touchmove',   e => e.preventDefault(), { passive: false });
  // Suppress the long-press context menu (right-click equivalent) on iOS and Android.
  // Without this, holding a finger on the canvas or gadget slots triggers the native
  // share/copy sheet and interrupts pointer capture mid-drag.
  document.addEventListener('contextmenu', e => e.preventDefault());
  if ('ongesturestart' in window) {
    document.addEventListener('gesturestart',  e => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
  }

  start();
})();

// ── Gadget Inventory ─────────────────────────────────────────────
(function () {
  const inventory = document.getElementById('gadget-inventory');
  if (!inventory) return;

  let ghost            = null;
  let gadgetType       = null;
  let slotCX           = 0;
  let slotCY           = 0;
  let cometDragHistory = [];

  function spawnGhost(type, clientX, clientY) {
    ghost = document.createElement('div');
    ghost.className    = 'gadget-drag-ghost';
    ghost.dataset.gadget = type;
    ghost.style.left   = clientX + 'px';
    ghost.style.top    = clientY + 'px';
    document.body.appendChild(ghost);
  }

  function cancelDrag(slot) {
    if (ghost) { ghost.remove(); ghost = null; }
    if (gadgetType === 'spaceship') window.releaseSpaceship && window.releaseSpaceship();
    gadgetType = null;
    if (slot) slot.classList.add('no-tooltip');
  }

  inventory.querySelectorAll('.gadget-slot').forEach(slot => {
    slot.addEventListener('pointerdown', e => {
      e.stopPropagation();
      slot.classList.add('no-tooltip');
      gadgetType = slot.dataset.gadget;

      const r = slot.getBoundingClientRect();
      slotCX = r.left + r.width  / 2;
      slotCY = r.top  + r.height / 2;

      if (gadgetType === 'blackhole') {
        spawnGhost('blackhole', e.clientX, e.clientY);
      } else if (gadgetType === 'spaceship') {
        window.startSpaceship && window.startSpaceship(e.clientX, e.clientY);
      } else if (gadgetType === 'comet') {
        cometDragHistory = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
        spawnGhost('comet', e.clientX, e.clientY);
      }

      slot.setPointerCapture(e.pointerId);
    });

    slot.addEventListener('pointermove', e => {
      if (gadgetType === 'blackhole' && ghost) {
        ghost.style.left = e.clientX + 'px';
        ghost.style.top  = e.clientY + 'px';
      } else if (gadgetType === 'spaceship') {
        window.updateSpaceshipTarget && window.updateSpaceshipTarget(e.clientX, e.clientY);
      } else if (gadgetType === 'comet' && ghost) {
        ghost.style.left = e.clientX + 'px';
        ghost.style.top  = e.clientY + 'px';
        cometDragHistory.push({ x: e.clientX, y: e.clientY, t: performance.now() });
        if (cometDragHistory.length > 10) cometDragHistory.shift();
        const n = cometDragHistory.length;
        let angle;
        if (n >= 2) {
          const vdx = cometDragHistory[n - 1].x - cometDragHistory[0].x;
          const vdy = cometDragHistory[n - 1].y - cometDragHistory[0].y;
          angle = Math.hypot(vdx, vdy) > 4
            ? Math.atan2(vdy, vdx) * 180 / Math.PI
            : Math.atan2(e.clientY - slotCY, e.clientX - slotCX) * 180 / Math.PI;
        } else {
          angle = Math.atan2(e.clientY - slotCY, e.clientX - slotCX) * 180 / Math.PI;
        }
        ghost.style.transform = `translate(-50%, -50%) rotate(${angle + 90}deg)`;
      }
    });

    slot.addEventListener('pointerup', e => {
      const over = document.elementFromPoint(e.clientX, e.clientY);
      const onInventory = inventory.contains(over);

      if (gadgetType === 'blackhole') {
        if (ghost) { ghost.remove(); ghost = null; }
        if (!onInventory && window.spawnBlackHole) {
          window.spawnBlackHole(e.clientX, e.clientY);
        }
      } else if (gadgetType === 'spaceship') {
        window.releaseSpaceship && window.releaseSpaceship();
      } else if (gadgetType === 'comet') {
        if (ghost) { ghost.remove(); ghost = null; }
        if (!onInventory && window.spawnComet) {
          const now    = performance.now();
          const recent = cometDragHistory.filter(p => now - p.t < 100);
          let vx = 0, vy = 0;
          if (recent.length >= 2) {
            const first = recent[0], last = recent[recent.length - 1];
            const dtSec = (last.t - first.t) / 1000;
            if (dtSec > 0.005) { vx = (last.x - first.x) / dtSec; vy = (last.y - first.y) / dtSec; }
          }
          if (Math.hypot(vx, vy) < 50) {
            const dx   = e.clientX - slotCX, dy = e.clientY - slotCY;
            const vlen = Math.hypot(dx, dy) || 1;
            const spd  = Math.min(vlen * 3.5, 900);
            vx = (dx / vlen) * spd; vy = (dy / vlen) * spd;
          } else {
            const spd = Math.hypot(vx, vy);
            if (spd > 1200) { vx = vx / spd * 1200; vy = vy / spd * 1200; }
          }
          window.spawnComet(e.clientX, e.clientY, vx, vy);
        }
      }

      gadgetType = null;
      slot.classList.add('no-tooltip');
    });

    slot.addEventListener('pointercancel', () => cancelDrag(slot));

    slot.addEventListener('pointerenter', () => {
      if (!gadgetType) slot.classList.remove('no-tooltip');
    });
  });
})();
