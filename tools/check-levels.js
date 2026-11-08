#!/usr/bin/env node
// Verifica cada tablero de forma independiente del generador.
global.window = {};
require('../js/levels.js');
const { simulate, solve } = require('../js/engine.js');
const { tutorial, levels, daily } = window.CR_LEVELS;

// Casillas que cruza cualquier rayo de una solución.
function rayCells(l, s) {
  const p = l.pieces.map(x => ({ ...x }));
  for (const [i, d] of s.dirs) p[i].d = d;
  const out = new Set();
  for (const w of simulate(p, s.start, l.size, l.rocks).sequence) for (const path of w.paths) for (const c of path.cells) out.add(c.join());
  return out;
}

let bad = 0;
const all = [].concat(
  tutorial.map((l, i) => ['tutorial ' + (i + 1), l]),
  levels.map((l, i) => ['nivel ' + (i + 1), l]),
  daily.map((l, i) => ['diario ' + (i + 1), l]));
for (const [name, l] of all) {
  const fail = m => { bad++; console.log('FALLA', name, m); };
  const sols = solve(l);
  const want = l.gem ? 2 : 1;
  if (sols.length !== want) fail(`${sols.length} soluciones (se esperaban ${want})`);
  if (!sols.some(s => s.start === l.sol.start)) fail('la pista no es una solución');
  if (l.pieces[l.sol.start].g) fail('el inicio es dorado');
  if (l.gem && sols.length === 2) {
    const through = sols.filter(s => rayCells(l, s).has(l.gem.join())).length;
    if (through !== 1) fail(`el cristal lo cruzan ${through} soluciones`);
    if (rayCells(l, l.sol).has(l.gem.join())) fail('la pista pasa por el cristal');
  }
  if (l.pieces.some(p => p.g) && l.pieces.some((p, i) => !p.g && simulate(l.pieces, i, l.size, l.rocks).won)) fail('se resuelve sin girar');
  const cells = new Set();
  for (const p of l.pieces) { const k = p.x + ',' + p.y; if (cells.has(k)) fail('piezas superpuestas'); cells.add(k); }
  for (const c of l.rocks.concat(l.coins, l.gem ? [l.gem] : [])) { if (cells.has(c.join())) fail('objeto sobre otra cosa'); cells.add(c.join()); }
}
console.log(`${all.length} tableros revisados, ${bad} problemas`);
console.log('piezas por nivel:', levels.map(l => l.pieces.length + (l.gem ? '💎' : '')).join(' '));
process.exit(bad ? 1 : 0);
