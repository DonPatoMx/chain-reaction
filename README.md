# Chain Reaction

Puzle móvil de reacciones en cadena: despierta a todos los Chispis con una sola chispa
y usa las estrellas para devolverle la luz al pueblo.

No necesita compilación: abre `index.html` con cualquier servidor estático.

- `js/engine.js`: reglas puras, sin DOM.
- `js/levels.js`: niveles generados. No editar a mano.
- `js/art.js`, `js/village.js`: arte SVG. `js/audio.js`: sonido sintetizado.
- `js/game.js`: pantallas, recompensas y guardado.

Para cambiar niveles, edita `tools/generate-levels.js` y ejecuta:

    node tools/generate-levels.js && node tools/check-levels.js

Cada `git push` a `main` se publica automáticamente en https://chain-reaction-iq.vercel.app.
