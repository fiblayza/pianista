import { expect, test } from 'bun:test'
import { PolyTracker } from './poly'

const frame = (bins: Record<number, number>) => {
  const f = new Float32Array(88)
  for (const [k, v] of Object.entries(bins)) f[+k] = v
  return f
}

test('chord onsets press both notes, release after sustained silence', () => {
  const t = new PolyTracker(0.5, 0.3, 2)
  // C4 = bin 39, E4 = bin 43
  expect(t.feed(frame({ 39: 0.9, 43: 0.9 }), frame({ 39: 0.8, 43: 0.7 }))).toEqual([
    { type: 'down', note: 60 },
    { type: 'down', note: 64 },
  ])
  // onset again while active is ignored
  expect(t.feed(frame({ 39: 0.9, 43: 0.9 }), frame({ 39: 0.8 }))).toEqual([])
  // one quiet frame does not release
  expect(t.feed(frame({ 43: 0.9 }), frame({}))).toEqual([])
  expect(t.feed(frame({ 43: 0.9 }), frame({}))).toEqual([{ type: 'up', note: 60 }])
  expect(t.releaseAll()).toEqual([{ type: 'up', note: 64 }])
  expect(t.active.size).toBe(0)
})
