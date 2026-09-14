import { expect, test } from 'bun:test'
import { parseMidiMessage } from './index'

const msg = (...bytes: number[]) => ({ data: new Uint8Array(bytes), timeStamp: 0 })

test('running status: 2-byte note-off after a note-on is understood', () => {
  expect(parseMidiMessage(msg(0x90, 60, 100))).toEqual({
    type: 'on',
    note: 60,
    velocity: 100,
    timeStamp: 0,
  })
  expect(parseMidiMessage(msg(60, 0))).toEqual({ type: 'on', note: 60, velocity: 0, timeStamp: 0 })
  expect(parseMidiMessage(msg(0x80, 60, 64))).toEqual({
    type: 'off',
    note: 60,
    velocity: 64,
    timeStamp: 0,
  })
  expect(parseMidiMessage(msg(0xb0, 64, 127))).toBeNull() // control change ignored
  expect(parseMidiMessage(msg(0xf8))).toBeNull() // clock ignored, does not break running status
})
