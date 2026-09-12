import midiState from '@/features/midi'
import { atom, getDefaultStore } from 'jotai'
import { PitchDetector } from 'pitchy'
import { MicTracker } from './tracker'

const store = getDefaultStore()
export const micEnabledAtom = atom(false)
export const micErrorAtom = atom<string | null>(null)
export const micNoteAtom = atom<number | null>(null) // live readout for the settings UI
export const micClarityAtom = atom(0.9) // sensitivity knob: lower = more notes, more false positives

let stream: MediaStream | null = null
let ctx: AudioContext | null = null
let timer: ReturnType<typeof setInterval> | null = null

export async function enableMic() {
  if (stream) return
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
  } catch (e: any) {
    store.set(micErrorAtom, e?.message ?? String(e))
    return
  }
  store.set(micErrorAtom, null)
  ctx = new AudioContext()
  const analyser = ctx.createAnalyser()
  // ponytail: 4096 samples ≈ 85ms at 48kHz. Needed for the bass octaves; AudioWorklet if latency hurts.
  analyser.fftSize = 4096
  ctx.createMediaStreamSource(stream).connect(analyser)
  const detector = PitchDetector.forFloat32Array(analyser.fftSize)
  detector.minVolumeDecibels = -40
  const buf = new Float32Array(analyser.fftSize)
  const tracker = new MicTracker()

  timer = setInterval(() => {
    analyser.getFloatTimeDomainData(buf)
    const [hz, clarity] = detector.findPitch(buf, ctx!.sampleRate)
    tracker.minClarity = store.get(micClarityAtom)
    for (const ev of tracker.feed(hz, clarity)) {
      ev.type === 'down' ? midiState.press(ev.note, 80) : midiState.release(ev.note)
    }
    store.set(micNoteAtom, tracker.current)
  }, 25)

  store.set(micEnabledAtom, true)
}

export function disableMic() {
  if (timer) clearInterval(timer)
  timer = null
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  ctx?.close()
  ctx = null
  store.set(micNoteAtom, null)
  store.set(micEnabledAtom, false)
}
