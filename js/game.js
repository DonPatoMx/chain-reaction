(function () {
  'use strict';
  const { simulate } = CREngine;
  const { tutorial, levels, daily } = CR_LEVELS;
  const { BUILDINGS, scene, TOWN_NAME } = CRVillage;
  const { chispi, friend, rock, coin, star, ICONS } = CRArt;
  const sfx = CRAudio;
  const $ = id => document.getElementById(id);

  // ---------- Guardado ----------
  // v3: el tutorial separa los niveles, así que los índices de v2 ya no coinciden.
  const KEY = 'chain-reaction-v3';
  const DEFAULTS = {
    tutDone: false, tutStep: 0,
    best: {}, gemsGot: {}, prog: {},
    stars: 0, coins: 0, gems: 0, lit: 0,
    sound: true, haptic: true, giftDay: 0, giftStreak: 0, dailyDay: 0,
  };
  let S = { ...DEFAULTS };
  try { S = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* guardado no disponible */ }
  window.CRSave = S;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sin guardado: el juego sigue */ } };

  // ---------- Reglas de economía ----------
  const HINT_COST = 25;
  const FREE_HINT_AFTER = 3;
  const REPLAY_COINS = 60, REPLAY_GEMS = 1;
  const TUTORIAL_REWARD = { stars: 3, coins: 50, gems: 1 };
  const GIFTS = [10, 15, 20, 25, 30, 40, 60];
  const DAILY_COINS = 30, DAILY_STARS = 2, FRIEND_BONUS = 20;

  // Estrellas: 3 solo a la primera. Con pista, como máximo 1.
  const starsFor = (tries, hinted) => (hinted ? 1 : tries <= 1 ? 3 : tries === 2 ? 2 : 1);

  const TUTORIAL_TIPS = [
    { text: '¡Toca a este Chispi para despertarlo!', hand: true },
    { text: 'La punta muestra hacia dónde salta la chispa.', hand: true },
    { text: 'Los morados saltan hacia los dos lados.' },
    { text: 'Solo tienes una chispa. ¿Con quién empiezas?' },
    { text: '¡Los naranjas saltan en cuatro direcciones!' },
    { text: 'Toca al del aro dorado para girarlo.', gold: true },
    { text: 'Las rocas detienen la chispa. ¡Piensa bien!' },
  ];
  const firstGem = levels.findIndex(l => l.gem);
  const LEVEL_TIPS = {
    0: '¡Ahora cuenta! Gana a la primera para 3 estrellas.',
    [firstGem]: '¡Un cristal! Hay dos formas de ganar y solo una pasa por él.',
  };
  const GOAL = 'Despierta a todos con una sola chispa.';

  const today = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const buzz = p => { if (S.haptic && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* no soportado */ } } };
  const icon = n => `<span class="ic">${ICONS[n]}</span>`;

  document.querySelectorAll('[data-icon]').forEach(el => { el.classList.add('ic'); el.innerHTML = ICONS[el.dataset.icon]; });
  $('sayFace').innerHTML = friend('#ffd84d', '#e8a80c');
  $('hand').innerHTML = ICONS.hand;

  // ---------- Progreso ----------
  const current = () => { for (let i = 0; i < levels.length; i++) if (!S.best[i]) return i; return levels.length; };
  const townDone = () => S.lit === BUILDINGS.length && current() === levels.length;
  const canBuild = () => !!BUILDINGS[S.lit] && S.stars >= BUILDINGS[S.lit].cost;

  // ---------- Pantallas ----------
  let cur = null, busy = false, token = 0;

  function show(id) {
    token++;
    for (const s of ['map', 'village', 'game']) $(s).hidden = s !== id;
  }
  function renderHud() {
    document.querySelectorAll('.nStars').forEach(e => { e.textContent = S.stars; });
    document.querySelectorAll('.nCoins').forEach(e => { e.textContent = S.coins; });
    document.querySelectorAll('.nGems').forEach(e => { e.textContent = S.gems; });
  }

  function renderMap({ smoothTo = false } = {}) {
    show('map'); renderHud();
    const n = current();
    const m = CRMap.render({ tutDone: S.tutDone, best: S.best, gemsGot: S.gemsGot, lit: S.lit, levels, current: n });
    $('mapInner').innerHTML = m.svg;
    $('play').innerHTML = !S.tutDone ? 'EMPEZAR <small>Tutorial</small>' : n < levels.length ? `JUGAR <small>Nivel ${n + 1}</small>` : townDone() ? '¡Pueblo completo!' : 'Ilumina el pueblo';
    $('giftDot').hidden = S.giftDay === today();
    $('dailyDot').hidden = !S.tutDone || S.dailyDay === today();
    $('buildDot').hidden = !canBuild();
    const box = $('mapScroll');
    const scale = box.clientWidth / 390;
    const top = Math.max(0, m.focusY * scale - box.clientHeight * .58);
    if (smoothTo) box.scrollTo({ top, behavior: 'smooth' }); else box.scrollTop = top;
  }

  $('mapInner').addEventListener('click', e => {
    const g = e.target.closest('[data-node]');
    if (g) onNode(g.dataset.node);
  });
  $('mapInner').addEventListener('keydown', e => {
    const g = e.target.closest('[data-node]');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onNode(g.dataset.node); }
  });

  function onNode(id) {
    sfx.tap();
    if (id === 'tut') return startTutorial(S.tutDone ? 0 : S.tutStep);
    if (id === 'town') return renderVillage();
    if (id === 'gate') {
      return sheet(`<h2>Puente cerrado</h2><p>Termina los ${levels.length} niveles y enciende las ${BUILDINGS.length} luces de ${TOWN_NAME} para cruzar.</p>
        <div class="rewards"><span>${current()} / ${levels.length} niveles</span><span>${S.lit} / ${BUILDINGS.length} luces</span></div>
        ${townDone() ? `<p><b>¡Lo lograste!</b> El siguiente pueblo llegará muy pronto.</p>` : ''}<button class="big green" id="ok">Entendido</button>`), ($('ok').onclick = closeSheet);
    }
    if (id.startsWith('soon')) {
      const f = CRMap.FUTURE[Number(id.slice(4))];
      sheet(`<h2>${f.name}</h2><p>Este pueblo todavía duerme. Muy pronto podrás viajar hasta aquí con nuevos niveles y nuevos amigos.</p><button class="big green" id="ok">¡Qué ganas!</button>`);
      $('ok').onclick = closeSheet;
      return;
    }
    if (id.startsWith('L')) openLevel(Number(id.slice(1)));
  }

  // Un nivel ya superado sin 3 estrellas solo se repite pagando: el reto debe sentirse.
  function openLevel(i) {
    if (!S.tutDone) return sheet('<h2>Primero, el tutorial</h2><p>Aprende a jugar en el campamento: son solo unos pasos.</p><button class="big green" id="ok">Ir al tutorial</button>'), ($('ok').onclick = () => startTutorial(S.tutStep));
    const n = current();
    if (i > n) return sheet(`<h2>Nivel ${i + 1}</h2><p>Supera el nivel ${n + 1} para llegar hasta aquí.</p><button class="big green" id="ok">Entendido</button>`), ($('ok').onclick = closeSheet);
    if (!S.best[i]) return startLevel(i);
    const b = S.best[i];
    const gemNote = levels[i].gem && !S.gemsGot[i] ? `<p class="gemNote">${icon('gem')} Aún no has conseguido el cristal de este nivel.</p>` : '';
    if (b === 3) {
      sheet(`<h2>Nivel ${i + 1}</h2><div class="bigStars small">${[1, 2, 3].map(() => `<span class="ic">${star(true)}</span>`).join('')}</div>
        <p>¡Ya es perfecto! Puedes jugarlo otra vez, pero no da estrellas ni monedas.</p>${gemNote}
        <button class="big green" id="again">Jugar otra vez</button>`);
      $('again').onclick = () => startLevel(i, { free: true });
      return;
    }
    replaySheet(i);
  }

  function replaySheet(i) {
    const b = S.best[i] || 0;
    const gemNote = levels[i].gem && !S.gemsGot[i] ? `<p class="gemNote">${icon('gem')} Este nivel esconde un cristal.</p>` : '';
    sheet(`<h2>Nivel ${i + 1}</h2>
      <div class="bigStars small">${[1, 2, 3].map(k => `<span class="ic">${star(k <= b)}</span>`).join('')}</div>
      <p>Para intentar las 3 estrellas otra vez necesitas pagar la revancha.</p>${gemNote}
      <div class="payRow">
        <button class="pay" id="payGem" ${S.gems >= REPLAY_GEMS ? '' : 'disabled'}>${icon('gem')}<b>${REPLAY_GEMS}</b><small>Tienes ${S.gems}</small></button>
        <button class="pay" id="payCoin" ${S.coins >= REPLAY_COINS ? '' : 'disabled'}>${icon('coin')}<b>${REPLAY_COINS}</b><small>Tienes ${S.coins}</small></button>
      </div>
      <p class="fine">Los cristales se ganan tomando el camino que pasa por ellos.</p>`);
    $('payGem').onclick = () => { S.gems -= REPLAY_GEMS; save(); sfx.coin(); startLevel(i, { replay: true }); };
    $('payCoin').onclick = () => { S.coins -= REPLAY_COINS; save(); sfx.coin(); startLevel(i, { replay: true }); };
  }

  function renderVillage(justLit = -1) {
    show('village'); renderHud();
    $('townTitle').textContent = TOWN_NAME;
    $('scene').innerHTML = scene(S.lit, justLit, { uid: 'village' });
    const card = $('build'), b = BUILDINGS[S.lit];
    card.classList.remove('ready');
    if (!b) { card.innerHTML = '<b class="wide">¡Pueblo completo!</b><em>Todos los Chispis están en casa</em>'; return; }
    const ready = S.stars >= b.cost;
    card.classList.toggle('ready', ready);
    card.innerHTML = `<b>${b.name}</b><span class="cost">${icon('star')}${Math.min(S.stars, b.cost)} / ${b.cost}</span>
      <i class="bar"><u style="width:${Math.min(100, S.stars / b.cost * 100)}%"></u></i>
      <em>${ready ? '¡Toca para encender!' : `Te faltan ${b.cost - S.stars} estrellas. ¡Gánalas en los niveles!`}</em>`;
  }

  // ---------- Hojas modales ----------
  function sheet(html, { closable = true } = {}) {
    $('sheet').innerHTML = (closable ? '<button class="x" id="sheetX" aria-label="Cerrar">×</button>' : '') + html;
    $('sheetBack').hidden = false;
    $('sheetBack').onclick = e => { if (closable && e.target === $('sheetBack')) closeSheet(); };
    if (closable) $('sheetX').onclick = closeSheet;
  }
  function closeSheet() { $('sheetBack').hidden = true; }

  function toast(text) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = text;
    $('app').append(t);
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }

  // ---------- Partida ----------
  function startTutorial(step) { begin({ mode: 'tutorial', index: step, def: tutorial[step] }); }

  function startLevel(i, { replay = false, free = false } = {}) {
    // Los intentos y la pista se guardan: salir y volver no reinicia las estrellas.
    if (replay || free || !S.prog[i]) S.prog[i] = { tries: 0, hinted: false };
    save();
    begin({ mode: 'level', index: i, def: levels[i], replay, free });
  }

  function begin({ mode, index, def, replay = false, free = false }) {
    closeSheet(); show('game'); busy = false;
    const prog = mode === 'level' ? S.prog[index] : { tries: 0, hinted: false };
    cur = { mode, index, def, replay, free, prog, pieces: def.pieces.map(p => ({ ...p })), fails: 0, showHand: false, won: false };
    if (mode === 'tutorial') {
      const tip = TUTORIAL_TIPS[index];
      cur.showHand = !!(tip.hand || tip.gold);
      $('levelName').textContent = `Tutorial ${index + 1}/${tutorial.length}`;
      say(tip.text);
    } else if (mode === 'daily') {
      $('levelName').textContent = 'Reto diario';
      say('¡El reto de hoy! Un tablero difícil, el mismo para todos.');
    } else {
      $('levelName').textContent = `Nivel ${index + 1}`;
      say(free ? 'Partida libre: sin premios, solo por diversión.' : replay ? '¡Revancha! Gana a la primera para 3 estrellas.' : LEVEL_TIPS[index] || GOAL);
    }
    renderHud(); renderBoard(); renderLiveStars(); renderHintButton();
  }

  const say = t => { $('sayText').textContent = t; };

  function renderLiveStars() {
    const box = $('liveStars');
    if (cur.mode === 'tutorial') {
      box.innerHTML = tutorial.map((_, i) => `<i class="step ${i < cur.index ? 'on' : i === cur.index ? 'now' : ''}"></i>`).join('');
      return;
    }
    if (cur.mode === 'daily' || cur.free) { box.innerHTML = ''; return; }
    const p = starsFor(cur.prog.tries + 1, cur.prog.hinted);
    box.innerHTML = [1, 2, 3].map(n => `<span class="ic">${star(n <= p)}</span>`).join('');
  }
  function renderHintButton() {
    const free = cur.mode === 'tutorial' || cur.fails >= FREE_HINT_AFTER;
    $('hintCost').innerHTML = free ? 'Gratis' : `${HINT_COST}`;
    $('hint').classList.toggle('free', free);
  }

  const cellEl = (x, y) => $('board').children[y * cur.def.size + x];
  const tile = i => $('board').querySelector(`[data-i="${i}"]`);
  const KIND = { line: 'azul', double: 'morado', bomb: 'naranja' };

  function renderBoard() {
    const { size, rocks, coins, gem } = cur.def, board = $('board');
    board.style.setProperty('--n', size);
    board.innerHTML = '';
    clearFx();
    const at = new Map(cur.pieces.map((p, i) => [p.x + ',' + p.y, i]));
    const rockSet = new Set(rocks.map(r => r.join()));
    const coinSet = new Set(coins.map(c => c.join()));
    const gemKey = gem && !(cur.mode === 'level' && S.gemsGot[cur.index]) ? gem.join() : null;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const k = x + ',' + y;
      if (rockSet.has(k)) cell.innerHTML = `<span class="rock">${rock}</span>`;
      else if (k === gemKey) cell.innerHTML = `<span class="gem">${ICONS.gem}</span>`;
      else if (coinSet.has(k) && !cur.free) cell.innerHTML = `<span class="coin">${coin}</span>`;
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
    if (busy || cur.won) return;
    if (cur.pieces[i].g) return turn(i);
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
    const tip = cur.mode === 'tutorial' ? TUTORIAL_TIPS[cur.index] : null;
    if (tip && tip.gold) say(wrong ? tip.text : '¡Perfecto! Ahora despierta al primero.');
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
    if (cur.mode === 'level') { cur.prog.tries++; save(); }
    cur.coinsTaken = 0; cur.gemTaken = false;
    const sim = simulate(cur.pieces, start, cur.def.size, cur.def.rocks);
    const first = tile(start);
    first.classList.add('charging'); sfx.tap(); buzz(15);
    await wait(240);
    if (tok !== token) return;
    first.classList.remove('charging');

    let chain = 0;
    for (const wave of sim.sequence) {
      for (const i of wave.activated) {
        tile(i).classList.add('awake');
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
          setTimeout(() => {
            if (tok !== token) return;
            const cell = cellEl(c[0], c[1]);
            const item = cell.querySelector('.coin:not(.taken), .gem:not(.taken)');
            if (!item) return;
            item.classList.add('taken');
            if (item.classList.contains('gem')) { cur.gemTaken = true; sfx.star(3); buzz(30); } else { cur.coinsTaken++; sfx.coin(); }
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
    // En el tutorial nadie se queda atascado: tras un fallo, la mano muestra el camino.
    if (cur.mode === 'tutorial') cur.showHand = true;
    renderBoard();
  }

  function win() {
    busy = true; cur.won = true;
    confetti(); sfx.win(); buzz([30, 40, 70]);
    if (cur.mode === 'tutorial') return tutorialStepDone();
    let stars = 3, starsWon = 0, coinsWon = 0, gemWon = false;
    if (cur.mode === 'daily') {
      const first = S.dailyDay !== today();
      if (first) { S.dailyDay = today(); coinsWon = DAILY_COINS; starsWon = DAILY_STARS; }
    } else {
      const i = cur.index;
      if (cur.gemTaken && !S.gemsGot[i]) { S.gemsGot[i] = true; S.gems++; gemWon = true; }
      if (!cur.free) {
        stars = starsFor(cur.prog.tries, cur.prog.hinted);
        const prev = S.best[i] || 0;
        starsWon = Math.max(0, stars - prev);
        S.best[i] = Math.max(prev, stars);
        if (!prev) coinsWon = 5 + cur.coinsTaken * 2;
      }
      delete S.prog[i];
    }
    S.stars += starsWon; S.coins += coinsWon;
    save();
    setTimeout(() => showWin(stars, starsWon, coinsWon, gemWon), 650);
  }

  function tutorialStepDone() {
    const last = cur.index === tutorial.length - 1;
    if (!S.tutDone) { S.tutStep = Math.max(S.tutStep, cur.index + 1); save(); }
    say(last ? '¡Lo lograste!' : '¡Muy bien!');
    toast(last ? '¡Tutorial completado!' : '¡Bien hecho!');
    setTimeout(() => {
      if (!last) return startTutorial(cur.index + 1);
      if (S.tutDone) {
        sheet('<h2>¡Repaso completado!</h2><p>Ya conoces todos los trucos.</p><button class="big green" id="ok">Volver al mapa</button>', { closable: false });
        $('ok').onclick = () => { closeSheet(); renderMap(); };
        return;
      }
      S.tutDone = true;
      S.stars += TUTORIAL_REWARD.stars; S.coins += TUTORIAL_REWARD.coins; S.gems += TUTORIAL_REWARD.gems;
      save(); sfx.build(); confetti();
      sheet(`<div class="diploma">${friend('#ffd84d', '#e8a80c')}</div>
        <h2>¡Ya sabes jugar!</h2><p>Completaste el entrenamiento de los Chispis. Aquí está tu primera recompensa:</p>
        <div class="rewards"><span>${icon('star')}+${TUTORIAL_REWARD.stars}</span><span>${icon('coin')}+${TUTORIAL_REWARD.coins}</span><span>${icon('gem')}+${TUTORIAL_REWARD.gems}</span></div>
        <p class="fine">Usa tus estrellas para devolverle la luz a ${TOWN_NAME}.</p>
        <button class="big green" id="ok">Encender mi primera luz</button>`, { closable: false });
      $('ok').onclick = () => { closeSheet(); renderVillage(); };
    }, 1000);
  }

  function showWin(stars, starsWon, coinsWon, gemWon) {
    const build = canBuild(), b = BUILDINGS[S.lit];
    const title = cur.mode === 'daily' ? '¡Reto superado!' : cur.free ? '¡Otra vez perfecto!' : ['', '¡Lo lograste!', '¡Muy bien!', '¡Perfecto!'][stars];
    const missed = cur.mode === 'level' && !cur.free && stars < 3;
    const gemMissed = cur.mode === 'level' && cur.def.gem && !S.gemsGot[cur.index];
    sheet(`<h2>${title}</h2>
      ${cur.mode === 'level' && !cur.free ? `<div class="bigStars">${[1, 2, 3].map(n => `<span class="ic s${n}">${star(n <= stars)}</span>`).join('')}</div>` : ''}
      <div class="rewards">${starsWon ? `<span>${icon('star')}+${starsWon}</span>` : ''}${coinsWon ? `<span>${icon('coin')}+${coinsWon}</span>` : ''}${gemWon ? `<span class="gemWin">${icon('gem')}+1</span>` : ''}</div>
      ${gemWon ? '<p><b>¡Encontraste un cristal!</b> Sirve para pagar revanchas.</p>' : gemMissed ? `<p class="gemNote">${icon('gem')} Había otro camino que pasaba por el cristal.</p>` : ''}
      ${missed ? `<p class="fine">${stars === 1 ? 'Se te escaparon 2 estrellas.' : 'Se te escapó 1 estrella.'} Puedes volver a intentarlo pagando una revancha.</p>` : ''}
      <button class="big green" id="winNext">${build ? `Encender ${b.name}` : 'Continuar'}</button>
      ${missed ? `<button class="link" id="winRetry">Revancha: ${icon('gem')} ${REPLAY_GEMS} o ${icon('coin')} ${REPLAY_COINS}</button>` : ''}`, { closable: false });
    for (let n = 1; n <= stars; n++) setTimeout(() => sfx.star(n), 180 + n * 200);
    const index = cur.index;
    $('winNext').onclick = () => { closeSheet(); if (build) renderVillage(); else renderMap({ smoothTo: true }); };
    const retry = $('winRetry');
    if (retry) retry.onclick = () => replaySheet(index);
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
    if (busy || cur.won) return;
    const free = cur.mode === 'tutorial' || cur.fails >= FREE_HINT_AFTER;
    if (!free && S.coins < HINT_COST) {
      say(`Necesitas ${HINT_COST} monedas para una pista. Tras ${FREE_HINT_AFTER} intentos es gratis.`);
      sfx.fail(); return;
    }
    if (!free) S.coins -= HINT_COST;
    if (cur.mode === 'level') cur.prog.hinted = true;
    save(); renderHud();
    cur.showHand = true;
    for (const [i, d] of cur.def.sol.dirs) cur.pieces[i].d = d;
    renderBoard(); renderLiveStars();
    say(cur.mode === 'level' && !cur.free ? 'Empieza por aquí. Con pista, el máximo es 1 estrella.' : 'Empieza por aquí.');
    sfx.tap();
  };
  $('back').onclick = () => { if (cur.won) return; busy = false; renderMap(); };

  // ---------- Mapa y pueblo ----------
  $('play').onclick = () => {
    sfx.tap();
    if (!S.tutDone) return startTutorial(S.tutStep);
    const n = current();
    if (n < levels.length) return startLevel(n);
    renderVillage();
  };
  $('openVillage').onclick = () => { sfx.tap(); renderVillage(); };
  $('villageBack').onclick = () => renderMap();
  $('toMap').onclick = () => renderMap();
  $('build').onclick = () => {
    const b = BUILDINGS[S.lit];
    if (!b || S.stars < b.cost) { sfx.tap(); return; }
    S.stars -= b.cost; S.lit++; S.coins += FRIEND_BONUS; save();
    sfx.build(); confetti(); renderVillage(S.lit - 1);
    setTimeout(() => {
      sheet(`<h2>¡${b.friend.name} llegó al pueblo!</h2>
        <div class="friendBig">${friend(b.friend.color, b.friend.shade)}</div>
        <p>Encendiste: ${b.name}</p>
        <div class="rewards"><span>${icon('coin')}+${FRIEND_BONUS}</span></div>
        <button class="big green" id="friendOk">¡Genial!</button>`, { closable: false });
      $('friendOk').onclick = closeSheet;
    }, 900);
  };

  // ---------- Regalo, reto, álbum, ajustes ----------
  $('openGift').onclick = () => {
    const t = today(), claimed = S.giftDay === t;
    const streak = claimed ? S.giftStreak : S.giftDay === t - 1 ? S.giftStreak % 7 + 1 : 1;
    sheet(`<h2>Regalo diario</h2><p>Vuelve cada día: el premio crece.</p>
      <div class="days">${GIFTS.map((g, i) => `<div class="day ${i + 1 < streak || (claimed && i + 1 === streak) ? 'got' : ''} ${i + 1 === streak && !claimed ? 'now' : ''}"><small>Día ${i + 1}</small>${icon('coin')}<b>${g}</b></div>`).join('')}</div>
      <button class="big green" id="claim" ${claimed ? 'disabled' : ''}>${claimed ? 'Vuelve mañana' : `Recoger ${GIFTS[streak - 1]}`}</button>`);
    if (!claimed) $('claim').onclick = () => {
      S.giftDay = t; S.giftStreak = streak; S.coins += GIFTS[streak - 1]; save();
      sfx.coin(); closeSheet(); renderMap();
    };
  };
  $('openDaily').onclick = () => {
    if (!S.tutDone) return sheet('<h2>Reto diario</h2><p>Termina el tutorial para desbloquear el reto de cada día.</p><button class="big green" id="ok">Ir al tutorial</button>'), ($('ok').onclick = () => startTutorial(S.tutStep));
    const done = S.dailyDay === today();
    sheet(`<h2>Reto diario</h2><p>Un tablero difícil, el mismo para todos, cada día.</p>
      <div class="rewards"><span>${icon('coin')}+${DAILY_COINS}</span><span>${icon('star')}+${DAILY_STARS}</span></div>
      <button class="big green" id="goDaily">${done ? 'Jugar otra vez (sin premio)' : '¡Acepto!'}</button>`);
    $('goDaily').onclick = () => begin({ mode: 'daily', index: today() % daily.length, def: daily[today() % daily.length] });
  };
  $('openAlbum').onclick = () => {
    sheet(`<h2>Amigos</h2><p>${S.lit} de ${BUILDINGS.length} en ${TOWN_NAME}</p>
      <div class="album">${BUILDINGS.map((b, i) => `<div class="pal">${i < S.lit ? friend(b.friend.color, b.friend.shade) : friend('', '', true)}<small>${i < S.lit ? b.friend.name : '???'}</small></div>`).join('')}</div>
      <p class="fine">Más amigos te esperan en los próximos pueblos.</p>`);
  };
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

  // El juego siempre abre en el mapa: el camino es parte de la promesa.
  renderMap();
})();
