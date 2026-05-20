// ── Spaceship ─────────────────────────────────────────────────────
(function () {
  const canvas = document.getElementById('stars-canvas');
  const ctx    = canvas.getContext('2d');

  let spaceship    = null;
  let shipImpacts  = [];
  let shipDebris   = [];
  let lasers       = [];
  let laserImpacts = [];

  function lerpAngle(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d >  Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * Math.min(1, t);
  }

  function emitSmoke() {
    if (!spaceship) return;
    const bx = -Math.sin(spaceship.angle);
    const by =  Math.cos(spaceship.angle);
    const rx = spaceship.x + bx * 12 + (Math.random() - 0.5) * 3;
    const ry = spaceship.y + by * 12 + (Math.random() - 0.5) * 3;
    const spread = (Math.random() - 0.5) * 0.65;
    const cs = Math.cos(spread), ss = Math.sin(spread);
    const speed   = 32 + Math.random() * 35;
    const maxLife = 0.50 + Math.random() * 0.35;
    window.smokeParticles.push({
      x: rx, y: ry,
      vx: (bx * cs - by * ss) * speed + spaceship.vx * 0.12,
      vy: (bx * ss + by * cs) * speed + spaceship.vy * 0.12,
      life: maxLife, maxLife,
      r: 2.5 + Math.random() * 2.5,
      core: Math.random() < 0.45,
    });
  }

  function spawnBounceDebris(x, y, vx, vy) {
    if (!window.smokeParticles) return;
    const spd = Math.hypot(vx, vy) || 1;
    const nx  = vx / spd, ny = vy / spd;
    for (let i = 0; i < 28; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 2.0;
      const cs = Math.cos(spread), ss = Math.sin(spread);
      const dx = nx * cs - ny * ss, dy = nx * ss + ny * cs;
      const s  = 90 + Math.random() * 180;
      const ml = 0.30 + Math.random() * 0.30;
      window.smokeParticles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: dx * s, vy: dy * s,
        life: ml, maxLife: ml,
        r: 2.5 + Math.random() * 3.5,
        core: Math.random() < 0.5,
      });
    }
  }

  function spawnShipImpact(x, y) {
    shipImpacts.push({ x, y, age: 0, maxAge: 0.50 });
  }

  function drawShipImpacts() {
    for (const imp of shipImpacts) {
      const frac = imp.age / imp.maxAge;

      // Central flash — bright white-purple burst
      if (frac < 0.30) {
        const f2  = frac / 0.30;
        const fr  = 55 * (1 - f2);
        const fg  = ctx.createRadialGradient(imp.x, imp.y, 0, imp.x, imp.y, fr);
        fg.addColorStop(0,    `rgba(255, 248, 255, ${(1 - f2) * 0.98})`);
        fg.addColorStop(0.25, `rgba(210, 170, 255, ${(1 - f2) * 0.80})`);
        fg.addColorStop(0.60, `rgba(130,  70, 255, ${(1 - f2) * 0.45})`);
        fg.addColorStop(1,    'rgba(60, 20, 180, 0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(imp.x, imp.y, fr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Primary expanding ring
      const r1 = frac * 75;
      ctx.save();
      ctx.shadowColor = 'rgba(190, 130, 255, 1)';
      ctx.shadowBlur  = 14 * (1 - frac);
      ctx.globalAlpha = (1 - frac) * 0.90;
      ctx.strokeStyle = frac < 0.45 ? '#e8d8ff' : '#a060ff';
      ctx.lineWidth   = 3.5 * (1 - frac) + 0.4;
      ctx.beginPath();
      ctx.arc(imp.x, imp.y, Math.max(0.5, r1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Secondary ring, slightly delayed
      if (frac > 0.12) {
        const f2 = (frac - 0.12) / 0.88;
        const r2 = f2 * 45;
        ctx.save();
        ctx.globalAlpha = (1 - f2) * 0.55;
        ctx.strokeStyle = '#cc99ff';
        ctx.lineWidth   = 2.0 * (1 - f2) + 0.2;
        ctx.beginPath();
        ctx.arc(imp.x, imp.y, Math.max(0.5, r2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Debris shape library — points in local space, roughly matching the ship silhouette
  const DEBRIS_SHAPES = [
    [[0,-12],[-3,0],[3,0]],                        // nose tip
    [[-12,7],[-5,2],[-3,-3]],                      // left wing
    [[12,7],[5,2],[3,-3]],                         // right wing
    [[-3,-12],[3,-12],[2,-3],[-2,-3]],             // upper hull
    [[-4,0],[4,0],[3,7],[-3,7]],                   // mid hull
    [[-2,8],[2,8],[3,13],[-3,13]],                 // engine block
    [[-8,3],[-4,-1],[-2,5]],                       // left strut
    [[8,3],[4,-1],[2,5]],                          // right strut
    [[0,-8],[-5,2],[1,5]],                         // shard A
    [[2,-5],[6,0],[-1,6],[-4,1]],                  // shard B
  ];

  function spawnExplosionDebris(cx, cy, baseAngle) {
    for (const shape of DEBRIS_SHAPES) {
      const angle  = Math.random() * Math.PI * 2;
      const speed  = 70 + Math.random() * 220;
      const maxAge = 0.7 + Math.random() * 0.6;
      shipDebris.push({
        x: cx + (Math.random() - 0.5) * 14,
        y: cy + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle: baseAngle + (Math.random() - 0.5) * Math.PI,
        angVel: (Math.random() - 0.5) * 9,
        age: 0, maxAge, shape,
      });
    }
  }

  function drawShipDebris() {
    for (const d of shipDebris) {
      const frac  = d.age / d.maxAge;
      const alpha = Math.pow(1 - frac, 1.4);
      if (alpha < 0.02) continue;
      // bright white-purple → ship purple → dark purple
      const t = Math.min(1, frac * 2.0);
      const r = Math.round(t < 0.5 ? 225 - t * 2 * 80  : 145 - (t - 0.5) * 2 * 95);
      const g = Math.round(t < 0.5 ? 210 - t * 2 * 125 :  85 - (t - 0.5) * 2 * 60);
      const b = Math.round(t < 0.5 ? 255 - t * 2 * 25  : 230 - (t - 0.5) * 2 * 160);
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      ctx.globalAlpha  = alpha;
      ctx.strokeStyle  = `rgb(${r},${g},${b})`;
      ctx.lineWidth    = 1.6;
      ctx.lineJoin     = 'round';
      ctx.shadowColor  = `rgb(${r},${g},${b})`;
      ctx.shadowBlur   = 6 * alpha;
      ctx.beginPath();
      ctx.moveTo(d.shape[0][0], d.shape[0][1]);
      for (let i = 1; i < d.shape.length; i++) ctx.lineTo(d.shape[i][0], d.shape[i][1]);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function triggerShipExplosion() {
    if (!spaceship || spaceship.exploding) return;
    spaceship.active        = false;
    spaceship.exploding     = true;
    spaceship.explodeAge    = 0;
    spaceship.explodeMaxAge = 1.1;

    // Fast directional burst
    for (let i = 0; i < 60; i++) {
      const angle   = (Math.PI * 2 * i / 60) + (Math.random() - 0.5) * 0.55;
      const speed   = 180 + Math.random() * 420;
      const maxLife = 0.35 + Math.random() * 0.45;
      window.smokeParticles.push({
        x: spaceship.x + (Math.random() - 0.5) * 14,
        y: spaceship.y + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: maxLife, maxLife,
        r: 4 + Math.random() * 6,
        core: Math.random() < 0.55,
      });
    }
    // Slow expanding fireball cloud
    for (let i = 0; i < 32; i++) {
      const angle   = Math.random() * Math.PI * 2;
      const speed   = 15 + Math.random() * 70;
      const maxLife = 0.55 + Math.random() * 0.55;
      window.smokeParticles.push({
        x: spaceship.x + (Math.random() - 0.5) * 22,
        y: spaceship.y + (Math.random() - 0.5) * 22,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: maxLife, maxLife,
        r: 9 + Math.random() * 13,
        core: false,
      });
    }

    spawnExplosionDebris(spaceship.x, spaceship.y, spaceship.angle);

    const BLAST_R = 280;
    const ex = spaceship.x, ey = spaceship.y;

    const globeEl = document.getElementById('globe-canvas');
    if (globeEl) {
      const gr   = globeEl.getBoundingClientRect();
      const gcx  = gr.left + gr.width  / 2;
      const gcy  = gr.top  + gr.height / 2;
      const ddx  = gcx - ex, ddy = gcy - ey;
      const dist = Math.hypot(ddx, ddy);
      if (dist < BLAST_R) {
        const strength = 1 - dist / BLAST_R;
        const spd = 500 * strength;
        window.dispatchEvent(new CustomEvent('comet-globe-impact', {
          detail: { x: ex, y: ey, vx: (ddx / dist) * spd, vy: (ddy / dist) * spd, source: 'spaceship' }
        }));
      }
    }

    const moon = window.getMoonScreenPos && window.getMoonScreenPos();
    if (moon) {
      const ddx  = moon.x - ex, ddy = moon.y - ey;
      const dist = Math.hypot(ddx, ddy);
      if (dist < BLAST_R) {
        const strength = 1 - dist / BLAST_R;
        const spd = 500 * strength;
        window.dispatchEvent(new CustomEvent('comet-moon-impact', {
          detail: { x: moon.x, y: moon.y, vx: (ddx / dist) * spd, vy: (ddy / dist) * spd, source: 'spaceship' }
        }));
      }
    }
  }

  function updateSpaceship(dt) {
    for (let i = shipImpacts.length - 1; i >= 0; i--) {
      shipImpacts[i].age += dt;
      if (shipImpacts[i].age >= shipImpacts[i].maxAge) shipImpacts.splice(i, 1);
    }
    for (let i = shipDebris.length - 1; i >= 0; i--) {
      const d = shipDebris[i];
      d.age   += dt;
      if (d.age >= d.maxAge) { shipDebris.splice(i, 1); continue; }
      d.x     += d.vx * dt;
      d.y     += d.vy * dt;
      d.angle += d.angVel * dt;
    }
    for (let i = laserImpacts.length - 1; i >= 0; i--) {
      laserImpacts[i].age += dt;
      if (laserImpacts[i].age >= laserImpacts[i].maxAge) laserImpacts.splice(i, 1);
    }

    if (lasers.length > 0) {
      const lGlobeEl = document.getElementById('globe-canvas');
      const lgr      = lGlobeEl ? lGlobeEl.getBoundingClientRect() : null;
      const lmoon    = window.getMoonScreenPos ? window.getMoonScreenPos() : null;
      for (let i = lasers.length - 1; i >= 0; i--) {
        const l   = lasers[i];
        l.age    += dt;
        l.trail.unshift({ x: l.x, y: l.y });
        if (l.trail.length > 6) l.trail.pop();
        l.x += l.vx * dt;
        l.y += l.vy * dt;

        let lhit = false;
        const lspd = Math.hypot(l.vx, l.vy);
        const lnx  = l.vx / lspd, lny = l.vy / lspd;

        if (lgr) {
          const gcx = lgr.left + lgr.width  * 0.5;
          const gcy = lgr.top  + lgr.height * 0.5;
          if (Math.hypot(l.x - gcx, l.y - gcy) < lgr.width * 0.22) {
            window.dispatchEvent(new CustomEvent('comet-globe-impact', {
              detail: { x: l.x, y: l.y, vx: lnx * 280, vy: lny * 280, source: 'laser' }
            }));
            laserImpacts.push({ x: l.x, y: l.y, age: 0, maxAge: 0.28 });
            lhit = true;
          }
        }
        if (!lhit && lmoon && Math.hypot(l.x - lmoon.x, l.y - lmoon.y) < lmoon.r * 1.3) {
          window.dispatchEvent(new CustomEvent('comet-moon-impact', {
            detail: { x: l.x, y: l.y, vx: lnx * 280, vy: lny * 280, source: 'laser' }
          }));
          laserImpacts.push({ x: l.x, y: l.y, age: 0, maxAge: 0.28 });
          lhit = true;
        }
        if (!lhit && window.Asteroids && window.Asteroids.checkHit(l.x, l.y, 6, 1)) {
          laserImpacts.push({ x: l.x, y: l.y, age: 0, maxAge: 0.28 });
          lhit = true;
        }
        if (lhit || l.age > 3.5 ||
            l.x < -60 || l.x > canvas.width  + 60 ||
            l.y < -60 || l.y > canvas.height + 60) {
          lasers.splice(i, 1);
        }
      }
    }

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

    if (spaceship.active) {
      const dx   = spaceship.targetX - spaceship.x;
      const dy   = spaceship.targetY - spaceship.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const gain = 28;
        spaceship.vx += (dx / dist) * Math.min(dist, 160) * gain * dt;
        spaceship.vy += (dy / dist) * Math.min(dist, 160) * gain * dt;
      }
    }

    const speed = Math.hypot(spaceship.vx, spaceship.vy);
    if (speed > 520) {
      spaceship.vx = spaceship.vx / speed * 520;
      spaceship.vy = spaceship.vy / speed * 520;
    }

    const drag = Math.pow(spaceship.active ? 0.97 : 0.96, dt * 60);
    spaceship.vx *= drag;
    spaceship.vy *= drag;

    spaceship.x += spaceship.vx * dt;
    spaceship.y += spaceship.vy * dt;

    const spd = Math.hypot(spaceship.vx, spaceship.vy);
    if (spaceship._aimX != null) {
      const aimDx = spaceship._aimX - spaceship.x;
      const aimDy = spaceship._aimY - spaceship.y;
      if (Math.hypot(aimDx, aimDy) > 5) {
        spaceship.angle = Math.atan2(aimDy, aimDx) + Math.PI / 2;
      }
    } else if (spd > 12) {
      spaceship.angle = lerpAngle(
        spaceship.angle,
        Math.atan2(spaceship.vy, spaceship.vx) + Math.PI / 2,
        Math.min(1, dt * 14)
      );
    }

    if (spd > 25 && window.smokeParticles.length < 300) {
      spaceship.emitAccum += dt * (spd / 80) * 60;
      while (spaceship.emitAccum >= 1) { emitSmoke(); spaceship.emitAccum--; }
    }

    if (spaceship.bounceCD > 0) spaceship.bounceCD -= dt;

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
        spaceship.x = gcx + nx * (globeR + 8);
        spaceship.y = gcy + ny * (globeR + 8);
        const dot = spaceship.vx * nx + spaceship.vy * ny;
        if (spaceship.bounceCD <= 0) {
          if (dot < 0) {
            const inVx = spaceship.vx, inVy = spaceship.vy;
            spaceship.vx = (spaceship.vx - 2 * dot * nx) * 0.65;
            spaceship.vy = (spaceship.vy - 2 * dot * ny) * 0.65;
            spawnBounceDebris(spaceship.x, spaceship.y, inVx, inVy);
            spawnShipImpact(spaceship.x, spaceship.y);
            window.dispatchEvent(new CustomEvent('comet-globe-impact',
              { detail: { x: spaceship.x, y: spaceship.y, vx: inVx, vy: inVy, source: 'spaceship' } }));
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
            spawnBounceDebris(spaceship.x, spaceship.y, inVx, inVy);
            spawnShipImpact(spaceship.x, spaceship.y);
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

    // Canvas bounds — reflect velocity, no health penalty
    const MARGIN = 20;
    if (spaceship.x < MARGIN && spaceship.vx < 0) {
      spaceship.x  = MARGIN;
      spaceship.vx = -spaceship.vx * 0.65;
    } else if (spaceship.x > canvas.width - MARGIN && spaceship.vx > 0) {
      spaceship.x  = canvas.width - MARGIN;
      spaceship.vx = -spaceship.vx * 0.65;
    }
    if (spaceship.y < MARGIN && spaceship.vy < 0) {
      spaceship.y  = MARGIN;
      spaceship.vy = -spaceship.vy * 0.65;
    } else if (spaceship.y > canvas.height - MARGIN && spaceship.vy > 0) {
      spaceship.y  = canvas.height - MARGIN;
      spaceship.vy = -spaceship.vy * 0.65;
    }


  }

  function drawLasers() {
    const gs = window.gadgetScale || 1;

    for (const imp of laserImpacts) {
      const frac = imp.age / imp.maxAge;
      if (frac < 0.4) {
        const f2 = frac / 0.4;
        const r  = (1 - f2) * 22 * gs;
        const fg = ctx.createRadialGradient(imp.x, imp.y, 0, imp.x, imp.y, r);
        fg.addColorStop(0,   `rgba(255, 255, 200, ${(1 - f2) * 0.95})`);
        fg.addColorStop(0.3, `rgba(255, 80,  20, ${(1 - f2) * 0.70})`);
        fg.addColorStop(1,   'rgba(180, 0, 0, 0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(imp.x, imp.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.globalAlpha = (1 - frac) * 0.85;
      ctx.strokeStyle = frac < 0.5 ? '#ff6030' : '#cc1000';
      ctx.lineWidth   = ((1 - frac) * 2.5 + 0.3) * gs;
      ctx.shadowColor = 'rgba(255, 60, 0, 1)';
      ctx.shadowBlur  = 12 * (1 - frac);
      ctx.beginPath();
      ctx.arc(imp.x, imp.y, Math.max(0.5, frac * 30 * gs), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const l of lasers) {
      const pts = [{ x: l.x, y: l.y }, ...l.trail];
      if (pts.length >= 2) {
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < pts.length - 1; i++) {
          const t = 1 - i / pts.length;
          ctx.globalAlpha = t * 0.88;
          ctx.strokeStyle = i < 2 ? 'rgba(255, 200, 120, 1)' : 'rgba(255, 30, 0, 0.85)';
          ctx.lineWidth   = Math.max(0.5, (2.8 - i * 0.35) * gs);
          ctx.shadowColor = 'rgba(255, 60, 0, 1)';
          ctx.shadowBlur  = 14 * t;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.shadowColor = 'rgba(255, 60, 0, 1)';
      ctx.shadowBlur  = 20 * gs;
      const hg = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 7 * gs);
      hg.addColorStop(0,   'rgba(255, 255, 255, 1)');
      hg.addColorStop(0.4, 'rgba(255, 100, 30, 0.85)');
      hg.addColorStop(1,   'rgba(200, 0, 0, 0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 7 * gs, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawSpaceship() {
    drawShipImpacts();
    drawShipDebris();
    drawLasers();
    if (!spaceship) return;
    ctx.save();

    if (spaceship.exploding) {
      const prog    = spaceship.explodeAge / spaceship.explodeMaxAge;
      const easeOut = t => 1 - Math.pow(1 - t, 3);

      // White-hot core flash with fire-to-purple gradient
      const flashPeak = Math.sin(prog * Math.PI) * (1 - prog);
      if (flashPeak > 0.01) {
        const flash = ctx.createRadialGradient(spaceship.x, spaceship.y, 0, spaceship.x, spaceship.y, 220);
        flash.addColorStop(0,    `rgba(255, 255, 255,  ${flashPeak * 0.99})`);
        flash.addColorStop(0.04, `rgba(255, 245, 200,  ${flashPeak * 0.95})`);
        flash.addColorStop(0.12, `rgba(255, 160,  40,  ${flashPeak * 0.75})`);
        flash.addColorStop(0.28, `rgba(200,  80, 255,  ${flashPeak * 0.45})`);
        flash.addColorStop(0.55, `rgba( 90,  30, 180,  ${flashPeak * 0.18})`);
        flash.addColorStop(1,    'rgba(0, 0, 0, 0)');
        ctx.fillStyle = flash;
        ctx.beginPath();
        ctx.arc(spaceship.x, spaceship.y, 220, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fast shockwave — fire-orange, gone by halfway
      const shockFrac = Math.min(1, prog * 2.2);
      if (shockFrac < 1) {
        const shockR = easeOut(shockFrac) * 340;
        ctx.save();
        ctx.globalAlpha = (1 - shockFrac) * 0.80;
        ctx.shadowColor = 'rgba(255, 200, 80, 1)';
        ctx.shadowBlur  = 22;
        ctx.strokeStyle = `rgba(255, 210, 100, ${(1 - shockFrac) * 0.85})`;
        ctx.lineWidth   = 5.5 * (1 - shockFrac) + 0.4;
        ctx.beginPath();
        ctx.arc(spaceship.x, spaceship.y, Math.max(1, shockR), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Fire ring — orange, mid-speed
      if (prog > 0.04) {
        const pf     = (prog - 0.04) / 0.96;
        const fireR  = easeOut(pf) * 200;
        ctx.save();
        ctx.globalAlpha = (1 - pf) * 0.70;
        ctx.shadowColor = 'rgba(255, 120, 30, 1)';
        ctx.shadowBlur  = 18;
        ctx.strokeStyle = `rgba(255, 145, 50, ${(1 - pf) * 0.80})`;
        ctx.lineWidth   = 4.0 * (1 - pf) + 0.3;
        ctx.beginPath();
        ctx.arc(spaceship.x, spaceship.y, Math.max(1, fireR), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Primary purple ring
      const wave1R = easeOut(prog) * 270;
      ctx.save();
      ctx.globalAlpha = (1 - prog) * 0.92;
      ctx.shadowColor = 'rgba(215, 180, 255, 1)';
      ctx.shadowBlur  = 36;
      ctx.strokeStyle = `rgba(230, 200, 255, ${(1 - prog) * 0.95})`;
      ctx.lineWidth   = 6.0 * (1 - prog) + 0.4;
      ctx.beginPath();
      ctx.arc(spaceship.x, spaceship.y, Math.max(1, wave1R), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Secondary purple ring, delayed
      if (prog > 0.10) {
        const p2     = (prog - 0.10) / 0.90;
        const wave2R = easeOut(p2) * 190;
        ctx.save();
        ctx.globalAlpha = (1 - p2) * 0.62;
        ctx.shadowColor = 'rgba(190, 148, 255, 1)';
        ctx.shadowBlur  = 20;
        ctx.strokeStyle = `rgba(200, 158, 255, ${(1 - p2) * 0.70})`;
        ctx.lineWidth   = 3.5 * (1 - p2) + 0.3;
        ctx.beginPath();
        ctx.arc(spaceship.x, spaceship.y, Math.max(1, wave2R), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Third ring — cool blue-purple trailing wave
      if (prog > 0.22) {
        const p3     = (prog - 0.22) / 0.78;
        const wave3R = easeOut(p3) * 130;
        ctx.save();
        ctx.globalAlpha = (1 - p3) * 0.45;
        ctx.shadowColor = 'rgba(130, 180, 255, 1)';
        ctx.shadowBlur  = 14;
        ctx.strokeStyle = `rgba(160, 200, 255, ${(1 - p3) * 0.55})`;
        ctx.lineWidth   = 2.4 * (1 - p3) + 0.2;
        ctx.beginPath();
        ctx.arc(spaceship.x, spaceship.y, Math.max(1, wave3R), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    const hits    = spaceship.hits;
    const hitFrac = Math.min(hits / 9, 1);
    const now     = Date.now();
    const cl = (a, b, t) => Math.round(a + (b - a) * t);
    let fl = 0, warnFreq = 0;
    if (hits >= 7) {
      warnFreq = [0.7, 1.3, 2.2][Math.min(Math.floor(hits - 7), 2)];
      fl = (Math.sin(now / 1000 * warnFreq * Math.PI * 2) + 1) / 2;
    }
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

    const gs = window.gadgetScale || 1;
    ctx.globalAlpha = spaceship.alpha;
    ctx.translate(spaceship.x, spaceship.y);
    ctx.scale(gs, gs);

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

    ctx.shadowColor = `rgba(${glR}, ${glG}, ${glB}, 0.9)`;
    ctx.shadowBlur  = 14 + (hits >= 7 ? fl * 28 : 0);

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

    // Health bar — screen-aligned, below the ship
    if (!spaceship.exploding && !spaceship.swirl && spaceship.alpha > 0.05) {
      const health = Math.max(0, (10 - spaceship.hits) / 10);
      const gs2    = window.gadgetScale || 1;
      const BAR_W  = 36 * gs2, BAR_H = 4 * gs2;
      const bx     = spaceship.x - BAR_W / 2;
      const by     = spaceship.y + 22 * gs2;

      ctx.save();
      ctx.globalAlpha = spaceship.alpha * 0.85;

      // Dark background track
      ctx.fillStyle = 'rgba(15, 5, 40, 0.72)';
      ctx.fillRect(bx - 1, by - 1, BAR_W + 2, BAR_H + 2);

      // Fill color: ship purple → orange → red as damage increases
      if (health > 0) {
        const dmg = 1 - health;
        let fr, fg, fb;
        if (dmg < 0.5) {
          fr = Math.round(150 + dmg * 2 * 105);
          fg = Math.round( 90 + dmg * 2 *  50);
          fb = Math.round(255 - dmg * 2 * 215);
        } else {
          fr = 255;
          fg = Math.round(140 - (dmg - 0.5) * 2 * 140);
          fb = Math.round( 40 - (dmg - 0.5) * 2 *  40);
        }

        let barAlpha = 0.92;
        if (health <= 0.3 && hits >= 7) {
          const pf = [0.7, 1.3, 2.2][Math.min(Math.floor(hits - 7), 2)];
          barAlpha  = 0.60 + ((Math.sin(Date.now() / 1000 * pf * Math.PI * 2) + 1) / 2) * 0.40;
        }

        ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${barAlpha})`;
        ctx.fillRect(bx, by, BAR_W * health, BAR_H);
      }

      // Subtle border
      ctx.strokeStyle = 'rgba(140, 90, 215, 0.45)';
      ctx.lineWidth   = 0.8;
      ctx.strokeRect(bx - 1, by - 1, BAR_W + 2, BAR_H + 2);

      ctx.restore();
    }
  }

  window.startSpaceship = function(x, y) {
    if (!spaceship) {
      spaceship = { x, y, targetX: x, targetY: y, vx: 0, vy: 0, angle: 0, active: true, alpha: 1, emitAccum: 0, bounceCD: 0, hits: 0 };
    } else if (!spaceship.exploding && !spaceship.swirl) {
      spaceship.targetX = x;
      spaceship.targetY = y;
      spaceship.active  = true;
      spaceship.alpha   = 1;
    }
  };
  window.updateSpaceshipTarget = function(x, y) {
    if (spaceship) { spaceship.targetX = x; spaceship.targetY = y; }
  };
  window.releaseSpaceship = function() {
    if (spaceship) spaceship.active = false;
  };

  window.fireSpaceshipLaser = function(targetX, targetY) {
    if (!spaceship || spaceship.exploding || spaceship.swirl) return;
    const dx   = targetX - spaceship.x;
    const dy   = targetY - spaceship.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const nx = dx / dist, ny = dy / dist;
    spaceship.angle = Math.atan2(ny, nx) + Math.PI / 2;
    lasers.push({
      x: spaceship.x + nx * 18, y: spaceship.y + ny * 18,
      vx: nx * 1100, vy: ny * 1100,
      age: 0, trail: [],
    });
  };

  window.Spaceship = {
    update:           updateSpaceship,
    draw:             drawSpaceship,
    get:              () => spaceship,
    triggerExplosion: triggerShipExplosion,
    hit(x, y, vx, vy, damage) {
      if (!spaceship || spaceship.exploding || spaceship.swirl) return;
      spaceship.hits += damage;
      spawnShipImpact(x, y);
      spawnBounceDebris(x, y, vx, vy);
      if (spaceship.hits >= 10) triggerShipExplosion();
    },
  };
})();
