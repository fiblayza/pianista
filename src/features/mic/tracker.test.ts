import { expect, test } from 'bun:test'
import { frequencyToMidi, MicTracker } from './tracker'

test('frequency to midi', () => {
  expect(frequencyToMidi(440)).toBe(69)
  expect(frequencyToMidi(261.63)).toBe(60)
  expect(frequencyToMidi(27.5)).toBe(21)
})

test('tracker confirms after 2 frames, releases on silence, switches notes', () => {
  const t = new MicTracker(0.9, 2)
  expect(t.feed(440, 0.95)).toEqual([])
  expect(t.feed(440, 0.95)).toEqual([{ type: 'down', note: 69 }])
  expect(t.feed(440, 0.95)).toEqual([])
  // one noisy frame does not release
  expect(t.feed(0, 0.1)).toEqual([])
  expect(t.feed(440, 0.95)).toEqual([])
  // new note: up old, down new
  t.feed(523.25, 0.95)
  expect(t.feed(523.25, 0.95)).toEqual([
    { type: 'up', note: 69 },
    { type: 'down', note: 72 },
  ])
  t.feed(0, 0)
  expect(t.feed(0, 0)).toEqual([{ type: 'up', note: 72 }])
})
