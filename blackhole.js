// ── Black Hole ────────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('stars-canvas');
  const ctx    = canvas.getContext('2d');

  let blackHole       = null;
  let dyingBlackHoles = [];

  function spawnBlackHole(x, y) {
    if (blackHole) {
      blackHole.age = blackHole.maxAge * 0.92;
      if (!blackHole.explodeFired) {
        window.dispatchEvent(new CustomEvent('blackhole-explode', { detail: { x: blackHole.x, y: blackHole.y } }));
        blackHole.explodeFired = true;
      }
      dyingBlackHoles.push(blackHole);
    }
    blackHole = { x, y, baseRadius: 28 * (window.gadgetScale || 1), age: 0, maxAge: 5.5, rotation: 0, explodeFired: false };
  }

  function lensedPos(sx, sy, bh) {
    const frac     = bh.age / bh.maxAge;
    const bhAlpha  = frac < 0.05 ? frac / 0.05
                   : frac > 0.92 ? (1 - (frac - 0.92) / 0.08)
                   : 1;
    const evapFrac = Math.max(0, (frac - 0.92) / 0.08);
    const rs       = bh.baseRadius * Math.max(0.05, 1 - evapFrac * 0.9);

    const dx = sx - bh.x, dy = sy - bh.y;
    const d  = Math.hypot(dx, dy);
    if (d > bh.baseRadius * 22) return { x: sx, y: sy };
    if (d < rs) return null;
    if (d === 0) return { x: sx, y: sy };

    const ratio    = rs / d;
    const deflect  = Math.pow(ratio, 1.5) * bhAlpha;
    const orbit    = bh.rotation * ratio * ratio * bhAlpha;
    const compress = Math.pow(ratio, 1.5) * 0.32 * bhAlpha;
    const newD     = d * (1 - compress);
    const θ        = Math.atan2(dy, dx);
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
      Math.hypot(bh.x,                bh.y),
      Math.hypot(canvas.width - bh.x, bh.y),
      Math.hypot(bh.x,                canvas.height - bh.y),
      Math.hypot(canvas.width - bh.x, canvas.height - bh.y)
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

    const shadow = ctx.createRadialGradient(bh.x, bh.y, rs, bh.x, bh.y, rs * 13);
    shadow.addColorStop(0,    'rgba(0, 0,  0, 0.80)');
    shadow.addColorStop(0.12, 'rgba(2, 0,  8, 0.50)');
    shadow.addColorStop(0.40, 'rgba(4, 0, 12, 0.20)');
    shadow.addColorStop(1,    'rgba(0, 0,  0, 0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, rs * 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, rs * 1.02, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(190, 160, 255, ${0.22 + evapFrac * 0.78})`;
    ctx.lineWidth   = 0.7 + evapFrac * 3.5;
    ctx.shadowColor = 'rgba(180, 150, 255, 1)';
    ctx.shadowBlur  = 5 + evapFrac * 28;
    ctx.stroke();
    ctx.restore();

    if (evapFrac > 0) {
      const maxR = screenEdgeDist(bh);

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

      const easeOut = t => 1 - Math.pow(1 - t, 3);
      const wave1R  = easeOut(evapFrac) * maxR;
      ctx.save();
      ctx.beginPath();
      ctx.arc(bh.x, bh.y, rs + wave1R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(220, 190, 255, ${(1 - evapFrac) * 0.75})`;
      ctx.lineWidth   = 4 * (1 - evapFrac) + 0.5;
      ctx.shadowColor = 'rgba(210, 180, 255, 1)';
      ctx.shadowBlur  = 30;
      ctx.stroke();
      ctx.restore();

      if (evapFrac > 0.18) {
        const w2f    = (evapFrac - 0.18) / 0.82;
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

    if (!bh.waveHits.has('bhExplode')) {
      bh.waveHits.add('bhExplode');
      const innerR = bh.baseRadius * 8;
      if (window.Asteroids)    window.Asteroids.bhExplode(bh.x, bh.y, innerR);
      if (window.Comet)        window.Comet.blastInRadius(bh.x, bh.y, innerR);
      if (window.MeteorShower) window.MeteorShower.blastInRadius(bh.x, bh.y, innerR);
    }

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
          const impX = gcx - nx * globeR;
          const impY = gcy - ny * globeR;
          if (window.triggerGlobeRipple) window.triggerGlobeRipple(impX, impY);
        }
      }
    }

    if (window.Comet) window.Comet.blastInRadius(bh.x, bh.y, waveR);
    if (window.MeteorShower) window.MeteorShower.blastInRadius(bh.x, bh.y, waveR);
  }

  window.spawnBlackHole = spawnBlackHole;

  window.BlackHole = {
    update(dt) {
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
        blackHole.rotation += dt * 2.8;
        drawBlackHole(blackHole);
        checkBHWave(blackHole);
        if (!blackHole.explodeFired && blackHole.age / blackHole.maxAge > 0.92) {
          window.dispatchEvent(new CustomEvent('blackhole-explode', { detail: { x: blackHole.x, y: blackHole.y } }));
          blackHole.explodeFired = true;
        }
        if (blackHole.age >= blackHole.maxAge) blackHole = null;
      }
    },
    hasAny:       () => !!(blackHole || dyingBlackHoles.length),
    applyLensing: (x, y) => applyAllLensing(x, y),
    getAll:       () => blackHole ? [blackHole, ...dyingBlackHoles] : [...dyingBlackHoles],
  };
})();
