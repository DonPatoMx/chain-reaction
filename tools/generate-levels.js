#!/usr/bin/env node
// Genera js/levels.js. Reproducible: misma semilla, mismos niveles.
// Uso: node tools/generate-levels.js
const fs = require('fs');
const path = require('path');
const { STEPS, simulate, solve, exits } = require('../js/engine.js');

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const P = (x, y, t, d = 0, g) => (g ? { x, y, t, d, g: 1 } : { x, y, t, d });

// Tutorial, hecho a mano. Cada paso introduce una sola idea y no da premios.
const TUTORIAL = [
  { size: 5, rocks: [], pieces: [P(0, 2, 'line', 0), P(2, 2, 'line', 0), P(4, 2, 'line', 0)] },
  { size: 5, rocks: [], pieces: [P(0, 0, 'line', 0), P(2, 0, 'line', 1), P(2, 2, 'line', 0), P(4, 2, 'line', 3)] },
  { size: 5, rocks: [], pieces: [P(2, 2, 'double', 0), P(0, 2, 'line', 3), P(4, 2, 'line', 3), P(0, 0, 'line', 0), P(4, 0, 'line', 2)] },
  { size: 5, rocks: [], pieces: [P(2, 2, 'double', 1), P(2, 0, 'line', 0), P(2, 4, 'line', 2), P(4, 0, 'line', 1), P(0, 4, 'line', 3), P(4, 3, 'line', 2), P(0, 1, 'line', 0)] },
  { size: 5, rocks: [], pieces: [P(2, 2, 'bomb'), P(0, 2, 'line', 3), P(4, 2, 'line', 1), P(2, 0, 'double', 0), P(2, 4, 'double', 0), P(0, 0, 'line', 1), P(4, 0, 'line', 1), P(0, 4, 'line', 0), P(4, 4, 'line', 2)] },
  // Primer giro: la dorada mira al lado equivocado.
  { size: 5, rocks: [], pieces: [P(0, 1, 'line', 0), P(3, 1, 'line', 2, true), P(3, 4, 'line', 2)] },
  // Las rocas cortan la cadena: solo empezando abajo a la izquierda llega a todos.
  { size: 5, rocks: [[1, 4]], pieces: [P(0, 0, 'line', 0), P(3, 0, 'line', 1), P(3, 4, 'line', 2), P(0, 4, 'line', 3)] },
];

const TIERS = [
  { count: 4, gems: 0, size: 5, pieces: [4, 6], golds: [1, 1], rocks: [0, 0], dbl: .25, bomb: 0, minWaves: 3 },
  { count: 6, gems: 1, size: 5, pieces: [6, 8], golds: [1, 1], rocks: [1, 2], dbl: .3, bomb: .05, minWaves: 4 },
  { count: 8, gems: 2, size: 5, pieces: [7, 9], golds: [1, 2], rocks: [1, 2], dbl: .3, bomb: .1, minWaves: 4 },
  { count: 8, gems: 2, size: 6, pieces: [8, 10], golds: [1, 2], rocks: [2, 3], dbl: .3, bomb: .1, minWaves: 5 },
  { count: 8, gems: 2, size: 6, pieces: [10, 13], golds: [2, 2], rocks: [2, 4], dbl: .3, bomb: .12, minWaves: 5 },
];
const DAILY = { size: 6, pieces: [9, 12], golds: [1, 2], rocks: [2, 3], dbl: .3, bomb: .1, minWaves: 5 };

const between = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));

// Crece una cadena que se sabe resoluble: cada pieza nueva cae en un rayo de otra.
function grow(r, cfg, total) {
  const n = cfg.size;
  const newPiece = (x, y) => {
    const k = r();
    const t = k < cfg.bomb ? 'bomb' : k < cfg.bomb + cfg.dbl ? 'double' : 'line';
    return P(x, y, t, t === 'bomb' ? 0 : Math.floor(r() * 4));
  };
  const pieces = [newPiece(Math.floor(r() * n), Math.floor(r() * n))];
  if (pieces[0].t === 'bomb') pieces[0].t = 'line';
  let guard = 0;
  while (pieces.length < total && guard++ < 400) {
    const from = pieces[Math.floor(r() * pieces.length)];
    const dirs = exits(from);
    const dir = dirs[Math.floor(r() * dirs.length)];
    const dist = 1 + Math.floor(r() * (n - 1));
    const x = from.x + STEPS[dir][0] * dist, y = from.y + STEPS[dir][1] * dist;
    if (x < 0 || y < 0 || x >= n || y >= n) continue;
    if (pieces.some(p => p.x === x && p.y === y)) continue;
    pieces.push(newPiece(x, y));
  }
  return pieces.length === total ? pieces : null;
}

// Casillas que cruza cualquier rayo de una solución, incluidos los que se pierden.
function rayCells(level, sol) {
  const pieces = level.pieces.map(p => ({ ...p }));
  for (const [i, d] of sol.dirs) pieces[i].d = d;
  const out = new Set();
  for (const w of simulate(pieces, sol.start, level.size, level.rocks).sequence) for (const p of w.paths) for (const c of p.cells) out.add(c.join());
  return out;
}

function attempt(r, cfg, gemMode) {
  const pieces = grow(r, cfg, between(r, cfg.pieces));
  if (!pieces) return null;
  const full = simulate(pieces, 0, cfg.size, []);
  if (!full.won || full.sequence.length < cfg.minWaves) return null;

  // Rocas solo en casillas que el recorrido correcto no cruza.
  const used = new Set(pieces.map(p => p.x + ',' + p.y));
  for (const w of full.sequence) for (const p of w.paths) if (p.to !== null) for (const c of p.cells) used.add(c.join());
  const free = [];
  for (let y = 0; y < cfg.size; y++) for (let x = 0; x < cfg.size; x++) if (!used.has(x + ',' + y)) free.push([x, y]);
  const rocks = [];
  for (let k = between(r, cfg.rocks); k > 0 && free.length; k--) rocks.push(free.splice(Math.floor(r() * free.length), 1)[0]);

  // Las doradas nunca son el inicio, para que tocar una siempre signifique girar.
  const candidates = pieces.map((p, i) => i).filter(i => i !== 0 && pieces[i].t !== 'bomb');
  const golds = [];
  for (let k = between(r, cfg.golds); k > 0 && candidates.length; k--) golds.push(candidates.splice(Math.floor(r() * candidates.length), 1)[0]);
  if (!golds.length) return null;

  const coinCells = [];
  for (const w of full.sequence) for (const p of w.paths) if (p.to !== null) coinCells.push(...p.cells);
  const coinSet = [...new Set(coinCells.map(c => c.join()))].filter(c => !pieces.some(p => p.x + ',' + p.y === c));
  const coins = [];
  for (let k = Math.min(3, coinSet.length); k > 0; k--) coins.push(coinSet.splice(Math.floor(r() * coinSet.length), 1)[0].split(',').map(Number));

  golds.forEach(i => { pieces[i].g = 1; });
  const level = { size: cfg.size, pieces, rocks, coins };
  const solution = golds.map(i => [i, pieces[i].d]);
  const sols = solve(level);
  let hintSol = { start: 0, dirs: solution }, gem = null;
  if (!gemMode) {
    if (sols.length !== 1 || sols[0].start !== 0) return null;
  } else {
    // Exactamente dos soluciones; el cristal queda en el camino de la más larga.
    if (sols.length !== 2) return null;
    const waves = s => { const p = level.pieces.map(x => ({ ...x })); for (const [i, d] of s.dirs) p[i].d = d; return simulate(p, s.start, cfg.size, rocks).sequence.length; };
    const [hard, easy] = waves(sols[0]) >= waves(sols[1]) ? sols : [sols[1], sols[0]];
    const taken = new Set(pieces.map(p => p.x + ',' + p.y).concat(rocks.map(c => c.join()), coins.map(c => c.join())));
    const easyCells = rayCells(level, easy);
    const only = [...rayCells(level, hard)].filter(c => !easyCells.has(c) && !taken.has(c));
    if (!only.length) return null;
    gem = only[Math.floor(r() * only.length)].split(',').map(Number);
    hintSol = easy;
  }

  // Desordena las doradas: la orientación inicial no puede resolver el nivel.
  const shuffled = level.pieces.map(p => ({ ...p }));
  for (const [i, d] of solution) {
    const opts = (shuffled[i].t === 'double' ? [1, 2, 3] : [1, 2, 3]).map(k => (d + k) % 4);
    shuffled[i].d = opts[Math.floor(r() * opts.length)];
    if (shuffled[i].t === 'double' && shuffled[i].d % 2 === d % 2) shuffled[i].d = (d + 1) % 4;
  }
  if (shuffled.some((p, i) => !p.g && simulate(shuffled, i, cfg.size, rocks).won)) return null;

  // Exige señuelos: otro inicio debe parecer prometedor (o no hay decisión real).
  let decoys = 0;
  shuffled.forEach((p, i) => {
    if (i && !p.g && simulate(level.pieces, i, cfg.size, rocks).count >= 3) decoys++;
  });
  if (shuffled.length > 5 && decoys < 1) return null;

  // Mezcla el orden para que el índice no delate la solución.
  const order = shuffled.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const out = order.map(i => shuffled[i]);
  const remap = i => order.indexOf(i);
  const lvl = {
    size: cfg.size, rocks, coins, pieces: out,
    sol: { start: remap(hintSol.start), dirs: hintSol.dirs.map(([i, d]) => [remap(i), d]) },
    weight: out.length * 2 + full.sequence.length + golds.length * 3 + decoys,
  };
  if (gem) lvl.gem = gem;
  return lvl;
}

function batch(r, cfg, count, gems = 0) {
  const found = [];
  const seen = new Set();
  let tries = 0;
  while (found.length < count) {
    if (++tries > 8e6) throw new Error('Sin niveles suficientes: ' + JSON.stringify(cfg));
    const lvl = attempt(r, cfg, found.length < gems);
    if (!lvl) continue;
    const key = JSON.stringify(lvl.pieces);
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(lvl);
  }
  return found.sort((a, b) => a.weight - b.weight);
}

const r = rng(20261107);
const tutorial = TUTORIAL.map(l => {
  const sols = solve({ ...l, coins: [] });
  if (sols.length !== 1) throw new Error('Paso de tutorial sin solución única');
  return { ...l, coins: [], sol: sols[0] };
});
const levels = [].concat(...TIERS.map(t => batch(r, t, t.count, t.gems)));
const daily = batch(r, DAILY, 30).sort(() => r() - .5);
const strip = ({ weight, ...l }) => l;
const body = 'window.CR_LEVELS=' + JSON.stringify({ tutorial, levels: levels.map(strip), daily: daily.map(strip) }) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'js', 'levels.js'), '// Generado por tools/generate-levels.js. No editar a mano.\n' + body);
console.log(`${tutorial.length} pasos de tutorial, ${levels.length} niveles (${levels.filter(l => l.gem).length} con cristal), ${daily.length} retos diarios`);
