# Pianista

**ES** · Aprende a tocar el piano gratis, en el navegador, sin cuentas ni cuotas. Notas que caen, partitura que avanza con lo que tocas (teclado MIDI o micrófono), cualquier canción en MIDI/MusicXML, tutoriales por niveles, en español e inglés.

**EN** · Learn piano for free, in the browser, no accounts or subscriptions. Falling notes, sheet music that follows what you play (MIDI keyboard or microphone), any song in MIDI/MusicXML, lessons for every level, in Spanish and English.

Plan de desarrollo / roadmap: [PLAN.md](./PLAN.md)

## Desarrollo / Development

```sh
bun install
bun run dev      # http://localhost:5173
bun run build    # static site in build/client
bun test
```

Se despliega solo a GitHub Pages en cada push a `main` (`.github/workflows/deploy.yml`).

## Créditos / Credits

Pianista es un fork de [sightread](https://github.com/sightread/sightread) (Jake Fried), snapshot de marzo de 2026, GPL‑3.0. Sonidos de piano: Salamander Grand Piano (CC‑BY). Otros instrumentos: [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) (MIT). Detección de acordes por micrófono: modelo [Basic Pitch](https://github.com/spotify/basic-pitch) de Spotify (Apache‑2.0, `public/basic-pitch/`). Detección monofónica: [pitchy](https://github.com/ianprime0509/pitchy) (MIT).

Licencia: GPL‑3.0, ver [LICENSE](./LICENSE).
