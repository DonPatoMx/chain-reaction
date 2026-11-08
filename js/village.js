// El pueblo: la meta a largo plazo. Cada estrella gastada devuelve la luz a un edificio
// y trae un amigo nuevo; el cielo pasa de noche a amanecer con el progreso.
(function () {
  'use strict';
  const win = (x, y, w, h, lit) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${lit ? '#ffe27a' : '#2b2747'}"${lit ? ' class="glow"' : ''}/>`;
  const c = (lit, on, off) => (lit ? on : off);

  const BUILDINGS = [
    { name: 'Farol de la plaza', cost: 3, friend: { name: 'Lumi', color: '#ffd84d', shade: '#e8a80c' },
      draw: l => `<g transform="translate(182 402)"><ellipse cx="12" cy="66" rx="20" ry="5" fill="#0002"/><path d="M10 16h4v50h-4z" fill="${c(l, '#5b4a6e', '#2c2845')}"/><path d="M1 16h22l-4-16H5Z" fill="${c(l, '#ffe27a', '#35304f')}" stroke="${c(l, '#7a5a2e', '#22203a')}" stroke-width="3"${l ? ' class="glow"' : ''}/><path d="M-1 0h26L12-9Z" fill="${c(l, '#7a5a2e', '#22203a')}"/></g>` },
    { name: 'Casita de Lumi', cost: 4, friend: { name: 'Bruno', color: '#ff9a5c', shade: '#d9632a' },
      draw: l => `<g transform="translate(30 372)"><path d="M0 34h82v62H0z" fill="${c(l, '#fff0d6', '#38334f')}"/><path d="M-8 36L41 0l49 36Z" fill="${c(l, '#f2615b', '#2a2642')}"/>${win(12, 48, 18, 18, l)}${win(52, 48, 18, 18, l)}<path d="M32 66h18v30H32z" fill="${c(l, '#a65e2e', '#2a2642')}"/></g>` },
    { name: 'Panadería', cost: 5, friend: { name: 'Migui', color: '#ffb7d0', shade: '#ee7fa6' },
      draw: l => `<g transform="translate(274 362)"><path d="M0 26h92v72H0z" fill="${c(l, '#ffd9a8', '#38334f')}"/><path d="M-6 28h104l-10-26H4Z" fill="${c(l, '#8e6bd9', '#2a2642')}"/><path d="M0 28h92v12H0z" fill="${c(l, '#fff', '#2f2b47')}" opacity=".8"/>${win(12, 50, 26, 22, l)}<path d="M54 50h24v48H54z" fill="${c(l, '#a65e2e', '#2a2642')}"/></g>` },
    { name: 'Fuente mágica', cost: 6, friend: { name: 'Gota', color: '#7fe3ff', shade: '#27a8e0' },
      draw: l => `<g transform="translate(150 320)"><ellipse cx="44" cy="52" rx="46" ry="12" fill="${c(l, '#c9d4e8', '#2c2845')}"/><ellipse cx="44" cy="49" rx="38" ry="8" fill="${c(l, '#5cd2ff', '#22203a')}"${l ? ' class="glow"' : ''}/><path d="M38 48V14h12v34Z" fill="${c(l, '#c9d4e8', '#2c2845')}"/>${l ? '<path d="M44 12c-14-8-22 4-22 26M44 12c14-8 22 4 22 26" fill="none" stroke="#a8ecff" stroke-width="4" stroke-linecap="round"/>' : ''}</g>` },
    { name: 'Molino', cost: 7, friend: { name: 'Vento', color: '#a8e86b', shade: '#6ab82e' },
      draw: l => `<g transform="translate(26 232)"><path d="M18 34h44l10 96H8Z" fill="${c(l, '#fff0d6', '#35304f')}"/><path d="M12 36L40 6l28 30Z" fill="${c(l, '#5ba3e8', '#2a2642')}"/>${win(32, 64, 16, 20, l)}<g class="${l ? 'spin' : ''}" style="transform-origin:40px 36px">${[0, 90, 180, 270].map(a => `<g transform="rotate(${a} 40 36)"><path d="M40 36V-24" stroke="${c(l, '#a65e2e', '#22203a')}" stroke-width="6" stroke-linecap="round"/><path d="M43-24h15v44H43Z" fill="${c(l, '#fff', '#2c2845')}"/></g>`).join('')}</g></g>` },
    { name: 'Rueda de la feria', cost: 8, friend: { name: 'Gira', color: '#c9a5ff', shade: '#8e5be0' },
      draw: l => `<g transform="translate(262 226)"><path d="M46 56L18 128M46 56l28 72" stroke="${c(l, '#8e6bd9', '#2c2845')}" stroke-width="7" stroke-linecap="round"/><g class="${l ? 'spin slow' : ''}" style="transform-origin:46px 56px"><circle cx="46" cy="56" r="46" fill="none" stroke="${c(l, '#ff7fa0', '#2c2845')}" stroke-width="6"/><path d="M46 10v92M0 56h92M13 23l66 66M79 23L13 89" stroke="${c(l, '#ffc928', '#2c2845')}" stroke-width="3"/><g fill="${c(l, '#5cd2ff', '#35304f')}"><circle cx="46" cy="10" r="8"/><circle cx="46" cy="102" r="8"/><circle cx="0" cy="56" r="8"/><circle cx="92" cy="56" r="8"/></g></g></g>` },
    { name: 'Torre del reloj', cost: 8, friend: { name: 'Tico', color: '#ffc4a8', shade: '#e88a5c' },
      draw: l => `<g transform="translate(150 150)"><path d="M14 34h60v130H14z" fill="${c(l, '#e8d4ff', '#35304f')}"/><path d="M4 36L44-8l40 44Z" fill="${c(l, '#f2615b', '#2a2642')}"/><circle cx="44" cy="66" r="21" fill="${c(l, '#fff8d6', '#2a2642')}" stroke="${c(l, '#a65e2e', '#22203a')}" stroke-width="4"${l ? ' class="glow"' : ''}/><path d="M44 66V52M44 66l10 6" stroke="${c(l, '#3a2a55', '#22203a')}" stroke-width="4" stroke-linecap="round"/>${win(34, 104, 20, 28, l)}</g>` },
    { name: 'Faro del amanecer', cost: 9, friend: { name: 'Sol', color: '#ffae3b', shade: '#ee7a1c' },
      draw: l => `<g transform="translate(300 96)">${l ? '<path d="M18 6L-150 -60V36Z" fill="#fff3a8" opacity=".5"/>' : ''}<path d="M4 18h28l10 110H-6Z" fill="${c(l, '#fff', '#35304f')}"/><path d="M1 46h34l3 26H-2ZM-5 96h46l2 22H-7Z" fill="${c(l, '#f2615b', '#2a2642')}"/><path d="M2 -2h32v20H2z" fill="${c(l, '#ffe27a', '#2a2642')}"${l ? ' class="glow"' : ''}/><path d="M-3 -4L18-22l21 18Z" fill="${c(l, '#5ba3e8', '#22203a')}"/></g>` },
  ];

  const mix = (a, b, t) => '#' + [0, 2, 4].map(i => {
    const x = parseInt(a.slice(1 + i, 3 + i), 16), y = parseInt(b.slice(1 + i, 3 + i), 16);
    return Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  }).join('');

  function scene(lit, justLit = -1, { uid = 'v', viewBox = '0 -110 390 600', fit = 'xMidYMax meet', frame = '' } = {}) {
    const t = lit / BUILDINGS.length;
    const top = mix('#2a2470', '#7fd0ff', t), mid = mix('#6b3fa0', '#ffd0e8', t), low = mix('#e0668f', '#ffe9b0', t);
    const hillB = mix('#3f3a78', '#7fd69a', t), hillF = mix('#2f3a6e', '#5cc47e', t), hillN = mix('#26305e', '#3fae6a', t);
    const stars = t < .7 ? Array.from({ length: 22 }, (_, i) => `<circle cx="${(i * 73) % 390}" cy="${(i * 41) % 190}" r="${1 + i % 2}" fill="#fff" opacity="${(1 - t) * .8}"/>`).join('') : '';
    const body = BUILDINGS.map((b, i) => {
      const on = i < lit;
      const cls = i === justLit ? 'pop' : '';
      return `<g class="${cls}">${b.draw(on)}</g>`;
    }).join('');
    return `<svg ${frame} viewBox="${viewBox}" preserveAspectRatio="${fit}" role="img" aria-label="Pueblo con ${lit} de ${BUILDINGS.length} lugares iluminados">
      <defs><linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${low}"/></linearGradient></defs>
      <rect x="-400" y="-600" width="1200" height="1800" fill="url(#sky-${uid})"/>${stars}
      <circle cx="${86 + t * 16}" cy="${130 - t * 40}" r="30" fill="${t > .5 ? '#fff3a8' : '#f4f0ff'}" opacity=".95"/>
      <path d="M-400 300C-20 220 80 250 200 290s170 10 600-30V1200H-400Z" fill="${hillB}"/>
      <path d="M-400 400C0 340 120 380 240 400s190-10 560-40V1200H-400Z" fill="${hillF}"/>
      ${body}
      <path d="M-400 480C0 450 150 470 260 478s180-10 540-20V1200H-400Z" fill="${hillN}"/>
    </svg>`;
  }

  window.CRVillage = { BUILDINGS, scene, TOWN_NAME: 'Pueblo Chispa' };
})();
