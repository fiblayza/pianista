// Turns a stream of (frequency, clarity) samples into note down/up events.
// Pure logic, no audio: testable and reusable for any detector.
export type MicEvent = { type: 'down' | 'up'; note: number }

export function frequencyToMidi(hz: number): number {
  return Math.round(69 + 12 * Math.log2(hz / 440))
}

export class MicTracker {
  current: number | null = null
  private candidate: number | null = null
  private candidateFrames = 0

  // ponytail: monophonic. Chords come out as the loudest note. Polyphony = basic-pitch, phase 6.
  // A repeated note with no silence between hits is heard once (the string never stops ringing).
  constructor(
    public minClarity = 0.9,
    public framesToConfirm = 2,
  ) {}

  feed(hz: number, clarity: number): MicEvent[] {
    const events: MicEvent[] = []
    const heard = clarity >= this.minClarity && hz > 20 && hz < 5000 ? frequencyToMidi(hz) : null

    if (heard === this.current) {
      this.candidate = null
      this.candidateFrames = 0
      return events
    }
    if (heard === this.candidate) {
      this.candidateFrames++
    } else {
      this.candidate = heard
      this.candidateFrames = 1
    }
    if (this.candidateFrames < this.framesToConfirm) {
      return events
    }
    if (this.current !== null) {
      events.push({ type: 'up', note: this.current })
    }
    if (heard !== null) {
      events.push({ type: 'down', note: heard })
    }
    this.current = heard
    this.candidate = null
    this.candidateFrames = 0
    return events
  }
}
