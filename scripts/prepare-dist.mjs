// Runs before electron-builder so one electron-builder.yml works on every OS:
// 1. copies the ffmpeg-static LICENSE (named ffmpeg.exe.LICENSE on Windows,
//    ffmpeg.LICENSE elsewhere) to a stable path the yml references;
// 2. stages the whisper.cpp binaries for the current platform into
//    build/stage/whisper (Windows ships whisper-cli.exe + DLLs; macOS ships a
//    bundled whisper-cli only if one was placed in resources/whisper, otherwise
//    the app finds it on PATH via `brew install whisper.cpp`).
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const log = (m) => console.log(`[prepare-dist] ${m}`)

// --- FFmpeg license ---
const licenseName = process.platform === 'win32' ? 'ffmpeg.exe.LICENSE' : 'ffmpeg.LICENSE'
const licenseSrc = join(root, 'node_modules', 'ffmpeg-static', licenseName)
const licenseDest = join(root, 'build', 'FFmpeg-LICENSE.txt')
if (existsSync(licenseSrc)) {
  copyFileSync(licenseSrc, licenseDest)
  log(`FFmpeg license copied from ${licenseName}`)
} else {
  writeFileSync(licenseDest, 'FFmpeg license: see https://ffmpeg.org/legal.html (ffmpeg-static package)\n')
  console.warn(`[prepare-dist] ${licenseSrc} not found; wrote a placeholder license instead.`)
}

// --- Whisper binaries ---
const stage = join(root, 'build', 'stage', 'whisper')
rmSync(stage, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })
const srcDir = join(root, 'resources', 'whisper')
if (process.platform === 'win32') {
  for (const f of existsSync(srcDir) ? readdirSync(srcDir) : []) copyFileSync(join(srcDir, f), join(stage, f))
  log(`staged ${readdirSync(stage).length} whisper file(s) for Windows`)
} else {
  const macBin = join(srcDir, 'whisper-cli')
  if (existsSync(macBin)) {
    copyFileSync(macBin, join(stage, 'whisper-cli'))
    log('staged bundled whisper-cli for macOS')
  } else {
    log('no bundled whisper-cli; macOS build will rely on `brew install whisper.cpp`')
  }
}
