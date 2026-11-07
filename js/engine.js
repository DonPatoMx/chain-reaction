// Motor puro del juego: sin DOM, compartido por el navegador y tools/.
(function (root) {
  'use strict';
  const STEPS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

  function exits(p) {
    if (p.t === 'line') return [p.d];
    if (p.t === 'double') return [p.d, (p.d + 2) % 4];
    return [0, 1, 2, 3];
  }

  // Devuelve las oleadas simultáneas de activación, con el recorrido real de cada rayo.
  function simulate(pieces, start, size, rocks) {
    const byPos = new Map(pieces.map((p, i) => [p.x + ',' + p.y, i]));
    const rockSet = new Set((rocks || []).map(r => r[0] + ',' + r[1]));
    const done = new Set();
    const sequence = [];
    let wave = [start];
    while (wave.length) {
      for (const i of wave) done.add(i);
      const paths = [];
      const next = new Set();
      for (const i of wave) {
        const p = pieces[i];
        for (const dir of exits(p)) {
          let x = p.x, y = p.y, to = null;
          const cells = [];
          for (;;) {
            const nx = x + STEPS[dir][0], ny = y + STEPS[dir][1];
            if (nx < 0 || ny < 0 || nx >= size || ny >= size || rockSet.has(nx + ',' + ny)) break;
            x = nx; y = ny;
            const target = byPos.get(x + ',' + y);
            if (target !== undefined && !done.has(target)) { to = target; break; }
            cells.push([x, y]);
          }
          paths.push({ from: i, to, dir, cells, endX: x, endY: y });
          if (to !== null) next.add(to);
        }
      }
      sequence.push({ activated: wave, paths });
      wave = [...next];
    }
    return { sequence, count: done.size, won: done.size === pieces.length };
  }

  // Orientaciones distintas: una doble a 0° y a 180° dispara igual.
  function orientations(p) {
    return p.t === 'double' ? [0, 1] : [0, 1, 2, 3];
  }

  // Todas las soluciones de un nivel. Las piezas doradas giran y no sirven de inicio.
  function solve(level) {
    const golds = level.pieces.map((p, i) => (p.g ? i : -1)).filter(i => i >= 0);
    const pieces = level.pieces.map(p => ({ ...p }));
    const solutions = [];
    const walk = depth => {
      if (depth < golds.length) {
        const i = golds[depth];
        for (const d of orientations(pieces[i])) { pieces[i].d = d; walk(depth + 1); }
        return;
      }
      pieces.forEach((p, i) => {
        if (p.g) return;
        if (simulate(pieces, i, level.size, level.rocks).won) {
          solutions.push({ start: i, dirs: golds.map(g => [g, pieces[g].d]) });
        }
      });
    };
    walk(0);
    return solutions;
  }

  const api = { STEPS, exits, simulate, solve, orientations };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CREngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
