(function () {
  'use strict';
  const { simulate, STEPS } = CREngine;
  const { levels, daily } = CR_LEVELS;
  const { BUILDINGS, scene } = CRVillage;
  const { chispi, friend, rock, coin, star, ICONS } = CRArt;
  const sfx = CRAudio;
  const $ = id => document.getElementById(id);

  // ---------- Guardado ----------
  const KEY = 'chain-reaction-v2';
  const DEFAULTS = { unlocked: 0, best: {}, stars: 0, coins: 40, lit: 0, sound: true, haptic: true, giftDay: 0, giftStreak: 0, dailyDay: 0 };
  let S = { ...DEFAULTS };
  try { S = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* guardado no disponible */ }
  S.unlocked = Math.max(0, Math.min(levels.length - 1, Number(S.unlocked) || 0));
  window.CRSave = S;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin guardado: el juego sigue */ } };

  // ---------- Constantes de juego ----------
  const HINT_COST = 25;
  const FREE_HINT_AFTER = 3;
  const GIFTS = [10, 15, 20, 25, 30, 40, 60];
  const DAILY_COINS = 30, DAILY_STARS = 2, FRIEND_BONUS = 20;
  const firstRock = levels.findIndex(l => l.rocks.length);
  const TIPS = {
    0: { text: '¡Toca a este Chispi para despertarlo!', hand: 'start' },
    1: { text: 'La punta muestra hacia dónde salta la chispa.', hand: 'start' },
    2: { text: 'Los morados saltan hacia los dos lados.' },
    3: { text: 'Solo tienes una chispa. ¿Con quién empiezas?' },
    4: { text: '¡Los naranjas saltan en cuatro direcciones!' },
    5: { text: 'Toca al del aro dorado para girarlo.', hand: 'gold' },
    [firstRock]: { text: 'Cuidado: las rocas detienen la chispa.' },
  };
  const GOAL = 'Despierta a todos con una sola chispa.';

  const today = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const buzz = p => { if (S.haptic && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* no soportado */ } } };
  const icon = n => `<span class="ic">${ICONS[n]}</span>`;

  document.querySelectorAll('[data-icon]').forEach(el => { el.classList.add('ic'); el.innerHTML = ICONS[el.dataset.icon]; });
  $('sayFace').innerHTML = friend('#ffd84d', '#e8a80c');
  $('hand').innerHTML = ICONS.hand;

  // ---------- Pantallas ----------
  function show(id) {
    $('home').hidden = id !== 'home';
    $('game').hidden = id !== 'game';
  }

  function renderHud() {
    $('homeStars').textContent = S.stars;
    $('homeCoins').textContent = S.coins;
    $('gameCoins').textContent = S.coins;
  }

  function renderHome(justLit = -1) {
    token++; show('home'); renderHud();
    $('scene').innerHTML = scene(S.lit, justLit);
    const next = nextLevel();
    $('play').innerHTML = next === null ? '¡Todos superados!' : `JUGAR <small>Nivel ${next + 1}</small>`;
    $('giftDot').hidden = S.giftDay === today();
    $('dailyDot').hidden = S.dailyDay === today();
    const card = $('build'), b = BUILDINGS[S.lit];
    card.classList.remove('ready');
    if (!b) { card.innerHTML = '<b class="wide">¡Pueblo completo!</b><em>Todos los Chispis están en casa</em>'; return; }
    const ready = S.stars >= b.cost;
    card.classList.toggle('ready', ready);
    card.innerHTML = `<b>${b.name}</b><span class="cost">${icon('star')}${Math.min(S.stars, b.cost)} / ${b.cost}</span>
      <i class="bar"><u style="width:${Math.min(100, S.stars / b.cost * 100)}%"></u></i>
      <em>${ready ? '¡Toca para encender!' : `Te faltan ${b.cost - S.stars} estrellas`}</em>`;
  }

  function nextLevel() {
    for (let i = 0; i < levels.length; i++) if (!S.best[i]) return i;
    return null;
  }

  // ---------- Hojas modales ----------
  function sheet(html, { closable = true } = {}) {
    $('sheet').innerHTML = (closable ? '<button class="x" id="sheetX" aria-label="Cerrar">×</button>' : '') + html;
    $('sheetBack').hidden = false;
    $('sheetBack').onclick = e => { if (closable && e.target === $('sheetBack')) closeSheet(); };
    if (closable) $('sheetX').onclick = closeSheet;
  }
  function closeSheet() { $('sheetBack').hidden = true; }

  // ---------- Partida ----------
  let cur = null, busy = false, token = 0;

  function startLevel(index, mode = 'level') {
    token++; closeSheet(); busy = false;
    const def = mode === 'daily' ? daily[index] : levels[index];
    cur = { index, mode, def, pieces: def.pieces.map(p => ({ ...p })), attempts: 0, fails: 0, hinted: false, showHand: false };
    const tip = mode === 'level' ? TIPS[index] : null;
    cur.tip = tip || null;
    cur.showHand = !!(tip && tip.hand);
    show('game');
    $('levelName').textContent = mode === 'daily' ? 'Reto diario' : `Nivel ${index + 1}`;
    say(tip ? tip.text : mode === 'daily' ? '¡El reto de hoy! Solo uno al día.' : GOAL);
    renderHud(); renderBoard(); renderLiveStars(); renderHintButton();
  }

  const say = t => { $('sayText').textContent = t; };
  const potential = () => {
    const a = cur.attempts + 1;
    const s = a <= 1 ? 3 : a <= 3 ? 2 : 1;
    return cur.hinted ? Math.min(2, s) : s;
  };
  function renderLiveStars() {
    if (cur.mode === 'daily') { $('liveStars').innerHTML = ''; return; }
    const p = potential();
    $('liveStars').innerHTML = [1, 2, 3].map(n => `<span class="ic">${star(n <= p)}</span>`).join('');
  }
  function renderHintButton() {
    const free = cur.fails >= FREE_HINT_AFTER;
    $('hintCost').innerHTML = free ? 'Gratis' : `${HINT_COST}`;
    $('hint').classList.toggle('free', free);
  }

  const cellEl = (x, y) => $('board').children[y * cur.def.size + x];
  const tile = i => $('board').querySelector(`[data-i="${i}"]`);
  const KIND = { line: 'azul', double: 'morado', bomb: 'naranja' };

  function renderBoard() {
    const { size, rocks, coins } = cur.def, board = $('board');
    board.style.setProperty('--n', size);
    board.innerHTML = '';
    clearFx();
    const at = new Map(cur.pieces.map((p, i) => [p.x + ',' + p.y, i]));
    const rockSet = new Set(rocks.map(r => r.join()));
    const coinSet = new Set(coins.map(c => c.join()));
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const k = x + ',' + y;
      if (rockSet.has(k)) cell.innerHTML = `<span class="rock">${rock}</span>`;
      else if (coinSet.has(k)) cell.innerHTML = `<span class="coin">${coin}</span>`;
      else if (at.has(k)) {
        const i = at.get(k), p = cur.pieces[i];
        const btn = document.createElement('button');
        btn.className = `piece ${p.t}${p.g ? ' gold' : ''}`;
        btn.dataset.i = i; btn.dataset.deg = p.d * 90;
        btn.style.setProperty('--delay', `${(i * 0.37) % 2}s`);
        btn.setAttribute('aria-label', p.g ? `Girar Chispi ${KIND[p.t]}, fila ${y + 1}, columna ${x + 1}` : `Despertar Chispi ${KIND[p.t]}, fila ${y + 1}, columna ${x + 1}`);
        btn.innerHTML = chispi(p.t, p.d) + (p.g ? `<span class="turn">${ICONS.turn}</span>` : '');
        btn.addEventListener('click', () => tap(i));
        cell.append(btn);
      }
      board.append(cell);
    }
    drawPreviews(); updateHand();
  }

  function tap(i) {
    if (busy) return;
    const p = cur.pieces[i];
    if (p.g) return turn(i);
    fire(i);
  }

  function turn(i) {
    const p = cur.pieces[i], el = tile(i);
    p.d = (p.d + 1) % 4;
    const deg = Number(el.dataset.deg) + 90;
    el.dataset.deg = deg;
    el.querySelector('.rot').style.transform = `rotate(${deg}deg)`;
    sfx.turn(); buzz(8);
    drawPreviews(); updateHand();
  }

  // Una doble a 180° dispara igual, así que basta con coincidir en el eje.
  const dirOK = (p, d) => (p.t === 'double' ? p.d % 2 === d % 2 : p.d === d);

  function updateHand() {
    const hand = $('hand');
    if (!cur.showHand) { hand.hidden = true; return; }
    const wrong = cur.def.sol.dirs.find(([i, d]) => !dirOK(cur.pieces[i], d));
    const target = wrong ? wrong[0] : cur.def.sol.start;
    if (cur.tip && cur.tip.hand === 'gold') say(wrong ? cur.tip.text : '¡Perfecto! Ahora despierta al primero.');
    const c = centerOf(cur.pieces[target]);
    hand.style.left = c.x + 'px'; hand.style.top = c.y + 'px';
    hand.hidden = false;
  }

  function centerOf({ x, y }) {
    const a = cellEl(x, y).getBoundingClientRect(), w = $('boardWrap'), b = w.getBoundingClientRect();
    return { x: a.left - b.left - w.clientLeft + a.width / 2, y: a.top - b.top - w.clientTop + a.height / 2 };
  }

  // ---------- Efectos ----------
  const NS = 'http://www.w3.org/2000/svg';
  const TINT = { line: '#27b6f6', double: '#b36bf5', bomb: '#ff9a2e' };
  function sizeFx() {
    const w = $('boardWrap');
    $('fx').setAttribute('viewBox', `0 0 ${w.clientWidth} ${w.clientHeight}`);
  }
  function clearFx() { $('fx').replaceChildren(); }

  // Las doradas muestran siempre su trayectoria: girar es pensar, no adivinar.
  function drawPreviews() {
    clearFx(); sizeFx();
    cur.pieces.forEach((p, i) => {
      if (!p.g) return;
      for (const path of simulate(cur.pieces, i, cur.def.size, cur.def.rocks).sequence[0].paths) {
        if (path.to === null && !path.cells.length) continue;
        const a = centerOf(p), b = centerOf(path.to !== null ? cur.pieces[path.to] : { x: path.endX, y: path.endY });
        const len = Math.hypot(b.x - a.x, b.y - a.y), skip = cellEl(p.x, p.y).clientWidth * .52;
        if (len <= skip) continue;
        const sx = a.x + (b.x - a.x) * skip / len, sy = a.y + (b.y - a.y) * skip / len;
        const l = document.createElementNS(NS, 'line');
        for (const [k, v] of [['x1', sx], ['y1', sy], ['x2', b.x], ['y2', b.y], ['class', 'preview']]) l.setAttribute(k, v);
        $('fx').append(l);
      }
    });
  }

  function beam(path, ms) {
    const from = cur.pieces[path.from], a = centerOf(from);
    const b = centerOf(path.to !== null ? cur.pieces[path.to] : { x: path.endX, y: path.endY });
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const make = (stroke, width) => {
      const l = document.createElementNS(NS, 'line');
      for (const [k, v] of [['x1', a.x], ['y1', a.y], ['x2', b.x], ['y2', b.y], ['stroke', stroke], ['stroke-width', width], ['stroke-linecap', 'round'], ['stroke-dasharray', len], ['stroke-dashoffset', len]]) l.setAttribute(k, v);
      if (path.to === null) l.setAttribute('opacity', '.4');
      l.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, fill: 'forwards', easing: 'ease-in' });
      $('fx').append(l);
      return l;
    };
    const glow = make(TINT[from.t], 11), core = make('#fff', 4);
    return wait(ms).then(() => {
      glow.animate([{ opacity: path.to === null ? .4 : 1 }, { opacity: 0 }], { duration: 170, fill: 'forwards' });
      core.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, fill: 'forwards' });
      setTimeout(() => { glow.remove(); core.remove(); }, 180);
    });
  }

  function burst(i) {
    const p = cur.pieces[i], c = centerOf(p), wrap = $('boardWrap');
    const n = p.t === 'bomb' ? 14 : 8;
    for (let k = 0; k < n; k++) {
      const s = document.createElement('i');
      const a = k / n * Math.PI * 2 + Math.random(), dist = 34 + Math.random() * 30;
      s.className = 'spark';
      s.style.cssText = `left:${c.x}px;top:${c.y}px;--dx:${Math.cos(a) * dist}px;--dy:${Math.sin(a) * dist}px;background:${TINT[p.t]}`;
      wrap.append(s);
      s.addEventListener('animationend', () => s.remove(), { once: true });
    }
  }

  function comboText(n) {
    const t = n >= 10 ? '¡INCREÍBLE!' : n === 7 ? '¡GENIAL!' : n === 4 ? '¡BIEN!' : null;
    if (!t) return;
    const el = $('comboText');
    el.textContent = t;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  }

  function confetti() {
    const colors = ['#ffc928', '#27b6f6', '#b36bf5', '#ff7fa0', '#7fd69a'];
    for (let i = 0; i < 46; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % 5]};--r:${Math.random() * 720 - 360}deg;--x:${Math.random() * 80 - 40}px;animation-delay:${Math.random() * .35}s`;
      $('flyLayer').append(c);
      c.addEventListener('animationend', () => c.remove(), { once: true });
    }
  }

  // ---------- La reacción ----------
  async function fire(start) {
    const tok = ++token;
    busy = true; cur.showHand = false; $('hand').hidden = true; clearFx(); sizeFx();
    if (cur.fails) say(GOAL);
    cur.attempts++;
    const sim = simulate(cur.pieces, start, cur.def.size, cur.def.rocks);
    const coinCells = new Set(cur.def.coins.map(c => c.join()));
    const first = tile(start);
    first.classList.add('charging'); sfx.tap(); buzz(15);
    await wait(240);
    if (tok !== token) return;
    first.classList.remove('charging');

    let chain = 0;
    for (const wave of sim.sequence) {
      for (const i of wave.activated) {
        const el = tile(i);
        el.classList.add('awake');
        sfx.chain(chain); chain++;
        burst(i); buzz(10); comboText(chain);
        if (cur.pieces[i].t === 'bomb') {
          sfx.bomb(); buzz(40);
          const w = $('boardWrap');
          w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
        }
      }
      await wait(Math.max(90, 170 - chain * 6));
      if (tok !== token) return;
      for (const i of wave.activated) tile(i).classList.add('gone');
      const ms = Math.max(120, 210 - chain * 7);
      const rays = wave.paths.filter(p => p.to !== null || p.cells.length);
      for (const path of rays) {
        path.cells.forEach((c, k) => {
          if (!coinCells.has(c.join())) return;
          setTimeout(() => {
            if (tok !== token) return;
            const el = cellEl(c[0], c[1]).querySelector('.coin');
            if (el && !el.classList.contains('taken')) { el.classList.add('taken'); sfx.coin(); }
          }, ms * (k + 1) / (path.cells.length + 1));
        });
      }
      await Promise.all(rays.map(p => beam(p, ms)));
      if (tok !== token) return;
    }
    await wait(140);
    if (tok !== token) return;
    if (sim.won) win(); else fail(sim, tok);
  }

  async function fail(sim, tok) {
    cur.fails++;
    const left = cur.pieces.length - sim.count;
    say(`¡Casi! ${left === 1 ? 'Quedó 1 dormido' : `Quedaron ${left} dormidos`}. Prueba otro inicio.`);
    sfx.fail(); buzz([25, 60, 25]);
    const hit = new Set(sim.sequence.flatMap(w => w.activated));
    cur.pieces.forEach((_, i) => { if (!hit.has(i)) tile(i).classList.add('snore'); });
    renderLiveStars(); renderHintButton();
    await wait(1000);
    if (tok !== token) return;
    busy = false;
    renderBoard();
  }

  function win() {
    busy = true; cur.won = true;
    let stars, coinsWon, starsWon = 0, firstClear = false;
    if (cur.mode === 'daily') {
      stars = 3;
      firstClear = S.dailyDay !== today();
      coinsWon = firstClear ? DAILY_COINS : 0;
      starsWon = firstClear ? DAILY_STARS : 0;
      if (firstClear) S.dailyDay = today();
    } else {
      const a = cur.attempts;
      stars = a <= 1 ? 3 : a <= 3 ? 2 : 1;
      if (cur.hinted) stars = Math.min(2, stars);
      const prev = S.best[cur.index] || 0;
      firstClear = !prev;
      starsWon = Math.max(0, stars - prev);
      S.best[cur.index] = Math.max(prev, stars);
      coinsWon = firstClear ? 5 + cur.def.coins.length * 2 : 2;
      S.unlocked = Math.max(S.unlocked, Math.min(levels.length - 1, cur.index + 1));
    }
    S.stars += starsWon; S.coins += coinsWon;
    save();
    confetti(); sfx.win(); buzz([30, 40, 70]);
    setTimeout(() => showWin(stars, starsWon, coinsWon), 650);
  }

  function showWin(stars, starsWon, coinsWon) {
    const b = BUILDINGS[S.lit], canBuild = b && S.stars >= b.cost;
    const hasNext = cur.mode === 'level' && cur.index < levels.length - 1;
    const title = cur.mode === 'daily' ? '¡Reto superado!' : ['', '¡Lo lograste!', '¡Muy bien!', '¡Perfecto!'][stars];
    const primary = canBuild ? `Encender ${b.name}` : hasNext ? 'Siguiente nivel' : 'Volver al pueblo';
    sheet(`<h2>${title}</h2>
      <div class="bigStars">${[1, 2, 3].map(n => `<span class="ic s${n}">${star(n <= stars)}</span>`).join('')}</div>
      <div class="rewards">${starsWon ? `<span>${icon('star')}+${starsWon}</span>` : ''}${coinsWon ? `<span>${icon('coin')}+${coinsWon}</span>` : ''}</div>
      <button class="big green" id="winNext">${primary}</button>
      ${stars < 3 && cur.mode === 'level' ? '<button class="link" id="winRetry">Repetir para 3 estrellas</button>' : ''}`, { closable: false });
    for (let n = 1; n <= stars; n++) setTimeout(() => sfx.star(n), 180 + n * 200);
    $('winNext').onclick = () => {
      closeSheet();
      if (canBuild || !hasNext) renderHome();
      else startLevel(cur.index + 1);
    };
    const retry = $('winRetry');
    if (retry) retry.onclick = () => startLevel(cur.index);
  }

  // ---------- Botones de partida ----------
  // Reiniciar devuelve las piezas a su sitio, pero los intentos ya gastados cuentan.
  $('reset').onclick = () => {
    if (cur.won) return;
    token++; busy = false;
    cur.pieces = cur.def.pieces.map(p => ({ ...p }));
    say(GOAL); renderBoard();
  };
  $('hint').onclick = () => {
    if (busy) return;
    const free = cur.fails >= FREE_HINT_AFTER;
    if (!free && S.coins < HINT_COST) {
      say(`Necesitas ${HINT_COST} monedas para una pista. Tras ${FREE_HINT_AFTER} intentos es gratis.`);
      sfx.fail(); return;
    }
    if (!free) S.coins -= HINT_COST;
    save(); renderHud();
    cur.hinted = true; cur.showHand = true;
    for (const [i, d] of cur.def.sol.dirs) cur.pieces[i].d = d;
    renderBoard(); renderLiveStars();
    say('Empieza por aquí.');
    sfx.tap();
  };
  $('back').onclick = () => { if (cur.won) return; busy = false; renderHome(); };

  // ---------- Pueblo ----------
  $('play').onclick = () => { const n = nextLevel(); if (n === null) openLevels(); else { sfx.tap(); startLevel(n); } };
  $('build').onclick = () => {
    const b = BUILDINGS[S.lit];
    if (!b || S.stars < b.cost) { sfx.tap(); return; }
    S.stars -= b.cost; S.lit++; S.coins += FRIEND_BONUS; save();
    sfx.build(); confetti(); renderHome(S.lit - 1);
    setTimeout(() => {
      sheet(`<h2>¡${b.friend.name} llegó al pueblo!</h2>
        <div class="friendBig">${friend(b.friend.color, b.friend.shade)}</div>
        <p>Encendiste: ${b.name}</p>
        <div class="rewards"><span>${icon('coin')}+${FRIEND_BONUS}</span></div>
        <button class="big green" id="friendOk">¡Genial!</button>`, { closable: false });
      $('friendOk').onclick = closeSheet;
    }, 900);
  };

  // ---------- Regalo, reto, álbum, niveles, ajustes ----------
  $('openGift').onclick = () => {
    const t = today(), claimed = S.giftDay === t;
    const streak = claimed ? S.giftStreak : S.giftDay === t - 1 ? S.giftStreak % 7 + 1 : 1;
    sheet(`<h2>Regalo diario</h2><p>Vuelve cada día: el premio crece.</p>
      <div class="days">${GIFTS.map((g, i) => `<div class="day ${i + 1 < streak || (claimed && i + 1 === streak) ? 'got' : ''} ${i + 1 === streak && !claimed ? 'now' : ''}"><small>Día ${i + 1}</small>${icon('coin')}<b>${g}</b></div>`).join('')}</div>
      <button class="big green" id="claim" ${claimed ? 'disabled' : ''}>${claimed ? 'Vuelve mañana' : `Recoger ${GIFTS[streak - 1]}`}</button>`);
    if (!claimed) $('claim').onclick = () => {
      S.giftDay = t; S.giftStreak = streak; S.coins += GIFTS[streak - 1]; save();
      sfx.coin(); closeSheet(); renderHome();
    };
  };
  $('openDaily').onclick = () => {
    const done = S.dailyDay === today();
    sheet(`<h2>Reto diario</h2><p>Un tablero difícil, el mismo para todos, cada día.</p>
      <div class="rewards"><span>${icon('coin')}+${DAILY_COINS}</span><span>${icon('star')}+${DAILY_STARS}</span></div>
      <button class="big green" id="goDaily">${done ? 'Jugar otra vez' : '¡Acepto!'}</button>`);
    $('goDaily').onclick = () => startLevel(today() % daily.length, 'daily');
  };
  $('openAlbum').onclick = () => {
    sheet(`<h2>Amigos</h2><p>${S.lit} de ${BUILDINGS.length} en el pueblo</p>
      <div class="album">${BUILDINGS.map((b, i) => `<div class="pal">${i < S.lit ? friend(b.friend.color, b.friend.shade) : friend('', '', true)}<small>${i < S.lit ? b.friend.name : '???'}</small></div>`).join('')}</div>`);
  };
  function openLevels() {
    sheet(`<h2>Niveles</h2><div class="levels">${levels.map((_, i) => {
      const open = i <= S.unlocked, b = S.best[i] || 0;
      return `<button class="lv ${b === 3 ? 'perfect' : ''}" data-l="${i}" ${open ? '' : 'disabled'} aria-label="Nivel ${i + 1}${open ? `, ${b} estrellas` : ', bloqueado'}"><b>${i + 1}</b><span>${open ? '★'.repeat(b) + '☆'.repeat(3 - b) : '🔒'}</span></button>`;
    }).join('')}</div>`);
    document.querySelectorAll('.lv').forEach(b => { b.onclick = () => startLevel(Number(b.dataset.l)); });
  }
  $('openLevels').onclick = openLevels;
  function openSettings() {
    sheet(`<h2>Ajustes</h2>
      <button class="toggle" id="tSound" aria-pressed="${S.sound}">Sonido<b>${S.sound ? 'Sí' : 'No'}</b></button>
      <button class="toggle" id="tHaptic" aria-pressed="${S.haptic}">Vibración<b>${S.haptic ? 'Sí' : 'No'}</b></button>
      <button class="link" id="wipe">Borrar mi progreso</button>`);
    $('tSound').onclick = () => { S.sound = !S.sound; save(); openSettings(); sfx.tap(); };
    $('tHaptic').onclick = () => { S.haptic = !S.haptic; save(); openSettings(); };
    $('wipe').onclick = () => {
      sheet(`<h2>¿Borrar todo?</h2><p>Perderás niveles, estrellas y el pueblo.</p>
        <button class="big red" id="wipeYes">Sí, borrar</button><button class="link" id="wipeNo">Cancelar</button>`);
      $('wipeNo').onclick = closeSheet;
      $('wipeYes').onclick = () => { try { localStorage.removeItem(KEY); } catch (e) { /* nada que borrar */ } location.reload(); };
    };
  }
  $('openSettings').onclick = openSettings;

  addEventListener('resize', () => { if (!$('game').hidden && !busy) { drawPreviews(); updateHand(); } });

  // El primer contacto es jugar: sin menús ni texto antes del primer toque.
  if (!Object.keys(S.best).length) startLevel(0); else renderHome();
})();
