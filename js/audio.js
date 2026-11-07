// Efectos sintetizados: notas suaves de marimba en escala pentatónica, sin archivos de audio.
(function () {
  'use strict';
  let ctx = null;
  const on = () => window.CRSave && window.CRSave.sound;
  function audio() {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = ctx || new C();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function tone(freq, dur = .22, vol = .16, type = 'sine', when = 0) {
    if (!on()) return;
    const c = audio();
    if (!c) return;
    try {
      const t = c.currentTime + when, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + .008);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .02);
    } catch (e) { /* el audio nunca debe romper el juego */ }
  }
  const SCALE = [0, 2, 4, 7, 9];
  const pitch = n => 392 * Math.pow(2, (SCALE[n % 5] + 12 * Math.floor(n / 5)) / 12);
  window.CRAudio = {
    tap() { tone(660, .08, .08, 'triangle'); },
    turn() { tone(520, .07, .1, 'triangle'); tone(780, .08, .08, 'triangle', .05); },
    chain(n) { const f = pitch(Math.min(n, 14)); tone(f, .24, .16); tone(f * 2, .12, .05, 'triangle'); },
    bomb() { tone(130, .3, .22, 'triangle'); tone(70, .36, .2); },
    coin() { tone(1319, .08, .09, 'triangle'); tone(1760, .16, .09, 'triangle', .06); },
    star(n) { tone(pitch(5 + n * 2), .3, .16); tone(pitch(7 + n * 2), .3, .1, 'sine', .08); },
    win() { [0, 2, 4, 5, 7].forEach((n, i) => tone(pitch(n + 2), .28, .14, 'sine', i * .08)); },
    fail() { tone(330, .18, .1, 'triangle'); tone(247, .28, .1, 'triangle', .13); },
    build() { [0, 3, 5, 8, 10].forEach((n, i) => tone(pitch(n), .4, .13, 'sine', i * .1)); },
  };
})();
