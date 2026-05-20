// ── Star field ──────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('stars-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Shared smoke particle array — other modules push to window.smokeParticles
  const smokeParticles = [];
  window.smokeParticles = smokeParticles;

  const COLORS = ['#ffffff', '#ffffff', '#ffffff', '#cce8ff', '#fffbe0', '#ddd0ff'];

  // ── Constellation geometry constants ─────────────────────────────────────────
  const ZONE_PAD_X       = 0.12;
  const ZONE_PAD_Y       = 0.10;
  const CLUSTER_R_MIN    = 0.055;
  const CLUSTER_R_RNG    = 0.055;
  const CLUSTER_TRIES    = 150;
  const MIN_STAR_SEP     = 0.022;
  const STAR_CNT_MIN     = 4;
  const STAR_CNT_RNG     = 4;
  const BG_STAR_COUNT    = 210;
  const EXCL_RADIUS_MAX  = 340;
  const EXCL_RADIUS_FRAC = 0.40;

  const ZONES = [
    [0.00, 0.00, 0.33, 0.50],
    [0.33, 0.00, 0.67, 0.50],
    [0.67, 0.00, 1.00, 0.50],
    [0.00, 0.50, 0.33, 1.00],
    [0.33, 0.50, 0.67, 1.00],
    [0.67, 0.50, 1.00, 1.00],
  ];

  const ZONES_MOBILE = [
    [0.00, 0.00, 0.50, 0.50],
    [0.50, 0.00, 1.00, 0.50],
    [0.00, 0.50, 0.50, 1.00],
    [0.50, 0.50, 1.00, 1.00],
  ];

  function cross2D(ax, ay, bx, by) { return ax * by - ay * bx; }

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

  function addTailLoop(pts, chainEdges) {
    if (chainEdges.length < 3) return [...chainEdges];

    const order = [chainEdges[0][0], ...chainEdges.map(e => e[1])];
    const n = order.length;

    const candidates = [];
    for (let i = 0; i < n - 2; i++) {
      for (let j = i + 2; j < n; j++) {
        if (i === 0 && j === n - 1) continue;

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

  let sessionDefs;
  let bgStars = [], conStars = [], constellations = [], shooting = null;
  let rafId = null, shootTimer = null, active = false, t = 0, lastTimestamp = null;
  let bgGrad = null, neb1 = null, neb2 = null, neb3 = null;

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
        edges:      def.edges,
        indices,
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
    window.gadgetScale = Math.min(window.innerWidth, window.innerHeight) < 600 ? 0.5 : 1;
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

  function draw(timestamp) {
    const dt = lastTimestamp === null ? 1 / 60 : Math.min(0.1, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;
    t = (t + dt) % 1000;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = neb1;   ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = neb2;   ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = neb3;   ctx.fillRect(0, 0, canvas.width, canvas.height);

    const hasLens = window.BlackHole && window.BlackHole.hasAny();

    bgStars.forEach(s => {
      let drawX = s.x, drawY = s.y;
      if (hasLens) {
        const pos = window.BlackHole.applyLensing(s.x, s.y);
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
      if (hasLens) {
        const pos = window.BlackHole.applyLensing(s.x, s.y);
        if (!pos) return;
        drawX = pos.x; drawY = pos.y;
      }
      ctx.globalAlpha = Math.max(0.04, Math.min(1, s.base + Math.sin(t * s.freq * Math.PI * 2 + s.phase) * s.amp));
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(drawX, drawY, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

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

      if (con.flashAlpha < 0.01) continue;

      ctx.globalAlpha = con.flashAlpha * 0.28;
      ctx.strokeStyle = 'rgba(180, 210, 255, 1)';
      ctx.lineWidth   = 0.7;
      ctx.lineCap     = 'round';
      for (const [i, j] of con.edges) {
        const sa = conStars[con.indices[i]];
        const sb = conStars[con.indices[j]];
        let ax = sa.x, ay = sa.y, bx = sb.x, by = sb.y;
        if (hasLens) {
          const pa = window.BlackHole.applyLensing(sa.x, sa.y);
          const pb = window.BlackHole.applyLensing(sb.x, sb.y);
          if (!pa || !pb) continue;
          ax = pa.x; ay = pa.y; bx = pb.x; by = pb.y;
        }
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;

    window.BlackHole && window.BlackHole.update(dt);

    updateSmoke(dt);
    drawSmoke();

    window.Asteroids && window.Asteroids.update(dt);
    window.Asteroids && window.Asteroids.draw(ctx);

    window.Spaceship && window.Spaceship.update(dt);
    window.Spaceship && window.Spaceship.draw(ctx);

    window.Comet && window.Comet.update(dt);
    window.Comet && window.Comet.draw(ctx);

    window.MeteorShower && window.MeteorShower.update(dt);
    window.MeteorShower && window.MeteorShower.draw();

    if (shooting) {
      const tailX = shooting.x - shooting.dx * shooting.tail;
      const tailY = shooting.y - shooting.dy * shooting.tail;

      const grad = ctx.createLinearGradient(shooting.x, shooting.y, tailX, tailY);
      grad.addColorStop(0,   `rgba(255,255,255,${shooting.life})`);
      grad.addColorStop(0.2, `rgba(200,230,255,${shooting.life * 0.65})`);
      grad.addColorStop(1,   'rgba(140,170,255,0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.8;
      ctx.lineCap     = 'round';
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

      shooting.x    += shooting.dx * shooting.speed;
      shooting.y    += shooting.dy * shooting.speed;
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
    resize();
    rafId = requestAnimationFrame(draw);
    scheduleNext();
  }

  window.addEventListener('resize', () => { if (active) resize(); });

  document.addEventListener('touchstart',  e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove',   e => e.preventDefault(), { passive: false });
  document.addEventListener('contextmenu', e => e.preventDefault());
  if ('ongesturestart' in window) {
    document.addEventListener('gesturestart',  e => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
  }

  start();
})();
