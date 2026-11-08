// Arte vectorial. La silueta codifica la mecánica: la punta señala hacia dónde salta la chispa.
(function () {
  'use strict';
  const BODY = {
    line: 'M46 12C24 12 8 29 8 50s16 38 38 38c13 0 23-6 30-15h4l18-23-18-23h-4C69 18 59 12 46 12Z',
    double: 'M50 16c-11 0-21 4-28 11h-4L0 50l18 23h4c7 7 17 11 28 11s21-4 28-11h4l18-23-18-23h-4c-7-7-17-11-28-11Z',
    bomb: 'M50 0L66 19c8 2 13 7 15 15L100 50 81 66c-2 8-7 13-15 15L50 100 34 81c-8-2-13-7-15-15L0 50 19 34c2-8 7-13 15-15Z',
  };
  const TIPS = {
    line: '<path class="tip" d="M78 36l15 14-15 14Z"/>',
    double: '<path class="tip" d="M82 36l15 14-15 14ZM18 36L3 50l15 14Z"/>',
    bomb: '<path class="tip" d="M41 18L50 5l9 13ZM82 41l13 9-13 9ZM59 82l-9 13-9-13ZM18 59L5 50l13-9Z"/>',
  };
  const GRAD = { line: 'gLine', double: 'gDouble', bomb: 'gBomb' };

  const face = `<g class="face">
    <ellipse cx="33" cy="58" rx="6" ry="4" fill="#ff7fa0" opacity=".6"/><ellipse cx="67" cy="58" rx="6" ry="4" fill="#ff7fa0" opacity=".6"/>
    <g class="eyesSleep" fill="none" stroke="#123" stroke-width="4" stroke-linecap="round"><path d="M31 47q6 6 12 0M57 47q6 6 12 0"/></g>
    <g class="eyesOpen"><circle cx="38" cy="46" r="8" fill="#123"/><circle cx="62" cy="46" r="8" fill="#123"/><circle cx="41" cy="43" r="3" fill="#fff"/><circle cx="65" cy="43" r="3" fill="#fff"/></g>
    <path class="mouthSleep" d="M46 62q4 3 8 0" fill="none" stroke="#123" stroke-width="3" stroke-linecap="round"/>
    <path class="mouthOpen" d="M41 58q9 14 18 0Z" fill="#7a1f3d" stroke="#123" stroke-width="2.5" stroke-linejoin="round"/>
  </g>`;

  function chispi(t, d) {
    const deg = t === 'bomb' ? 0 : d * 90;
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <g class="rot" style="transform:rotate(${deg}deg)">
        <path d="${BODY[t]}" fill="#0003" transform="translate(0 4)"/>
        <path d="${BODY[t]}" fill="url(#${GRAD[t]})" stroke="#fff" stroke-width="3"/>
        ${TIPS[t]}
      </g>
      <ellipse cx="38" cy="26" rx="13" ry="6" fill="#fff" opacity=".55" transform="rotate(-20 38 26)"/>
      ${face}
    </svg>`;
  }

  // Amigo del álbum: mismo personaje con color propio.
  function friend(color, shade, locked) {
    if (locked) return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${BODY.line}" fill="#c9bfdc"/><text x="50" y="62" font-size="34" text-anchor="middle" fill="#fff" font-family="Fredoka,sans-serif" font-weight="700">?</text></svg>`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true" class="friend"><path d="M50 12C28 12 12 29 12 50s16 38 38 38 38-17 38-38S72 12 50 12Z" fill="${color}" stroke="${shade}" stroke-width="4"/>
      <path d="M50 12l6-9 3 11" fill="${color}" stroke="${shade}" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="38" cy="26" rx="12" ry="6" fill="#fff" opacity=".6" transform="rotate(-20 38 26)"/>${face}</svg>`;
  }

  const rock = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M20 84C8 80 8 60 18 48c3-14 16-30 34-30 15 0 26 12 30 26 12 10 14 32 0 40-20 5-44 5-62 0Z" fill="#0003" transform="translate(0 4)"/><path d="M20 84C8 80 8 60 18 48c3-14 16-30 34-30 15 0 26 12 30 26 12 10 14 32 0 40-20 5-44 5-62 0Z" fill="url(#gRock)" stroke="#fff8" stroke-width="3"/><path d="M36 38l10 12 12-6M60 66l-12-4" fill="none" stroke="#4b5468" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="42" cy="30" rx="11" ry="5" fill="#fff" opacity=".45"/></svg>`;

  const coin = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="52" r="42" fill="#b86c00"/><circle cx="50" cy="48" r="42" fill="url(#gCoin)"/><circle cx="50" cy="48" r="31" fill="none" stroke="#e8940c" stroke-width="4"/><path d="M50 26l6.6 14 15.4 2-11 10.8 2.6 15.2L50 60.800 36.400 68 39 52.800 28 42l15.400-2Z" fill="#fff6c4"/></svg>`;

  const star = (on = true) => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6l13.500 28.500 31 4.200-22.700 21.600 5.700 30.700L50 76.200 22.500 91l5.700-30.700L5.500 38.700l31-4.200Z" fill="${on ? '#ffc928' : '#d9d2e6'}" stroke="${on ? '#e8840c' : '#bdb3cf'}" stroke-width="6" stroke-linejoin="round"/>${on ? '<path d="M38 34l8-14" stroke="#fff7c8" stroke-width="6" stroke-linecap="round"/>' : ''}</svg>`;

  const line = (d, extra = '') => `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4.500" stroke-linecap="round" stroke-linejoin="round"${extra}>${d}</svg>`;
  const ICONS = {
    star: star(), coin,
    gear: line('<circle cx="24" cy="24" r="6.500"/><path d="M24 5v7M24 36v7M5 24h7M36 24h7M10.500 10.500l5 5M32.500 32.500l5 5M37.500 10.500l-5 5M15.500 32.500l-5 5"/>'),
    gift: line('<rect x="7" y="20" width="34" height="22" rx="4"/><path d="M4 14h40v7H4zM24 14v28M24 14c-6-10-16-8-12 0M24 14c6-10 16-8 12 0"/>'),
    bolt: line('<path d="M27 4L10 27h13l-3 17 18-24H25Z" fill="currentColor"/>'),
    heart: line('<path d="M24 41S6 30 6 17c0-11 14-13 18-4 4-9 18-7 18 4 0 13-18 24-18 24Z" fill="currentColor"/>'),
    grid: line('<rect x="6" y="6" width="14" height="14" rx="3"/><rect x="28" y="6" width="14" height="14" rx="3"/><rect x="6" y="28" width="14" height="14" rx="3"/><rect x="28" y="28" width="14" height="14" rx="3"/>'),
    home: line('<path d="M6 23L24 7l18 16M12 19v22h24V19M20 41V29h8v12"/>'),
    undo: line('<path d="M12 8v12h12"/><path d="M12 20c4-7 10-10 16-9 9 2 14 10 12 18-2 9-11 13-19 11-4-1-7-3-9-6"/>'),
    bulb: line('<path d="M16 32c-5-3-8-8-8-13C8 11 15 5 24 5s16 6 16 14c0 5-3 10-8 13v4H16ZM18 43h12"/>'),
    gem: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 6h20l10 12-20 25L4 18Z" fill="#5fe0ff" stroke="#1a8fc4" stroke-width="3" stroke-linejoin="round"/><path d="M4 18h40M14 6l10 37M34 6L24 43M14 6l-2 12M34 6l2 12" fill="none" stroke="#1a8fc4" stroke-width="2" opacity=".55"/><path d="M15 10l-4 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
    lock: line('<rect x="10" y="21" width="28" height="21" rx="5" fill="currentColor"/><path d="M16 21v-6a8 8 0 0 1 16 0v6"/>'),
    map: line('<path d="M5 11l12-5 14 5 12-5v31l-12 5-14-5-12 5ZM17 6v31M31 11v31"/>'),
        turn: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="#7a4a00" stroke-width="5.500" stroke-linecap="round" stroke-linejoin="round"><path d="M38 24a14 14 0 1 1-5-11"/><path d="M34 3v11h-11" transform="translate(1 -1)"/></svg>`,
    hand: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M26 6c3 0 5 2 5 5v18l3-1c3 0 4 1 5 2 2-1 5 0 6 2 3-1 6 1 6 4v10c0 8-6 14-14 14h-5c-5 0-9-3-12-7L12 40c-2-3 2-7 5-4l4 4V11c0-3 2-5 5-5Z" fill="#fff" stroke="#3a2a55" stroke-width="3" stroke-linejoin="round"/></svg>`,
  };

  window.CRArt = { chispi, friend, rock, coin, star, ICONS };
})();
