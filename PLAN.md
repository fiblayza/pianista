# Pianista — Plan de desarrollo

App web libre para aprender piano: notas que caen (estilo Synthesia) + pentagrama que avanza
según lo que tocas (MIDI o micro), cualquier canción, tutoriales por niveles, ES/EN, cualquier
sistema de nombres de notas. Coste: 0 €. Sin servidor. Sin cuentas.

## 0. Decisiones base

| Decisión | Elección | Por qué |
|---|---|---|
| Punto de partida | **Fork de [sightread](https://github.com/sightread/sightread)** (GPL‑3.0, React + TS + Vite) | Ya tiene notas cayendo, modo partitura, entrada MIDI, entrada micro, subida de MIDI/MusicXML. Nos ahorra ~3 meses. Está congelado (privado desde 03/2026) pero el snapshot es libre para siempre. |
| Plan B | Desde cero con OpenSheetMusicDisplay (BSD) + canvas propio | Solo si al evaluar el fork (fase 0) el código es inmantenible. |
| Licencia | GPL‑3.0 (obligada por el fork; encaja con "abierta") | |
| Hosting | GitHub Pages (estático) + PWA offline | 0 €. Sin backend. Las canciones subidas se guardan en IndexedDB del navegador. |
| Datos de usuario | Solo local (IndexedDB) + exportar/importar JSON | Sin cuentas ni Supabase hasta que haga falta compartir entre dispositivos. |
| Sonido | Web Audio + samples de piano Salamander (CC‑BY) vía `smplr` | Ya usado por sightread. |
| Entrada | 1) Web MIDI (teclado digital por USB) 2) Micro monofónico 3) Micro polifónico | Ver §2. |
| i18n | JSON plano `es.json` / `en.json` + hook `t()` de 10 líneas | No hace falta i18next. |

**Suposición:** tienes (o vas a tener) un piano/teclado digital con USB. Si es acústico, la entrada
por micro pasa a ser prioritaria (fase 3) y hay que asumir sus límites.

## 1. Principios

- Todo corre en el navegador. Cero cuota, cero servidor, cero telemetría.
- Cada fase termina desplegada y usable. Nada de "para después".
- Contenido libre: solo partituras de dominio público o CC (Mutopia, IMSLP‑PD, MuseScore CC0/CC‑BY, Open Well‑Tempered Clavier, Open Goldberg).
- Fácil de usar: abrir URL, enchufar teclado, tocar. Sin configuración obligatoria.

## 2. Entrada: cómo sabe la app qué tecla pulsas

| Modo | Fiabilidad | Latencia | Coste | Fase |
|---|---|---|---|---|
| **Web MIDI** (teclado digital USB/Bluetooth) | Perfecta, polifónica, velocidad | <10 ms | 0 (sightread ya lo tiene) | 0 |
| **Micro monofónico** (`pitchy`, algoritmo McLeod) | Buena para melodías a una voz | ~50 ms | Medio (no existe en el fork, se hace desde cero) | 3 |
| **Micro polifónico** (`@spotify/basic-pitch` en TF.js, Apache‑2) | Media: acordes de 2‑4 notas, falla con pedal/reverb | 150‑300 ms | Alto (CPU, modelo 20 MB) | 6 |

Realidad que hay que aceptar: detectar acordes con micro en tiempo real es investigación, no
producto. Ninguna app (de pago o no) lo hace bien. Con micro la app avanza "cuando oye la nota
esperada" con tolerancia, no evalúa cada nota de un acorde.

## 3. Fases

### Fase 0 — Arrancar ✅ (hecho 12/09/2026)
- Fork de sightread 0.8.1 (React Router 7 en modo SPA, Vite 7, Tailwind 4, Jotai, Bun).
- Lo que trae: notas cayendo, modo partitura, entrada y salida MIDI, subida de MIDI/MusicXML, biblioteca en IndexedDB, freeplay, entrenamiento de frases (irlandés) y velocidad, 23 canciones libres, tests (66).
- Lo que NO trae (corrige la evaluación inicial): **entrada por micrófono**. Se construye en fase 3.
- Hecho: Google Analytics eliminado, soundfont GM de 533 MB sustituido por CDN bajo demanda (solo el piano de 4 MB va en la app), rutas de assets con `BASE_URL`, workflow de GitHub Pages, README bilingüe, rebranding básico.
- Pendiente del usuario: crear el repo `antoniayza/pianista` en GitHub, `git push`, activar Pages (Settings → Pages → Source: GitHub Actions).
- **Entregable:** URL pública funcionando con el catálogo de sightread.

### Fase 1 — Idioma y nombres de notas (1‑2 sesiones)
- `t()` + `es.json`/`en.json`. Selector de idioma. Idioma por defecto del navegador.
- Sistemas de nombres de notas, seleccionable en ajustes y mostrado sobre las teclas y en la partitura:
  - Inglés: C D E F G A B
  - Latino: Do Re Mi Fa Sol La Si
  - Alemán: C D E F G A H (B = Si♭)
  - Solfeo fijo / movible (Do = tónica de la tonalidad)
  - Índice MIDI (60 = C4) y octava científica (C4) vs. Helmholtz (c')
  - Sostenidos vs. bemoles según tonalidad
- Un solo módulo `noteNames.ts`: `name(midi, system, key)`. Todo lo demás lo consume.
- **Entregable:** app bilingüe con 6 sistemas de nombres.

### Fase 2 — Cualquier canción (2‑3 sesiones)
- Importar: `.mid`, `.musicxml`/`.xml`/`.mxl` (ya), añadir `.abc` (abcjs) y arrastrar‑soltar.
- Biblioteca local en IndexedDB: título, compositor, dificultad, manos, progreso, favoritos.
- Exportar/importar toda la biblioteca a un JSON (copia de seguridad, cambiar de ordenador).
- Editor mínimo de metadatos: tempo, transponer, elegir qué mano practica, marcar secciones (bucle A‑B).
- Catálogo público en `/songs/` del repo: MusicXML de dominio público, curado por nivel. Cualquiera añade canciones con un PR.
- **Entregable:** subes tu partitura en MusicXML y la practicas.

### Fase 3 — Micro monofónico bien hecho (1‑2 sesiones)
- Nuevo módulo `src/input/micMono.ts` con `pitchy` (McLeod) en AudioWorklet, misma interfaz de eventos que el MIDI.
- Calibración guiada: tocar C4, medir ruido de fondo, umbral de confianza ajustable (mando visible).
- Modo "espera": la partitura no avanza hasta que suene la nota correcta.
- **Entregable:** practicar melodías con piano acústico o teclado sin USB.

### Fase 4 — Modo aprendizaje (3‑4 sesiones)
- Tres modos: **Escuchar** (la app toca), **Esperar** (avanza cuando aciertas), **Ritmo** (tempo fijo, puntúa).
- Manos: izquierda / derecha / ambas, la otra la toca la app.
- Tempo variable (50‑150 %), bucle de sección, cuenta atrás de metrónomo.
- Puntuación por pasada: notas correctas, a tiempo, errores; historial por canción.
- Digitación mostrada si viene en el MusicXML.
- **Entregable:** el flujo de práctica completo de una app de pago.

### Fase 5 — Tutoriales por niveles (contenido, continuo)
Curso en `/lessons/*.md` + canción asociada, en ES y EN. Cada lección: texto corto, vídeo opcional
(enlace), ejercicio interactivo en la propia app, criterio de "superada".

| Nivel | Contenido |
|---|---|
| 0 Primeros pasos | Postura, encontrar Do central, nombres de teclas, dedos numerados |
| 1 Lectura | Pentagrama, claves de Sol y Fa, figuras, compás, líneas adicionales |
| 2 Una mano | Escala de Do, melodías populares (Frère Jacques, Himno a la alegría) |
| 3 Dos manos | Acompañamiento simple, coordinación, Minuet en Sol (Petzold) |
| 4 Tonalidades | Armaduras, escalas mayores/menores, círculo de quintas, ejercicios |
| 5 Acordes | Tríadas, inversiones, cifrado, acompañar canciones |
| 6 Repertorio intermedio | Bach (Anna Magdalena), Clementi, Satie Gymnopédie 1 |
| 7 Técnica | Hanon, Czerny, arpegios, pedal |
| 8 Avanzado | Invenciones de Bach, Chopin preludios fáciles, Mozart K545 |
| 9 Oído y teoría | Reconocer intervalos, acordes, dictado (ejercicios generados) |

- Ejercicios generados en código (escalas, arpegios, intervalos aleatorios): no hacen falta archivos.
- Mapa de progreso: qué lecciones superadas, sugerencia de la siguiente.
- **Entregable:** camino guiado de cero a intermedio sin salir de la app.

### Fase 6 — Micro polifónico (experimental, 2‑3 sesiones)
- `@spotify/basic-pitch` en Web Worker, ventana deslizante de ~0,5 s.
- Solo activo si el usuario lo elige; etiquetado "experimental".
- **Entregable:** acordes por micro "casi siempre". Se documenta lo que no funciona.

### Fase 7 — Partitura en PDF/imagen (OMR)
- No existe OMR fiable en navegador. Opciones honestas:
  1. **Audiveris** (AGPL, escritorio, gratis): guía paso a paso dentro de la app para convertir PDF → MusicXML y subirlo. Mejor calidad real.
  2. **oemer** (Python) en una GitHub Action: subes el PDF a `/inbox/` del repo, la Action genera el MusicXML y abre un PR. Gratis en repos públicos. Semiautomático.
  3. Explorar oemer → ONNX → onnxruntime‑web para hacerlo en el navegador. Investigación, sin promesa.
- **Entregable:** flujo documentado + Action funcionando.

### Fase 8 — Pulido y comunidad
- PWA instalable, offline completo, samples cacheados.
- Accesibilidad: teclado, contraste, lector de pantalla en menús.
- Móvil/tablet: modo vertical con partitura, tablet sobre el atril.
- README bilingüe, guía de contribución, plantilla de PR para canciones/lecciones.
- Opcional, solo si hace falta: sincronizar progreso entre dispositivos con Supabase free tier o un archivo en Google Drive.

## 4. Estructura de repo (objetivo)

```
pianista/
  src/            app (fork de sightread, reorganizado poco a poco)
  src/i18n/       es.json en.json
  src/music/      noteNames.ts, parsers (midi, musicxml, abc), theory (escalas, acordes)
  src/input/      midi.ts, micMono.ts, micPoly.ts (misma interfaz: eventos noteOn/noteOff)
  public/songs/   catálogo libre (MusicXML) + index.json
  lessons/        es/*.md en/*.md + index.json
  .github/        deploy Pages, action OMR (fase 7)
  PLAN.md
```

## 5. Riesgos

- **Sightread congelado:** no llegan mejoras upstream. Aceptable: lo mantenemos nosotros.
- **Bun:** si molesta, migrar a npm es trivial (Vite no depende de Bun).
- **Web MIDI en Safari:** no existe. Usar Chrome/Edge/Firefox. Documentar.
- **Micro:** expectativas. La app lo dice claro en la calibración.
- **Copyright de canciones:** solo dominio público/CC en el catálogo. Lo que subes tú es tuyo y no sale de tu navegador.
- **Alcance:** cada fase se despliega antes de empezar la siguiente.

## 6. Primera sesión (fase 0), paso a paso

1. `git clone https://github.com/sightread/sightread` en `pianista/` (o descargar el zip del snapshot).
2. `bun install && bun dev` (o `npm install && npm run dev`).
3. Enchufar el teclado, probar MIDI, micro, subir un MIDI.
4. Anotar en este archivo qué funciona y qué no.
5. `git init`, GitHub repo público, Action de Pages, primer deploy.
