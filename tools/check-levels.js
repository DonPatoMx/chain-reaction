#!/usr/bin/env node
// Verifica cada nivel de forma independiente del generador.
global.window = {};
require('../js/levels.js');
const { simulate, solve } = require('../js/engine.js');
const { levels, daily } = window.CR_LEVELS;
let bad = 0;
const all = levels.map((l, i) => ['nivel ' + (i + 1), l]).concat(daily.map((l, i) => ['diario ' + (i + 1), l]));
for (const [name, l] of all) {
  const sols = solve(l);
  const fail = m => { bad++; console.log('FALLA', name, m); };
  if (sols.length !== 1) fail(`${sols.length} soluciones`);
  else {
    if (sols[0].start !== l.sol.start) fail('sol.start no coincide');
    if (l.pieces[l.sol.start].g) fail('el inicio es dorado');
  }
  const golds = l.pieces.filter(p => p.g);
  if (golds.length && l.pieces.some((p, i) => !p.g && simulate(l.pieces, i, l.size, l.rocks).won)) fail('se resuelve sin girar');
  const cells = new Set();
  for (const p of l.pieces) { const k = p.x + ',' + p.y; if (cells.has(k)) fail('piezas superpuestas'); cells.add(k); }
  for (const c of l.rocks.concat(l.coins)) if (cells.has(c.join())) fail('roca/moneda sobre pieza');
}
const curve = levels.map(l => l.pieces.length).join(' ');
console.log(`${all.length} tableros revisados, ${bad} problemas`);
console.log('piezas por nivel:', curve);
process.exit(bad ? 1 : 0);
