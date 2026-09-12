// Turns Basic Pitch model frames (88 note activations + 88 onset probabilities
// per ~11.6ms frame) into note down/up events. Pure logic, testable.
import type { MicEvent } from './tracker'

export const MIDI_OFFSET = 21 // bin 0 = A0

export class PolyTracker {
  active = new Set<number>()
  private silentFrames = new Uint8Array(88)

  // ponytail: thresholds from basic-pitch defaults (onset .5, frame .3). Knob = onsetThreshold.
  constructor(
    public onsetThreshold = 0.5,
    public frameThreshold = 0.3,
    public releaseFrames = 6, // ~70ms below frameThreshold before releasing
  ) {}

  feed(notes: ArrayLike<number>, onsets: ArrayLike<number>): MicEvent[] {
    const events: MicEvent[] = []
    for (let i = 0; i < 88; i++) {
      const midi = i + MIDI_OFFSET
      const isActive = this.active.has(midi)
      if (!isActive && onsets[i] >= this.onsetThreshold) {
        this.active.add(midi)
        this.silentFrames[i] = 0
        events.push({ type: 'down', note: midi })
      } else if (isActive) {
        if (notes[i] < this.frameThreshold) {
          if (++this.silentFrames[i] >= this.releaseFrames) {
            this.active.delete(midi)
            events.push({ type: 'up', note: midi })
          }
        } else {
          this.silentFrames[i] = 0
        }
      }
    }
    return events
  }

  releaseAll(): MicEvent[] {
    const events: MicEvent[] = [...this.active].map((note) => ({ type: 'up' as const, note }))
    this.active.clear()
    return events
  }
}
