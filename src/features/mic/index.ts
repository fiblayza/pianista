import midiState from '@/features/midi'
import { atom, getDefaultStore } from 'jotai'
import { PitchDetector } from 'pitchy'
import { PolyTracker } from './poly'
import { MicTracker, type MicEvent } from './tracker'

export type MicMode = 'mono' | 'poly'

const store = getDefaultStore()
export const micEnabledAtom = atom(false)
export const micLoadingAtom = atom(false)
export const micErrorAtom = atom<string | null>(null)
export const micModeAtom = atom<MicMode>('mono')
export const micNotesAtom = atom<number[]>([]) // live readout for the settings UI
export const micClarityAtom = atom(0.9) // mono knob: min pitch clarity
export const micOnsetAtom = atom(0.5) // poly knob: min onset probability

let stream: MediaStream | null = null
let ctx: AudioContext | null = null
let stop: (() => void) | null = null

function emit(events: MicEvent[]) {
  for (const ev of events) {
    ev.type === 'down' ? midiState.press(ev.note, 80) : midiState.release(ev.note)
  }
}

export async function setMicMode(mode: MicMode) {
  store.set(micModeAtom, mode)
  if (store.get(micEnabledAtom)) {
    disableMic()
    await enableMic()
  }
}

export async function enableMic() {
  if (stream) return
  const mode = store.get(micModeAtom)
  store.set(micErrorAtom, null)
  store.set(micLoadingAtom, true)
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
    stop = mode === 'poly' ? await startPoly(stream) : startMono(stream)
    store.set(micEnabledAtom, true)
  } catch (e: any) {
    store.set(micErrorAtom, e?.message ?? String(e))
    disableMic()
  } finally {
    store.set(micLoadingAtom, false)
  }
}

export function disableMic() {
  stop?.()
  stop = null
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  ctx?.close()
  ctx = null
  store.set(micNotesAtom, [])
  store.set(micEnabledAtom, false)
}

// Single note, ~100ms latency. McLeod pitch method via pitchy.
function startMono(stream: MediaStream) {
  ctx = new AudioContext()
  const analyser = ctx.createAnalyser()
  // ponytail: 4096 samples ≈ 85ms at 48kHz. Needed for the bass octaves; AudioWorklet if latency hurts.
  analyser.fftSize = 4096
  ctx.createMediaStreamSource(stream).connect(analyser)
  const detector = PitchDetector.forFloat32Array(analyser.fftSize)
  detector.minVolumeDecibels = -40
  const buf = new Float32Array(analyser.fftSize)
  const tracker = new MicTracker()
  const sampleRate = ctx.sampleRate

  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(buf)
    const [hz, clarity] = detector.findPitch(buf, sampleRate)
    tracker.minClarity = store.get(micClarityAtom)
    emit(tracker.feed(hz, clarity))
    store.set(micNotesAtom, tracker.current === null ? [] : [tracker.current])
  }, 25)
  return () => {
    clearInterval(timer)
    emit(tracker.feed(0, 0))
  }
}

// Chords, ~250ms latency. Spotify's Basic Pitch model (Apache-2.0) on TensorFlow.js.
// The model wants 2s windows of 22050Hz mono and answers with 172 frames × 88 keys.
const SR = 22050
const HOP = 256
const WINDOW = SR * 2 - HOP // 43844
const N_FRAMES = 172
const EDGE = 8 // the last frames of a window have no future context; wait for them (~90ms)

async function startPoly(stream: MediaStream) {
  const tf = await import('@tensorflow/tfjs')
  const model = await tf.loadGraphModel(`${import.meta.env.BASE_URL}basic-pitch/model.json`)
  ctx = new AudioContext({ sampleRate: SR })
  const ring = new Float32Array(WINDOW)
  let total = 0
  // ponytail: ScriptProcessor is deprecated but needs no extra file; AudioWorklet if it glitches.
  const proc = ctx.createScriptProcessor(4096, 1, 1)
  proc.onaudioprocess = (e) => {
    const d = e.inputBuffer.getChannelData(0)
    ring.copyWithin(0, d.length)
    ring.set(d, WINDOW - d.length)
    total += d.length
  }
  const mute = ctx.createGain()
  mute.gain.value = 0
  ctx.createMediaStreamSource(stream).connect(proc)
  proc.connect(mute).connect(ctx.destination)

  const tracker = new PolyTracker()
  let lastFrame = -1
  let busy = false
  let stopped = false

  async function step() {
    if (busy || stopped || total < WINDOW) return
    busy = true
    const windowStart = total - WINDOW
    const input = tf.tensor3d(ring.slice(), [1, WINDOW, 1])
    const [frames, onsets] = model.execute(input, ['Identity_1', 'Identity_2']) as any[]
    const [f, o] = (await Promise.all([frames.data(), onsets.data()])) as Float32Array[]
    tf.dispose([input, frames, onsets])
    if (stopped) return

    const firstFrame = Math.round(windowStart / HOP)
    tracker.onsetThreshold = store.get(micOnsetAtom)
    for (let i = Math.max(0, lastFrame - firstFrame + 1); i < N_FRAMES - EDGE; i++) {
      emit(tracker.feed(f.subarray(i * 88, i * 88 + 88), o.subarray(i * 88, i * 88 + 88)))
    }
    lastFrame = firstFrame + N_FRAMES - EDGE - 1
    store.set(
      micNotesAtom,
      [...tracker.active].sort((a, b) => a - b),
    )
    busy = false
  }
  // ponytail: inference on the main thread (~30-80ms per step on WebGL); a Worker if the animation stutters.
  const timer = setInterval(step, 150)
  return () => {
    stopped = true
    clearInterval(timer)
    proc.disconnect()
    emit(tracker.releaseAll())
    model.dispose()
  }
}
