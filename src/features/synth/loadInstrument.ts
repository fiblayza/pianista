import { InstrumentName, SoundFont } from './types'
import { parseMidiJsSoundfont } from './utils'

export const soundfonts: { [key in InstrumentName]?: SoundFont } = {}
const downloading: { [key in InstrumentName]?: Promise<void> } = {}

export async function loadInstrument(instrument: InstrumentName) {
  // Already downloaded.
  if (soundfonts[instrument]) {
    return Promise.resolve()
  }
  // In-progress already.
  if (downloading[instrument]) {
    return downloading[instrument]
  }

  // ponytail: only the 4MB piano font ships with the app; the 533MB GM set streams from gleitz's CDN on demand
  const url =
    instrument === 'acoustic_grand_piano'
      ? `${import.meta.env.BASE_URL}soundfonts/SalC5Light2/${instrument}-mp3.js`
      : `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/${instrument}-mp3.js`
  const sfFetch = fetch(url)

  let doneDownloadingRes: any
  downloading[instrument] = new Promise((res) => (doneDownloadingRes = res))
  try {
    let sf = await parseMidiJsSoundfont(await (await sfFetch).text())
    soundfonts[instrument] = sf
    delete downloading[instrument]
    doneDownloadingRes()
  } catch (err) {
    console.error(`Error fetching soundfont for: ${instrument}`, err)
  }
}
