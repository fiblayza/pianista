// Generates the built-in exercise MIDIs (public/music/songs/ex-*.mid) and
// registers them in src/manifest.json. Run: bun scripts/generate-exercises.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Midi } from '@tonejs/midi'

const NAMES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
// 'C4' | 'F#3' | 'Bb2' → midi number
function n(name: string): number {
  const m = name.match(/^([A-G])([#b]?)(-?\d)$/)!
  return 12 * (+m[3] + 1) + NAMES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}
type Step = string | string[] | null // note, chord, or rest
type Hand = { steps: Step[]; beat?: number } // beat = length of every step in beats

function chord(root: string, quality: 'maj' | 'min' = 'maj', inversion = 0): string[] {
  const r = n(root)
  let notes = [r, r + (quality === 'maj' ? 4 : 3), r + 7]
  for (let i = 0; i < inversion; i++) notes = [...notes.slice(1), notes[0] + 12]
  return notes.map(String)
}
const asMidi = (s: string) => (/^\d+$/.test(s) ? +s : n(s))

function write(id: string, title: string, bpm: number, right: Hand, left?: Hand) {
  const midi = new Midi()
  midi.header.setTempo(bpm)
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [4, 4] })
  const spb = 60 / bpm
  let end = 0
  for (const [name, hand] of [
    ['right', right],
    ['left', left],
  ] as const) {
    if (!hand) continue
    const track = midi.addTrack()
    track.name = name
    const beat = hand.beat ?? 1
    hand.steps.forEach((step, i) => {
      if (step === null) return
      const time = i * beat * spb
      const duration = beat * spb * 0.9
      for (const s of Array.isArray(step) ? step : [step]) {
        track.addNote({ midi: asMidi(s), time, duration, velocity: 0.8 })
      }
      end = Math.max(end, time + beat * spb)
    })
  }
  const file = `ex-${id}.mid`
  writeFileSync(join('public/music/songs', file), Buffer.from(midi.toArray()))
  return {
    file: `music/songs/${file}`,
    title,
    source: 'builtin',
    id: file,
    duration: Math.round(end),
  }
}

const twice = <T>(a: T[]) => [...a, ...a]
const scaleC4 = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
const down = (a: string[]) => [...a].reverse()
const five = ['C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4', 'C4']
const fiveLH = ['C3', 'D3', 'E3', 'F3', 'G3', 'F3', 'E3', 'D3', 'C3']
const octaveDown = (a: string[]) => a.map((s) => s.replace(/\d$/, (d) => String(+d - 1)))

const exercises = [
  write('01-do-central', 'Ejercicio 01 · Do central y vecinas (Do Re Mi)', 60, {
    steps: [
      'C4',
      null,
      'C4',
      null,
      'C4',
      'D4',
      'C4',
      null,
      'C4',
      'D4',
      'E4',
      'D4',
      'C4',
      null,
      null,
      null,
    ],
  }),
  write('02-cinco-dedos-derecha', 'Ejercicio 02 · Posición de cinco dedos, mano derecha', 70, {
    steps: twice(five),
  }),
  write(
    '03-cinco-dedos-izquierda',
    'Ejercicio 03 · Posición de cinco dedos, mano izquierda',
    70,
    { steps: [] },
    {
      steps: twice(fiveLH),
    },
  ),
  write('04-escala-do-mayor', 'Ejercicio 04 · Escala de Do mayor, mano derecha', 80, {
    steps: [...scaleC4, ...down(scaleC4).slice(1)],
  }),
  write(
    '05-escala-dos-manos',
    'Ejercicio 05 · Escala de Do mayor a dos manos',
    70,
    { steps: [...scaleC4, ...down(scaleC4).slice(1)] },
    { steps: [...octaveDown(scaleC4), ...down(octaveDown(scaleC4)).slice(1)] },
  ),
  write('06-acordes-basicos', 'Ejercicio 06 · Acordes Do, Fa, Sol (I IV V I)', 60, {
    steps: twice([chord('C4'), chord('F4'), chord('G4'), chord('C4')]),
    beat: 2,
  }),
  write('07-arpegios', 'Ejercicio 07 · Arpegios de Do, Fa, Sol', 80, {
    steps: [
      'C4',
      'E4',
      'G4',
      'E4',
      'F4',
      'A4',
      'C5',
      'A4',
      'G4',
      'B4',
      'D5',
      'B4',
      'C4',
      'E4',
      'G4',
      'C5',
    ],
  }),
  write('08-inversiones', 'Ejercicio 08 · Inversiones del acorde de Do', 60, {
    steps: [
      chord('C4', 'maj', 0),
      chord('C4', 'maj', 1),
      chord('C4', 'maj', 2),
      chord('C5', 'maj', 0),
      chord('C4', 'maj', 2),
      chord('C4', 'maj', 1),
      chord('C4', 'maj', 0),
      null,
    ],
    beat: 2,
  }),
  write('09-mayor-menor', 'Ejercicio 09 · Acordes mayores y menores (Do, Lam, Rem, Mim)', 60, {
    steps: [
      chord('C4'),
      chord('A3', 'min'),
      chord('D4', 'min'),
      chord('E4', 'min'),
      chord('F4'),
      chord('G4'),
      chord('C4'),
      null,
    ],
    beat: 2,
  }),
  write(
    '10-progresion-do-lam-fa-sol',
    'Ejercicio 10 · Progresión Do Lam Fa Sol, arpegios y bajo',
    72,
    {
      steps: twice([
        'E4',
        'G4',
        'C5',
        'G4',
        'E4',
        'G4',
        'C5',
        'G4',
        'E4',
        'A4',
        'C5',
        'A4',
        'E4',
        'A4',
        'C5',
        'A4',
        'F4',
        'A4',
        'C5',
        'A4',
        'F4',
        'A4',
        'C5',
        'A4',
        'G4',
        'B4',
        'D5',
        'B4',
        'G4',
        'B4',
        'D5',
        'B4',
      ]),
      beat: 0.5,
    },
    {
      steps: twice([
        ['C2', 'G2'],
        null,
        null,
        null,
        ['A2', 'E3'],
        null,
        null,
        null,
        ['F2', 'C3'],
        null,
        null,
        null,
        ['G2', 'D3'],
        null,
        null,
        null,
      ]),
    },
  ),
]

const manifestPath = 'src/manifest.json'
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')).filter(
  (s: any) => !s.id.startsWith('ex-'),
)
writeFileSync(manifestPath, JSON.stringify([...manifest, ...exercises], null, 2) + '\n')
console.log(`${exercises.length} exercises written`)
