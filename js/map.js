// Mapa del mundo: un camino de abajo hacia arriba. Campamento (tutorial) → Pueblo Chispa
// → niveles → puente → pueblos futuros en la niebla. Todo en un solo SVG de 390 de ancho.
(function () {
  'use strict';
  const { scene, BUILDINGS, TOWN_NAME } = CRVillage;
  const { ICONS } = CRArt;
  const W = 390, STEP = 82;

  const FUTURE = [
    { name: 'Bosque Luciérnaga', sky: ['#1f5e4a', '#3f8f6a'], art: forest },
    { name: 'Puerto Brillante', sky: ['#2b6cb0', '#69b7e8'], art: port },
    { name: 'Monte Aurora', sky: ['#5b4a9e', '#a58fe0'], art: mountains },
    { name: 'Ciudad Estrella', sky: ['#1d1f4f', '#4a3f8f'], art: city },
  ];

  function forest(cx, cy) {
    let s = '';
    for (let i = 0; i < 9; i++) {
      const x = cx - 150 + i * 38, h = 70 + (i * 37) % 50, y = cy + 40 - (i % 3) * 14;
      s += `<path d="M${x} ${y}l26-${h} 26 ${h}Z" fill="#164536"/><path d="M${x + 8} ${y - h * .45}l18-${h * .55} 18 ${h * .55}Z" fill="#1f5e4a"/>`;
    }
    return s + `<circle cx="${cx - 60}" cy="${cy - 40}" r="3" fill="#ffe27a"/><circle cx="${cx + 40}" cy="${cy - 10}" r="3" fill="#ffe27a"/><circle cx="${cx + 90}" cy="${cy - 60}" r="2.5" fill="#ffe27a"/>`;
  }
  function port(cx, cy) {
    return `<path d="M${cx - 190} ${cy + 30}q60-14 120 0t120 0 120 0 120 0V${cy + 90}H${cx - 190}Z" fill="#1f4f86"/>
      <path d="M${cx + 70} ${cy + 30}l8-110h20l8 110Z" fill="#e8eef8"/><path d="M${cx + 74} ${cy - 30}h28l2 20h-32Z" fill="#f2615b"/><rect x="${cx + 76}" y="${cy - 98}" width="24" height="16" fill="#ffe27a"/>
      <path d="M${cx - 120} ${cy + 22}h80l-12 18h-56Z" fill="#a65e2e"/><path d="M${cx - 82} ${cy + 22}V${cy - 40}l34 54Z" fill="#fff"/>`;
  }
  function mountains(cx, cy) {
    return `<path d="M${cx - 200} ${cy + 60}L${cx - 90} ${cy - 90}l60 80 50-110 130 180Z" fill="#3e3373"/>
      <path d="M${cx - 90} ${cy - 90}l26 36-14 6-12-10-14 12-14-6ZM${cx + 20} ${cy - 120}l30 42-16 4-14-12-12 12-18-4Z" fill="#fff"/>`;
  }
  function city(cx, cy) {
    let s = '';
    for (let i = 0; i < 8; i++) {
      const x = cx - 170 + i * 44, h = 60 + (i * 53) % 90;
      s += `<rect x="${x}" y="${cy + 50 - h}" width="38" height="${h}" fill="#151638"/>`;
      for (let k = 0; k < 3; k++) s += `<rect x="${x + 8 + (k % 2) * 14}" y="${cy + 60 - h + k * 18}" width="8" height="8" fill="#ffe27a" opacity=".7"/>`;
    }
    return s + '<path d="M0 0" />';
  }

  // Curva suave que pasa por todos los puntos (Catmull-Rom → Bézier).
  function smooth(pts) {
    let d = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += `C${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const starRow = (x, y, n) => [0, 1, 2].map(k => `<path transform="translate(${x - 17 + k * 17} ${y}) scale(.15)" d="M50 6l13.5 28.5 31 4.2-22.7 21.6 5.7 30.7L50 76.2 22.5 91l5.7-30.7L5.5 38.7l31-4.2Z" fill="${k < n ? '#ffc928' : '#e6dff0'}" stroke="${k < n ? '#e8840c' : '#bdb3cf'}" stroke-width="8"/>`).join('');

  // state: { tutDone, best, gemsGot, lit, levels, current }
  function render(state) {
    const n = state.levels.length;
    const u = {};
    const BASE = 190;
    u.camp = BASE + 60;
    u.townBottom = BASE + 190; u.townTop = BASE + 530;
    u.level = i => BASE + 620 + i * STEP;
    u.gate = u.level(n - 1) + 150;
    const FUT = 480;
    u.region = k => u.gate + 90 + k * FUT;
    u.future = k => u.region(k) + 300;
    const H = u.region(FUTURE.length) + 120;
    const Y = v => H - v;
    const xAt = i => Math.round(W / 2 + 112 * Math.sin(i * .78));

    const levelPts = state.levels.map((_, i) => ({ x: xAt(i), y: Y(u.level(i)) }));
    const pts = [{ x: W / 2, y: Y(u.camp) }, { x: W / 2, y: Y(u.townBottom) }, { x: W / 2, y: Y(u.townTop) }, ...levelPts, { x: W / 2, y: Y(u.gate) }];
    // Cada pueblo futuro tiene unos niveles fantasma antes de llegar a él.
    const ghostPts = [];
    FUTURE.forEach((_, k) => {
      for (let g = 0; g < 4; g++) ghostPts.push({ x: Math.round(W / 2 + 96 * Math.sin((g + k * 2) * .9)), y: Y(u.region(k) + 50 + g * 52) });
      ghostPts.push({ x: W / 2, y: Y(u.future(k)) });
    });

    // Fondo por regiones: pradera, luego un color por cada pueblo futuro.
    let bg = `<defs><linearGradient id="mapMeadow" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#8fdc8a"/><stop offset=".5" stop-color="#b8e892"/><stop offset="1" stop-color="#d9eea0"/></linearGradient>
      ${FUTURE.map((f, k) => `<linearGradient id="mapF${k}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${f.sky[1]}"/><stop offset="1" stop-color="${f.sky[0]}"/></linearGradient>`).join('')}
      <linearGradient id="fog" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".25" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient></defs>`;
    bg += `<rect x="0" y="${Y(u.region(0))}" width="${W}" height="${u.region(0) + 1}" fill="url(#mapMeadow)"/>`;
    FUTURE.forEach((f, k) => { bg += `<rect x="0" y="${Y(u.region(k + 1)) - (k === FUTURE.length - 1 ? 200 : 0)}" width="${W}" height="${FUT + 1 + (k === FUTURE.length - 1 ? 200 : 0)}" fill="url(#mapF${k})"/>`; });

    // Decoración determinista: arbustos y flores a los lados del camino.
    let deco = '';
    for (let i = 0; i < n + 6; i++) {
      const v = 160 + i * STEP * .9, side = i % 2 ? 1 : -1, x = W / 2 + side * (150 + (i * 29) % 30);
      deco += `<circle cx="${x}" cy="${Y(v)}" r="${14 + (i * 7) % 9}" fill="#6cc46a"/><circle cx="${x + 10}" cy="${Y(v) + 4}" r="${10 + (i * 5) % 6}" fill="#5bb35a"/>`;
      if (i % 3 === 0) deco += `<circle cx="${W - x}" cy="${Y(v + 30)}" r="4" fill="#ff7fa0"/><circle cx="${W - x + 9}" cy="${Y(v + 34)}" r="4" fill="#ffd84d"/>`;
    }

    const path = `<path d="${smooth(pts)}" fill="none" stroke="#e9c98f" stroke-width="22" stroke-linecap="round"/><path d="${smooth(pts)}" fill="none" stroke="#fff3d6" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round"/>
      <path d="${smooth([pts[pts.length - 1], ...ghostPts])}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="16" stroke-dasharray="1 26" stroke-linecap="round"/>`;

    // Campamento del tutorial.
    const cy = Y(u.camp);
    const camp = `<g><path d="M${W / 2 - 120} ${cy + 6}l38-56 38 56Z" fill="#ff8a5c" stroke="#d9632a" stroke-width="3"/><path d="M${W / 2 - 82} ${cy + 6}l-9-26h18Z" fill="#7a3a1a"/>
      <path d="M${W / 2 + 92} ${cy + 8}h36" stroke="#7a4a2a" stroke-width="7" stroke-linecap="round"/><path d="M${W / 2 + 110} ${cy + 2}c-10-10-4-22 0-30 4 8 10 20 0 30Z" fill="#ffae3b"/></g>`;
    const tutState = state.tutDone ? 'done' : 'current';
    const tutNode = `<g class="node ${tutState}" data-node="tut" role="button" tabindex="0" aria-label="Tutorial${state.tutDone ? ', completado' : ''}" transform="translate(${W / 2} ${cy})">
      ${state.tutDone ? '' : '<circle class="ring" r="34"/>'}<circle r="34" class="disc"/><text y="${state.tutDone ? 9 : 5}" class="num" style="font-size:${state.tutDone ? 26 : 13}px">${state.tutDone ? '✓' : 'TUTORIAL'}</text>
      <text y="52" class="label">Campamento</text></g>`;

    // Miniatura del pueblo (se toca para entrar).
    const tb = Y(u.townTop), th = u.townTop - u.townBottom;
    const town = `<g class="town" data-node="town" role="button" tabindex="0" aria-label="Entrar a ${TOWN_NAME}">
      <rect x="28" y="${tb}" width="${W - 56}" height="${th}" rx="26" fill="#fff" stroke="#fff" stroke-width="8"/>
      <clipPath id="townClip"><rect x="28" y="${tb}" width="${W - 56}" height="${th}" rx="24"/></clipPath>
      <g clip-path="url(#townClip)">${scene(state.lit, -1, { uid: 'map', viewBox: '0 120 390 370', fit: 'xMidYMid slice', frame: `x="28" y="${tb}" width="${W - 56}" height="${th}"` })}</g>
      <rect x="${W / 2 - 110}" y="${tb - 22}" width="220" height="44" rx="22" fill="#ff7a59" stroke="#fff" stroke-width="4"/>
      <text x="${W / 2}" y="${tb + 8}" class="banner">${TOWN_NAME}</text>
      <rect x="${W / 2 - 74}" y="${tb + th - 26}" width="148" height="34" rx="17" fill="#fff8ec"/>
      <text x="${W / 2}" y="${tb + th - 3}" class="townSub">★ ${state.lit} / ${BUILDINGS.length} luces</text></g>`;

    // Nodos de nivel.
    const nodes = state.levels.map((l, i) => {
      const p = levelPts[i], best = state.best[i] || 0;
      const st = !state.tutDone || i > state.current ? 'locked' : i === state.current ? 'current' : 'done';
      const gem = l.gem ? `<g transform="translate(20 -26) scale(.5)">${state.gemsGot[i] ? ICONS.gem.replace('<svg', '<svg x="-24" y="-24" width="48" height="48"') : `<svg x="-24" y="-24" width="48" height="48" viewBox="0 0 48 48"><path d="M14 6h20l10 12-20 25L4 18Z" fill="#fff" fill-opacity=".85" stroke="#1a8fc4" stroke-width="3.5" stroke-dasharray="5 4" stroke-linejoin="round"/></svg>`}</g>` : '';
      return `<g class="node ${st}" data-node="L${i}" role="button" tabindex="0" aria-label="Nivel ${i + 1}${st === 'locked' ? ', bloqueado' : `, ${best} estrellas`}${l.gem ? (state.gemsGot[i] ? ', cristal conseguido' : ', tiene cristal') : ''}" transform="translate(${p.x} ${p.y})">
        ${st === 'current' ? '<circle class="ring" r="32"/>' : ''}<circle r="${st === 'current' ? 29 : 25}" class="disc"/><text y="8" class="num">${i + 1}</text>
        ${st === 'done' ? starRow(0, 27, best).replace(/translate\((-?\d+\.?\d*) (\d+)\)/g, (m, a, b) => `translate(${a - 7} ${b})`) : ''}${gem}</g>`;
    }).join('');

    // Puente bloqueado: se abre al completar el pueblo.
    const gy = Y(u.gate);
    const gate = `<g class="gate" data-node="gate" role="button" tabindex="0" aria-label="Puente al siguiente pueblo">
      <path d="M${W / 2 - 80} ${gy + 20}q80-70 160 0" fill="none" stroke="#a65e2e" stroke-width="12" stroke-linecap="round"/><path d="M${W / 2 - 80} ${gy + 20}h160" stroke="#7a4a2a" stroke-width="8" stroke-linecap="round"/>
      <circle cx="${W / 2}" cy="${gy - 6}" r="22" fill="#fff8ec" stroke="#3a2a55" stroke-width="3"/><g transform="translate(${W / 2 - 12} ${gy - 18})" color="#3a2a55"><svg width="24" height="24" viewBox="0 0 48 48">${ICONS.lock.replace(/<\/?svg[^>]*>/g, '')}</svg></g>
      <text x="${W / 2}" y="${gy + 56}" class="label">Completa ${TOWN_NAME}</text></g>`;

    // Pueblos futuros: visibles pero cubiertos de niebla.
    const future = FUTURE.map((f, k) => {
      const fy = Y(u.future(k));
      const ghosts = ghostPts.slice(k * 5, k * 5 + 4).map(p => `<circle cx="${p.x}" cy="${p.y}" r="18" fill="#fff" fill-opacity=".28" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>`).join('');
      return `<g class="soon" data-node="soon${k}" role="button" tabindex="0" aria-label="${f.name}, próximamente">${ghosts}<g opacity=".9">${f.art(W / 2, fy)}</g>
        <rect x="0" y="${fy - 170}" width="${W}" height="250" fill="url(#fog)"/>
        <rect x="${W / 2 - 112}" y="${fy - 160}" width="224" height="62" rx="20" fill="#3a2a55" opacity=".88"/>
        <text x="${W / 2}" y="${fy - 134}" class="banner">${f.name}</text><text x="${W / 2}" y="${fy - 112}" class="soonText">Próximamente</text></g>`;
    }).join('');

    const svg = `<svg class="worldMap" viewBox="0 0 ${W} ${H}" role="group" aria-label="Mapa del mundo">${bg}${deco}${path}${future}${gate}${camp}${town}${nodes}${tutNode}</svg>`;
    const focus = !state.tutDone ? Y(u.camp) : state.current >= n ? Y(u.gate) : levelPts[state.current].y;
    return { svg, height: H, focusY: focus };
  }

  window.CRMap = { render, FUTURE };
})();
