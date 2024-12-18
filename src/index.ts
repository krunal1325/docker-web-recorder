import { spawn } from 'child_process'

import * as puppeteer from 'puppeteer-core'

const url = process.env.URL
const resolution = process.env.RESOLUTION

async function main() {
  if (!url) throw new Error('URL environment variable is required')
  if (!resolution)
    throw new Error('RESOLUTION environment variable is required')

  const resolutionSplit = resolution.split('x')
  const resolutionWidth = parseInt(resolutionSplit[0], 10)
  const resolutionHeight = parseInt(resolutionSplit[1], 10)
  if (!resolutionWidth || !resolutionHeight)
    throw new Error('RESOLUTION must be in the format of 1280x720')

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: false,
    ignoreDefaultArgs: ['--mute-audio', '--enable-automation'],
    defaultViewport: {
      width: resolutionWidth,
      height: resolutionHeight,
    },
    args: [
      '--no-sandbox',
      '--disable-gpu',
      '--disable-setuid-sandbox',
      '--no-first-run',
      '--disable-dev-shm-usage',
      '--disable-default-apps',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      `--window-size=${resolutionWidth},${resolutionHeight}`,
      '--window-position=0,0',
      '--kiosk',
    ],
  })

  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const ffmpegCmd = 'ffmpeg'
  const ffmpegArgs = [
    '-y',
    '-hide_banner',
    '-async',
    '1',
    '-nostdin',
    '-f',
    'pulse',
    '-ac',
    '2',
    '-i',
    'default',
    '-c:a',
    'libmp3lame',
    '-b:a',
    '128k',
    '-ar',
    '44100',
    '-f',
    'segment',
    '-segment_time',
    '60',
    '-reset_timestamps',
    '1',
    './recordings/segment%d.mp3',
  ]

  return new Promise((resolve, reject) => {
    const process = spawn(ffmpegCmd, ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    process.stdout.on('data', (data) => {
      console.log(`FFmpeg stdout: ${data}`)
    })

    process.stderr.on('data', (data) => {
      console.error(`FFmpeg stderr: ${data}`)
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve('Recording process completed successfully')
      } else {
        reject(new Error(`FFmpeg process exited with code ${code}`))
      }
    })

    process.on('error', (err) => {
      reject(err)
    })
  })

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
