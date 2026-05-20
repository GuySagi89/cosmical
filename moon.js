// ── Moon ─────────────────────────────────────────────────────────
(function () {
  const MOON_ORBIT_R     = 185;
  const MOON_R           = 28;
  const MOON_ORBIT_SPEED = 0.008;
  const MOON_ORBIT_DECAY = 0.018;
  const MOON_SELF_SPEED  = 0.008;
  const MOON_ORBIT_TILT  = 0.50;
  const FOV_DIST         = 500;
  const R                = 110;
  const W                = 500;
  const H                = 500;
  const cx               = W / 2;
  const cy               = H / 2;

  const MOON_DOTS = (() => {
    const dots = [], LAT = 12, LON = 24;
    for (let i = 0; i <= LAT; i++) {
      const phi  = i * Math.PI / LAT;
      const sinP = Math.sin(phi), cosP = Math.cos(phi);
      const lons = (i === 0 || i === LAT) ? 1 : LON;
      for (let j = 0; j < lons; j++) {
        const t0 = j * 2 * Math.PI / lons;
        dots.push({ sinP, cosP, sinT: Math.sin(t0), cosT: Math.cos(t0) });
      }
    }
    return dots;
  })();

  const MOON_CRATERS = (() => {
    const raw = [
      [  0.50,  0.30, -0.82, 0.25, 0.65 ],
      [ -0.70,  0.10, -0.71, 0.20, 0.55 ],
      [  0.20, -0.75, -0.63, 0.28, 0.70 ],
      [ -0.28,  0.70, -0.65, 0.18, 0.60 ],
      [  0.85,  0.00, -0.53, 0.22, 0.50 ],
      [ -0.15, -0.40, -0.90, 0.14, 0.75 ],
      [  0.60,  0.50,  0.62, 0.20, 0.60 ],
      [ -0.55, -0.65,  0.52, 0.16, 0.55 ],
    ];
    return raw.map(([x, y, z, r, depth]) => {
      const len = Math.sqrt(x*x + y*y + z*z);
      return { nx: x/len, ny: y/len, nz: z/len, cosR: Math.cos(r), depth };
    });
  })();

  let moonOrbitAngle   = 0;
  let moonSelfAngle    = 0;
  let moonOrbitSpeed   = MOON_ORBIT_SPEED;
  let moonDragging     = false;
  let moonDragVel      = 0;
  let moonFrostPatches = [];
  let moonFreezeEnd   = 0;   // ms timestamp when freeze ends; 0 = not frozen
  let moonGlobalFrost = 0;   // 0–1 blend toward icy white for the whole moon

  let canvas, ctx;

  function frostAlpha(startTime) {
    const age = (Date.now() - startTime) / 1000;
    if (age >= 15.0) return -1;
    if (age <  3.0)  return 1.0;
    return 1.0 - (age - 3.0) / 12.0;
  }

  function getMoonPos() {
    const sinO = Math.sin(moonOrbitAngle);
    const cosO = Math.cos(moonOrbitAngle);
    const mx =  MOON_ORBIT_R * cosO;
    const my = -MOON_ORBIT_R * sinO * Math.sin(MOON_ORBIT_TILT);
    const mz =  MOON_ORBIT_R * sinO * Math.cos(MOON_ORBIT_TILT);
    const s  = FOV_DIST / (FOV_DIST + mz + R);
    return { mx, my, mz, px: cx + mx * s, py: cy + my * s, s };
  }

  // Gauss-Newton: find the orbit angle whose projected screen pos is closest to (msx,msy).
  function nearestOrbitAngle(msx, msy, startAngle) {
    const sinT = Math.sin(MOON_ORBIT_TILT);
    const cosT = Math.cos(MOON_ORBIT_TILT);
    let θ = startAngle;
    for (let iter = 0; iter < 8; iter++) {
      const sinθ = Math.sin(θ), cosθ = Math.cos(θ);
      const omx  =  MOON_ORBIT_R * cosθ;
      const omy  = -MOON_ORBIT_R * sinθ * sinT;
      const omz  =  MOON_ORBIT_R * sinθ * cosT;
      const denom = FOV_DIST + omz + R;
      const s    = FOV_DIST / denom;
      const px   = cx + omx * s;
      const py   = cy + omy * s;
      const domx = -MOON_ORBIT_R * sinθ;
      const domy = -MOON_ORBIT_R * cosθ * sinT;
      const domz =  MOON_ORBIT_R * cosθ * cosT;
      const ds   = -FOV_DIST * domz / (denom * denom);
      const dpx  = domx * s + omx * ds;
      const dpy  = domy * s + omy * ds;
      const num  = (px - msx) * dpx + (py - msy) * dpy;
      const den  = dpx * dpx + dpy * dpy;
      if (den < 1e-6) break;
      θ -= Math.max(-0.3, Math.min(0.3, num / den));
    }
    return θ;
  }

  function drawOrbitRing() {
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const θ  = (i / 80) * Math.PI * 2;
      const ox =  MOON_ORBIT_R * Math.cos(θ);
      const oy = -MOON_ORBIT_R * Math.sin(θ) * Math.sin(MOON_ORBIT_TILT);
      const oz =  MOON_ORBIT_R * Math.sin(θ) * Math.cos(MOON_ORBIT_TILT);
      const s  = FOV_DIST / (FOV_DIST + oz + R);
      const sx = cx + ox * s;
      const sy = cy + oy * s;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(140, 110, 210, 0.18)';
    ctx.lineWidth   = 0.6;
    ctx.stroke();
  }

  function drawMoon({ px, py, mx, my, mz, s }) {
    for (let i = moonFrostPatches.length - 1; i >= 0; i--) {
      if (frostAlpha(moonFrostPatches[i].startTime) < 0) moonFrostPatches.splice(i, 1);
    }

    const mr         = MOON_R * s;
    const depthAlpha = (mz > 0 && !moonDragging) ? Math.max(0.3, 1 - mz / (MOON_ORBIT_R * 1.2)) : 1;
    ctx.save();
    ctx.globalAlpha = depthAlpha;

    const glow = ctx.createRadialGradient(px, py, mr * 0.9, px, py, mr * 3.2);
    glow.addColorStop(0, 'rgba(175, 148, 220, 0.20)');
    glow.addColorStop(1, 'rgba(90,  70, 170, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, mr * 3.2, 0, Math.PI * 2);
    ctx.fill();

    const cosSA = Math.cos(moonSelfAngle);
    const sinSA = Math.sin(moonSelfAngle);

    const lx = 0.60, ly = -0.55, lz = -0.58;

    const rotCraters = MOON_CRATERS.map(c => ({
      nx: c.nx * cosSA - c.nz * sinSA,
      ny: c.ny,
      nz: c.nx * sinSA + c.nz * cosSA,
      cosR: c.cosR, depth: c.depth,
    }));

    for (const d of MOON_DOTS) {
      const nx = d.sinP * (d.cosT * cosSA - d.sinT * sinSA);
      const ny = d.cosP;
      const nz = d.sinP * (d.sinT * cosSA + d.cosT * sinSA);

      if (nz >= 0) continue;

      const facing = -nz;
      const wz = mz + MOON_R * nz;
      const ds = FOV_DIST / (FOV_DIST + wz + R);
      const sx = cx + (mx + MOON_R * nx) * ds;
      const sy = cy + (my + MOON_R * ny) * ds;

      const lit = Math.max(0, nx * lx + ny * ly + nz * lz);

      let crater = 0;
      for (const c of rotCraters) {
        const dp = nx * c.nx + ny * c.ny + nz * c.nz;
        if (dp > c.cosR) {
          const t = ((dp - c.cosR) / (1 - c.cosR)) ** 0.65;
          crater = Math.max(crater, t * c.depth);
        }
      }

      let r, g, b;
      if (lit < 0.5) {
        const t = lit * 2;
        r = Math.round(58  + t * (201 - 58));
        g = Math.round(42  + t * (184 - 42));
        b = Math.round(92  + t * (232 - 92));
      } else {
        const t = (lit - 0.5) * 2;
        r = Math.round(201 + t * (240 - 201));
        g = Math.round(184 + t * (235 - 184));
        b = Math.round(232 + t * (255 - 232));
      }

      if (crater > 0) {
        r = Math.round(r + crater * (74  - r));
        g = Math.round(g + crater * (50  - g));
        b = Math.round(b + crater * (104 - b));
      }

      if (moonFrostPatches.length) {
        const lnx = d.sinP * d.cosT;
        const lny = d.cosP;
        const lnz = d.sinP * d.sinT;
        const MOON_FROST_R = 0.55;
        let frostW = 0;
        for (const fp of moonFrostPatches) {
          const fa = frostAlpha(fp.startTime);
          if (fa <= 0) continue;
          const dotP  = lnx*fp.lnx + lny*fp.lny + lnz*fp.lnz;
          const angle = Math.acos(Math.max(-1, Math.min(1, dotP)));
          if (angle < MOON_FROST_R) {
            const w = (1 - angle / MOON_FROST_R) ** 1.5 * fa;
            if (w > frostW) frostW = w;
          }
        }
        if (frostW > 0) {
          r = Math.round(r + frostW * (240 - r));
          g = Math.round(g + frostW * (250 - g));
          b = Math.round(b + frostW * (255 - b));
        }
      }

      if (moonGlobalFrost > 0) {
        r = Math.round(r + moonGlobalFrost * (240 - r));
        g = Math.round(g + moonGlobalFrost * (250 - g));
        b = Math.round(b + moonGlobalFrost * (255 - b));
      }

      const alpha = Math.min(1, facing * (0.55 + lit * 0.45));
      const dotR  = Math.max(0.35, 1.6 * facing * s);

      ctx.beginPath();
      ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
      ctx.fill();
    }

    ctx.restore();
  }

  function init() {
    canvas = document.getElementById('globe-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    window.addEventListener('blackhole-explode', e => {
      const { x: bhX, y: bhY } = e.detail;
      const rect     = canvas.getBoundingClientRect();
      const gcx      = rect.left + rect.width  / 2;
      const gcy      = rect.top  + rect.height / 2;
      const ddx      = bhX - gcx;
      const ddy      = bhY - gcy;
      const dist     = Math.hypot(ddx, ddy) || 1;
      const strength = Math.max(0.35, 1 - dist / 1200);

      const sinO    = Math.sin(moonOrbitAngle);
      const cosO    = Math.cos(moonOrbitAngle);
      const sinTilt = Math.sin(MOON_ORBIT_TILT);
      const cosTilt = Math.cos(MOON_ORBIT_TILT);
      const omx   =  MOON_ORBIT_R * cosO;
      const omy   = -MOON_ORBIT_R * sinO * sinTilt;
      const omz   =  MOON_ORBIT_R * sinO * cosTilt;
      const denom  = FOV_DIST + omz + R;
      const s0    = FOV_DIST / denom;
      const domx  = -MOON_ORBIT_R * sinO;
      const domy  = -MOON_ORBIT_R * cosO * sinTilt;
      const domz  =  MOON_ORBIT_R * cosO * cosTilt;
      const ds    = -FOV_DIST * domz / (denom * denom);
      const tdx   = domx * s0 + omx * ds;
      const tdy   = domy * s0 + omy * ds;
      const tmag  = Math.hypot(tdx, tdy) || 1;
      const moonSx = rect.left + ((cx + omx * s0) / W) * rect.width;
      const moonSy = rect.top  + ((cy + omy * s0) / H) * rect.height;
      const mddx  = moonSx - bhX;
      const mddy  = moonSy - bhY;
      const mdist = Math.hypot(mddx, mddy) || 1;
      moonOrbitSpeed += (mddx / mdist * tdx + mddy / mdist * tdy) / tmag * strength * 1.2;
    });

    window.addEventListener('comet-moon-impact', e => {
      const { vx, vy } = e.detail;
      const speed = Math.hypot(vx, vy) || 1;
      const sf    = Math.min(speed / 400, 2.0);

      if (e.detail.source === 'comet') {
        // Freeze orbit for 3 s and blanket the moon in frost
        moonFreezeEnd  = Date.now() + 3000;
        moonOrbitSpeed = 0;
        if (e.detail.x != null) {
          const moon = getMoonPos();
          const rect = canvas.getBoundingClientRect();
          const icx  = (e.detail.x - rect.left) * (W / rect.width);
          const icy  = (e.detail.y - rect.top)  * (H / rect.height);
          const mr   = MOON_R * moon.s;
          let nnx = (icx - moon.px) / mr;
          let nny = (icy - moon.py) / mr;
          const sq = 1 - nnx * nnx - nny * nny;
          let nnz = sq > 0 ? -Math.sqrt(sq) : 0;
          const nl = Math.hypot(nnx, nny, nnz) || 1;
          nnx /= nl; nny /= nl; nnz /= nl;
          const cosSA = Math.cos(moonSelfAngle);
          const sinSA = Math.sin(moonSelfAngle);
          moonFrostPatches.push({
            lnx:  nnx * cosSA + nnz * sinSA,
            lny:  nny,
            lnz: -nnx * sinSA + nnz * cosSA,
            startTime: Date.now(),
          });
        }
      } else {
        // Meteors / spaceship just nudge the orbit
        const tangX   = -Math.sin(moonOrbitAngle);
        const tangY   = -Math.cos(moonOrbitAngle) * Math.sin(MOON_ORBIT_TILT);
        const tangLen = Math.hypot(tangX, tangY) || 1;
        const proj    = (vx * tangX + vy * tangY) / (speed * tangLen);
        moonOrbitSpeed += proj * 0.08 * sf;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);

  window.getMoonScreenPos = function () {
    if (!canvas) return null;
    const m    = getMoonPos();
    const rect = canvas.getBoundingClientRect();
    const scl  = rect.width / W;
    return { x: rect.left + m.px * scl, y: rect.top + m.py * scl, r: MOON_R * m.s * scl };
  };

  window.Moon = {
    update() {
      moonSelfAngle += MOON_SELF_SPEED;
      const now = Date.now();
      if (moonFreezeEnd > 0) {
        if (now < moonFreezeEnd) {
          moonGlobalFrost = 1.0;
          moonOrbitSpeed  = 0;
        } else {
          const fadeAge   = (now - moonFreezeEnd) / 1000;
          moonGlobalFrost = Math.max(0, 1 - fadeAge / 2.5);
          if (moonGlobalFrost <= 0) moonFreezeEnd = 0;
          if (!moonDragging) {
            moonOrbitSpeed += (MOON_ORBIT_SPEED - moonOrbitSpeed) * MOON_ORBIT_DECAY;
            moonOrbitAngle += moonOrbitSpeed;
          }
        }
      } else if (!moonDragging) {
        moonOrbitSpeed += (MOON_ORBIT_SPEED - moonOrbitSpeed) * MOON_ORBIT_DECAY;
        moonOrbitAngle += moonOrbitSpeed;
      }
    },
    draw()          { drawMoon(getMoonPos()); },
    drawOrbitRing() { drawOrbitRing(); },
    getPos()        { return getMoonPos(); },
    isDragging()    { return moonDragging; },
    isOver(x, y) {
      const m = getMoonPos();
      return Math.hypot(x - m.px, y - m.py) < MOON_R * m.s * 2.0;
    },
    tryGrab(x, y) {
      const m = getMoonPos();
      if (Math.hypot(x - m.px, y - m.py) < MOON_R * m.s * 2.0) {
        moonDragging = true;
        moonDragVel  = 0;
        return true;
      }
      return false;
    },
    drag(x, y) {
      const prev     = moonOrbitAngle;
      moonOrbitAngle = nearestOrbitAngle(x, y, moonOrbitAngle);
      const dAngle   = moonOrbitAngle - prev;
      moonDragVel    = moonDragVel * 0.7 + Math.max(-0.05, Math.min(0.05, dAngle)) * 0.3;
    },
    release() {
      if (!moonDragging) return;
      moonDragging   = false;
      moonOrbitSpeed = Math.max(-0.22, Math.min(0.22, moonDragVel * 2.0));
    },
  };
})();
