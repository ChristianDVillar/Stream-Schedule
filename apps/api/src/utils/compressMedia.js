/**
 * Compress images and videos to stay under Discord bot API limit (8MB).
 * Images: sharp (resize + quality).
 * Videos: native FFmpeg (bitrate fijo 800k/64k, 480p) si está instalado; si no, ffmpeg.wasm (salvo en prod con USE_FFMPEG_NATIVE_ONLY).
 * Concurrencia de compresión de video: 1 (cola global) para no saturar CPU/RAM.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from './logger.js';

const execFileAsync = promisify(execFile);
const TARGET_MAX_BYTES = 7.5 * 1024 * 1024; // 7.5MB to leave room for multipart overhead

// Parámetros recomendados para Discord: 480p, bitrate controlado, ~6–8 MB. Preset veryfast para menos CPU.
const FFMPEG_VIDEO_BITRATE = '800k';
const FFMPEG_AUDIO_BITRATE = '64k';
const FFMPEG_SCALE = '854:-2'; // 480p, aspect ratio kept
const FFMPEG_PRESET = 'veryfast'; // CPU-friendly; evita veryslow en servidor compartido

/** Timeout para FFmpeg nativo (ms). Evita procesos colgados. */
const COMPRESS_VIDEO_TIMEOUT_MS = Number(process.env.COMPRESS_VIDEO_TIMEOUT_MS) || 10 * 60 * 1000; // 10 min default

/** En producción no usar ffmpeg.wasm por defecto (solo nativo). Si FFmpeg no está instalado en el servidor, setear USE_FFMPEG_NATIVE_ONLY=false hasta instalarlo. */
const USE_FFMPEG_NATIVE_ONLY = process.env.USE_FFMPEG_NATIVE_ONLY !== 'false' && (process.env.USE_FFMPEG_NATIVE_ONLY === 'true' || process.env.NODE_ENV === 'production');

/** Cola global: solo 1 compresión de video a la vez para no saturar CPU/RAM. */
let videoCompressionTail = Promise.resolve();

let ffmpegInstance = null;

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  const { FFmpeg } = await import('@ffmpeg.wasm/main');
  ffmpegInstance = await FFmpeg.create({ core: '@ffmpeg.wasm/core-mt' });
  return ffmpegInstance;
}

/**
 * Comprimir video con FFmpeg nativo (si está instalado).
 * Preset veryfast para menos CPU; timeout para no colgar el proceso.
 * @param {Buffer} buffer
 * @param {number} maxBytes
 * @returns {Promise<Buffer|null>}
 */
async function compressVideoNative(buffer, maxBytes) {
  const tmpDir = os.tmpdir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const inputPath = path.join(tmpDir, `ffmpeg-in-${id}.mp4`);
  const outputPath = path.join(tmpDir, `ffmpeg-out-${id}.mp4`);
  try {
    await fs.promises.writeFile(inputPath, buffer);
    await execFileAsync(
      'ffmpeg',
      [
        '-i', inputPath,
        '-vcodec', 'libx264',
        '-preset', FFMPEG_PRESET,
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-vf', `scale=${FFMPEG_SCALE}`,
        '-b:v', FFMPEG_VIDEO_BITRATE,
        '-b:a', FFMPEG_AUDIO_BITRATE,
        '-movflags', '+faststart',
        '-y',
        outputPath,
      ],
      { timeout: COMPRESS_VIDEO_TIMEOUT_MS },
    );
    const outBuf = await fs.promises.readFile(outputPath);
    if (outBuf.length > 0 && outBuf.length <= maxBytes) {
      logger.info('Compress: video compressed (native FFmpeg)', {
        originalMB: (buffer.length / 1024 / 1024).toFixed(2),
        resultMB: (outBuf.length / 1024 / 1024).toFixed(2),
      });
      return outBuf;
    }
    if (outBuf.length > 0 && outBuf.length > maxBytes) {
      logger.warn('Compress: native FFmpeg result still over limit', { resultMB: (outBuf.length / 1024 / 1024).toFixed(2), maxMB: (maxBytes / 1024 / 1024).toFixed(2) });
    }
    return null;
  } catch (err) {
    logger.warn('Compress: native FFmpeg failed (will try WASM unless native-only)', { error: err.message });
    return null;
  } finally {
    await fs.promises.unlink(inputPath).catch(() => {});
    await fs.promises.unlink(outputPath).catch(() => {});
  }
}

/**
 * Compress image buffer to stay under maxBytes. Uses sharp.
 * @param {Buffer} buffer - Raw image data
 * @param {number} maxBytes - Max size in bytes (default 7.5MB)
 * @returns {Promise<Buffer|null>} Compressed buffer or null if sharp not available / error
 */
export async function compressImage(buffer, maxBytes = TARGET_MAX_BYTES) {
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(buffer).metadata();
    const { width = 0, height = 0 } = meta;
    const maxDim = 1280;
    const resizeOpt = (width > maxDim || height > maxDim)
      ? { width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true }
      : undefined;
    for (let quality = 82; quality >= 20; quality -= 12) {
      let pipeline = sharp(buffer);
      if (resizeOpt) pipeline = pipeline.resize(resizeOpt);
      const out = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      if (out.length <= maxBytes) {
        logger.info('Compress: image compressed', { originalKB: Math.round(buffer.length / 1024), resultKB: Math.round(out.length / 1024) });
        return out;
      }
    }
    const scale = Math.sqrt(maxBytes / buffer.length);
    const w = Math.max(320, Math.floor((width || 1280) * scale));
    const out = await sharp(buffer).resize(w).jpeg({ quality: 50, mozjpeg: true }).toBuffer();
    logger.info('Compress: image compressed (aggressive)', { originalKB: Math.round(buffer.length / 1024), resultKB: Math.round(out.length / 1024) });
    return out.length <= maxBytes ? out : null;
  } catch (err) {
    logger.warn('Compress: image failed', { error: err.message });
    return null;
  }
}

/**
 * Compress video: intenta FFmpeg nativo; si no, ffmpeg.wasm (salvo USE_FFMPEG_NATIVE_ONLY o NODE_ENV=production).
 * @param {Buffer} buffer - Raw video (e.g. mp4)
 * @param {number} maxBytes - Max size in bytes (default 7.5MB)
 * @returns {Promise<Buffer|null>} Compressed buffer or null if fails
 */
export async function compressVideo(buffer, maxBytes = TARGET_MAX_BYTES) {
  if (buffer.length <= maxBytes) return buffer;

  const nativeResult = await compressVideoNative(buffer, maxBytes);
  if (nativeResult) return nativeResult;

  if (USE_FFMPEG_NATIVE_ONLY) {
    logger.warn('Compress: native FFmpeg failed and USE_FFMPEG_NATIVE_ONLY is set; skipping WASM');
    return null;
  }
  return compressVideoWasm(buffer, maxBytes);
}

/**
 * Compresión de video con cola global de concurrencia 1. Usar en uploads y publicación para no saturar CPU/RAM.
 * @param {Buffer} buffer
 * @param {number} maxBytes
 * @returns {Promise<Buffer|null>}
 */
export function compressVideoQueued(buffer, maxBytes = TARGET_MAX_BYTES) {
  const next = videoCompressionTail.then(() => compressVideo(buffer, maxBytes));
  videoCompressionTail = next.catch(() => null);
  return next;
}

/**
 * Compresión con ffmpeg.wasm (bitrate fijo para tamaño predecible, compatible con Discord).
 */
async function compressVideoWasm(buffer, maxBytes) {
  const INPUT = 'input.mp4';
  const OUTPUT = 'output.mp4';
  try {
    const ffmpeg = await getFFmpeg();
    ffmpeg.fs.writeFile(INPUT, new Uint8Array(buffer));
    // Misma estrategia que FFmpeg nativo: 480p, 800k video, 64k audio, faststart
    await ffmpeg.run(
      '-i', INPUT,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-vf', 'scale=854:-2',
      '-b:v', FFMPEG_VIDEO_BITRATE,
      '-b:a', FFMPEG_AUDIO_BITRATE,
      '-movflags', '+faststart',
      '-f', 'mp4',
      OUTPUT,
    );
    const out = ffmpeg.fs.readFile(OUTPUT);
    const outBuf = Buffer.from(out);
    try {
      ffmpeg.fs.unlink(INPUT);
      ffmpeg.fs.unlink(OUTPUT);
    } catch (_) {}
    if (outBuf.length > 0 && outBuf.length <= maxBytes) {
      logger.info('Compress: video compressed (ffmpeg.wasm)', { originalMB: (buffer.length / 1024 / 1024).toFixed(2), resultMB: (outBuf.length / 1024 / 1024).toFixed(2) });
      return outBuf;
    }
    if (outBuf.length > maxBytes) {
      const second = await compressVideoWasmSecondPass(ffmpeg, buffer, maxBytes);
      return second;
    }
    return null;
  } catch (err) {
    logger.warn('Compress: video failed (ffmpeg.wasm)', { error: err.message });
    return null;
  }
}

async function compressVideoWasmSecondPass(ffmpeg, buffer, maxBytes) {
  const INPUT = 'input2.mp4';
  const OUTPUT = 'output2.mp4';
  try {
    ffmpeg.fs.writeFile(INPUT, new Uint8Array(buffer));
    await ffmpeg.run(
      '-i', INPUT,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-profile:v', 'baseline',
      '-level', '3.0',
      '-vf', 'scale=854:-2',
      '-b:v', '600k',
      '-b:a', '64k',
      '-movflags', '+faststart',
      '-f', 'mp4',
      OUTPUT,
    );
    const out = ffmpeg.fs.readFile(OUTPUT);
    const outBuf = Buffer.from(out);
    try {
      ffmpeg.fs.unlink(INPUT);
      ffmpeg.fs.unlink(OUTPUT);
    } catch (_) {}
    if (outBuf.length > 0 && outBuf.length <= maxBytes) {
      logger.info('Compress: video compressed (ffmpeg.wasm second pass)', { resultMB: (outBuf.length / 1024 / 1024).toFixed(2) });
      return outBuf;
    }
    return null;
  } catch (_) {
    return null;
  }
}
