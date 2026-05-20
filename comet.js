// ── Comet ─────────────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('stars-canvas');
  const ctx    = canvas.getContext('2d');

  let comets     = [];
  let explosions = [];

  function spawnImpactDebris(x, y, vx, vy) {
    const spd  = Math.hypot(vx, vy) || 1;
    const nx   = vx / spd, ny = vy / spd;
    for (let i = 0; i < 55; i++) {
      const directional = i < 36;
      const spread = directional
        ? (Math.random() - 0.5) * Math.PI * 1.5
        : Math.random() * Math.PI * 2;
      const cs = Math.cos(spread), ss = Math.sin(spread);
      const dx = directional ? nx * cs - ny * ss : Math.cos(spread);
      const dy = directional ? nx * ss + ny * cs : Math.sin(spread);
      const s  = 300 + Math.random() * 500;
      const ml = 0.9 + Math.random() * 0.7;
      window.smokeParticles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: dx * s, vy: dy * s,
        life: ml, maxLife: ml,
        r: 5 + Math.random() * 10,
        core: Math.random() < 0.5, comet: true,
      });
    }
  }

  function blastComet(c, srcX, srcY) {
    const dx   = c.x - srcX, dy = c.y - srcY;
    const dist = Math.hypot(dx, dy) || 1;
    const nx   = dx / dist, ny = dy / dist;
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
      window.smokeParticles.push({
        x: c.x + (Math.random() - 0.5) * 14,
        y: c.y + (Math.random() - 0.5) * 14,
        vx: sdx * spd, vy: sdy * spd,
        life: maxLife, maxLife,
        r: 1.5 + Math.random() * 2.5,
        core: Math.random() < 0.6, comet: true,
      });
    }
  }

  function spawnExplosion(x, y) {
    explosions.push({ x, y, age: 0, maxAge: 0.65 });
  }

  function drawExplosion(exp, gs = 1) {
    const frac = exp.age / exp.maxAge;

    if (frac < 0.5) {
      const f2 = frac / 0.5;
      const r  = ((1 - f2) * 45 + 6) * gs;
      const fg = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, r);
      fg.addColorStop(0,    `rgba(255,255,255,${(1 - f2) * 0.92})`);
      fg.addColorStop(0.35, `rgba(180,245,255,${(1 - f2) * 0.65})`);
      fg.addColorStop(1,    'rgba(60,160,255,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.globalAlpha = Math.max(0, (1 - frac) * 0.90);
    ctx.strokeStyle = frac < 0.45 ? 'rgba(210,248,255,1)' : 'rgba(80,185,255,0.85)';
    ctx.lineWidth   = ((1 - frac) * 3.5 + 0.4) * gs;
    ctx.shadowColor = 'rgba(100,220,255,0.7)';
    ctx.shadowBlur  = 18 * (1 - frac) * gs;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, Math.max(0.5, frac * 85 * gs), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (frac > 0.08) {
      const f2 = (frac - 0.08) / 0.92;
      ctx.save();
      ctx.globalAlpha = Math.max(0, (1 - f2) * 0.55);
      ctx.strokeStyle = 'rgba(160,235,255,0.9)';
      ctx.lineWidth   = ((1 - f2) * 2 + 0.3) * gs;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, Math.max(0.5, f2 * 55 * gs), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function spawnComet(x, y, vx, vy) {
    const MAX_SPD = 320;
    const s = Math.hypot(vx, vy);
    if (s > MAX_SPD) { vx = vx / s * MAX_SPD; vy = vy / s * MAX_SPD; }
    if (comets.length >= 5) blastComet(comets.shift(), x, y);
    comets.push({ x, y, vx, vy, hp: 3 });
  }

  function updateComet(dt) {
    for (let i = explosions.length - 1; i >= 0; i--) {
      explosions[i].age += dt;
      if (explosions[i].age >= explosions[i].maxAge) explosions.splice(i, 1);
    }

    const allBHs  = window.BlackHole ? window.BlackHole.getAll() : [];
    const globeEl = document.getElementById('globe-canvas');
    const gr      = globeEl ? globeEl.getBoundingClientRect() : null;
    const moon    = window.getMoonScreenPos ? window.getMoonScreenPos() : null;
    const margin  = 120;

    // Comet-comet collisions
    for (let i = comets.length - 1; i >= 1; i--) {
      if (comets[i].swirl) continue;
      for (let j = i - 1; j >= 0; j--) {
        if (comets[j].swirl) continue;
        if (Math.hypot(comets[i].x - comets[j].x, comets[i].y - comets[j].y) < 18) {
          const mx = (comets[i].x + comets[j].x) * 0.5;
          const my = (comets[i].y + comets[j].y) * 0.5;
          spawnExplosion(mx, my);
          spawnImpactDebris(mx, my, comets[i].vx, comets[i].vy);
          spawnImpactDebris(mx, my, comets[j].vx, comets[j].vy);
          comets.splice(i, 1);
          comets.splice(j, 1);
          i = j;
          break;
        }
      }
    }

    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];

      if (c.swirl) {
        const sw   = c.swirl;
        sw.age    += dt;
        if (sw.bh.age >= sw.bh.maxAge) { comets.splice(i, 1); continue; }
        const frac = sw.age / sw.maxAge;
        const r    = sw.r * Math.pow(1 - frac, 0.65);
        const bhF  = sw.bh.age / sw.bh.maxAge;
        const bhEv = Math.max(0, (bhF - 0.92) / 0.08);
        const rs   = sw.bh.baseRadius * Math.max(0.05, 1 - bhEv * 0.9);
        if (frac >= 1 || r <= rs) { comets.splice(i, 1); continue; }
        sw.angle += (3 + frac * 10) * dt;
        c.x = sw.bh.x + Math.cos(sw.angle) * r;
        c.y = sw.bh.y + Math.sin(sw.angle) * r;
        continue;
      }

      for (const bh of allBHs) {
        const dx = bh.x - c.x, dy = bh.y - c.y;
        const d  = Math.hypot(dx, dy);
        if (d < bh.baseRadius * 8) {
          c.swirl = { bh, angle: Math.atan2(c.y - bh.y, c.x - bh.x), r: Math.max(d, 4), age: 0, maxAge: 1.2 };
          break;
        }
        if (d < bh.baseRadius * 30) {
          const g = 1200000 / (d * d);
          c.vx += (dx / d) * g * dt;
          c.vy += (dy / d) * g * dt;
        }
      }
      if (c.swirl) continue;

      c.x += c.vx * dt;
      c.y += c.vy * dt;

      if (window.smokeParticles.length < 600) {
        const spd = Math.hypot(c.vx, c.vy) || 1;
        const bx  = -c.vx / spd, by = -c.vy / spd;
        for (let j = 0; j < 5; j++) {
          const spread = (Math.random() - 0.5) * 1.1;
          const cs = Math.cos(spread), ss = Math.sin(spread);
          window.smokeParticles.push({
            x: c.x + bx * 10 + (Math.random() - 0.5) * 6,
            y: c.y + by * 10 + (Math.random() - 0.5) * 6,
            vx: (bx * cs - by * ss) * (25 + Math.random() * 45),
            vy: (bx * ss + by * cs) * (25 + Math.random() * 45),
            life: 0.35 + Math.random() * 0.3,
            maxLife: 0.55,
            r: 2.5 + Math.random() * 3.5,
            core: Math.random() < 0.4,
            comet: true,
          });
        }
      }

      if (c.x < -margin || c.x > canvas.width  + margin ||
          c.y < -margin || c.y > canvas.height + margin) {
        comets.splice(i, 1); continue;
      }

      if (gr) {
        const gcx = gr.left + gr.width  / 2;
        const gcy = gr.top  + gr.height / 2;
        if (Math.hypot(c.x - gcx, c.y - gcy) < gr.width * 0.22) {
          window.dispatchEvent(new CustomEvent('comet-globe-impact',
            { detail: { x: c.x, y: c.y, vx: c.vx, vy: c.vy, source: 'comet' } }));
          spawnImpactDebris(c.x, c.y, c.vx, c.vy);
          comets.splice(i, 1); continue;
        }
      }

      if (moon && Math.hypot(c.x - moon.x, c.y - moon.y) < moon.r * 1.4) {
        window.dispatchEvent(new CustomEvent('comet-moon-impact',
          { detail: { x: c.x, y: c.y, vx: c.vx, vy: c.vy, source: 'comet' } }));
        spawnImpactDebris(c.x, c.y, c.vx, c.vy);
        comets.splice(i, 1); continue;
      }

      const ship = window.Spaceship && window.Spaceship.get();
      if (ship && !ship.exploding && Math.hypot(c.x - ship.x, c.y - ship.y) < 22) {
        ship.hits += 5;
        spawnImpactDebris(c.x, c.y, c.vx, c.vy);
        if (ship.hits >= 10) window.Spaceship.triggerExplosion();
        comets.splice(i, 1); continue;
      }

      if (window.Asteroids && window.Asteroids.checkHit(c.x, c.y, 18, 1)) {
        spawnExplosion(c.x, c.y);
        comets.splice(i, 1); continue;
      }
    }
  }

  function drawComet() {
    const gs = window.gadgetScale || 1;
    for (const exp of explosions) drawExplosion(exp, gs);
    for (const c of comets) {
      if (c.swirl) {
        const frac  = c.swirl.age / c.swirl.maxAge;
        const scale = Math.max(0, 1 - Math.pow(frac, 0.55));
        if (scale < 0.02) continue;
        const r = Math.max(0.1, 28 * gs * scale);
        ctx.save();
        ctx.globalAlpha = scale;
        ctx.shadowColor = 'rgba(160, 240, 255, 1)';
        ctx.shadowBlur  = 50 * gs * scale;
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
      const tailLen = Math.min(200, spd * 0.28) * gs;
      const tx = c.x - nx * tailLen, ty = c.y - ny * tailLen;

      const tailGrad = ctx.createLinearGradient(c.x, c.y, tx, ty);
      tailGrad.addColorStop(0,   'rgba(220, 240, 255, 0.95)');
      tailGrad.addColorStop(0.3, 'rgba(100, 220, 255, 0.60)');
      tailGrad.addColorStop(1,   'rgba(60, 140, 255, 0)');
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth   = 10 * gs;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.shadowColor = 'rgba(160, 240, 255, 1)';
      ctx.shadowBlur  = 50 * gs;
      const coreGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 26 * gs);
      coreGrad.addColorStop(0,   'rgba(255, 255, 255, 1)');
      coreGrad.addColorStop(0.4, 'rgba(180, 240, 255, 0.85)');
      coreGrad.addColorStop(1,   'rgba(60, 160, 255, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 26 * gs, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  window.spawnComet       = spawnComet;
  window.spawnImpactDebris = spawnImpactDebris;

  window.Comet = {
    update: updateComet,
    draw:   drawComet,
    getAll: () => comets,
    damage(c, amount) {
      if (c.swirl || c.hp <= 0) return;
      c.hp -= amount;
      if (c.hp <= 0) {
        spawnImpactDebris(c.x, c.y, c.vx, c.vy);
        const idx = comets.indexOf(c);
        if (idx >= 0) comets.splice(idx, 1);
      }
    },
    blastInRadius(cx, cy, r) {
      for (let i = comets.length - 1; i >= 0; i--) {
        if (r >= Math.hypot(cx - comets[i].x, cy - comets[i].y) - 8) {
          spawnImpactDebris(comets[i].x, comets[i].y, comets[i].vx, comets[i].vy);
          comets.splice(i, 1);
        }
      }
    },
  };
})();
