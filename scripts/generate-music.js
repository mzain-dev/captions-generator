/**
 * Generates a couple of original, fully-synthesized background-music loops (no samples,
 * no copyrighted material — everything here is math) and registers them as built-in
 * tracks in the app's music library, so users have something good to reach for without
 * needing to upload their own.
 *
 * Run with: node scripts/generate-music.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;

const SAMPLE_RATE = 44100;

// ---------- low-level synth helpers ----------

function makeBuffer(seconds) {
  const n = Math.ceil(seconds * SAMPLE_RATE);
  return { left: new Float64Array(n), right: new Float64Array(n), length: n };
}

function addAt(buf, startSec, mono) {
  const start = Math.round(startSec * SAMPLE_RATE);
  for (let i = 0; i < mono.length; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= buf.length) continue;
    buf.left[idx] += mono[i];
    buf.right[idx] += mono[i];
  }
}

// Smooth 0->1->0 envelope: linear attack, hold, linear release.
function envelope(n, attack, release) {
  const out = new Float64Array(n);
  const a = Math.min(attack, n);
  const r = Math.min(release, n);
  for (let i = 0; i < n; i++) {
    let v = 1;
    if (i < a) v = i / a;
    if (i > n - r) v = Math.min(v, (n - i) / r);
    out[i] = Math.max(0, v);
  }
  return out;
}

// A warm pad note: a few detuned sines (fundamental + soft harmonics) under an envelope,
// with a slow amplitude "breathing" LFO so a held chord doesn't feel static.
function padNote(freq, seconds, amp, attackSec, releaseSec, detuneCents) {
  const n = Math.round(seconds * SAMPLE_RATE);
  const out = new Float64Array(n);
  const env = envelope(n, attackSec * SAMPLE_RATE, releaseSec * SAMPLE_RATE);
  const detune = Math.pow(2, detuneCents / 1200);
  const f1 = freq;
  const f2 = freq * detune;
  const lfoHz = 0.12 + Math.random() * 0.06;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const breathing = 0.85 + 0.15 * Math.sin(2 * Math.PI * lfoHz * t);
    const s =
      Math.sin(2 * Math.PI * f1 * t) * 0.55 +
      Math.sin(2 * Math.PI * f2 * t) * 0.35 +
      Math.sin(2 * Math.PI * f1 * 2 * t) * 0.08; // faint octave-up shimmer
    out[i] = s * env[i] * amp * breathing;
  }
  return out;
}

function chord(buf, startSec, durationSec, freqs, amp, attackSec, releaseSec) {
  freqs.forEach((f, i) => {
    const note = padNote(f, durationSec, amp / Math.sqrt(freqs.length), attackSec, releaseSec, (i - freqs.length / 2) * 3);
    addAt(buf, startSec, note);
  });
}

// Soft sine "pluck" bass note (fast attack, exponential-ish decay).
function bassNote(freq, seconds, amp) {
  const n = Math.round(seconds * SAMPLE_RATE);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const decay = Math.exp(-t * 2.2);
    const attack = Math.min(1, t / 0.008);
    out[i] = Math.sin(2 * Math.PI * freq * t) * decay * attack * amp;
  }
  return out;
}

// Soft low-thump kick: quick pitch drop + fast decay.
function kick(amp) {
  const seconds = 0.28;
  const n = Math.round(seconds * SAMPLE_RATE);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const freq = 95 * Math.exp(-t * 18) + 45;
    const decay = Math.exp(-t * 14);
    out[i] = Math.sin(2 * Math.PI * freq * t) * decay * amp;
  }
  return out;
}

// Filtered-noise hat/snare texture (one-pole high-pass on white noise, short decay).
function noiseHit(seconds, amp, highpassCutoff) {
  const n = Math.round(seconds * SAMPLE_RATE);
  const out = new Float64Array(n);
  let prev = 0;
  const rc = 1 / (2 * Math.PI * highpassCutoff);
  const dt = 1 / SAMPLE_RATE;
  const alpha = rc / (rc + dt);
  let prevRaw = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const raw = Math.random() * 2 - 1;
    const filtered = alpha * (prev + raw - prevRaw);
    prev = filtered;
    prevRaw = raw;
    const decay = Math.exp(-t * 30);
    out[i] = filtered * decay * amp;
  }
  return out;
}

function normalizeAndWriteWav(buf, outPath, targetPeak) {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    peak = Math.max(peak, Math.abs(buf.left[i]), Math.abs(buf.right[i]));
  }
  const scale = peak > 0 ? targetPeak / peak : 1;

  const bytesPerSample = 2;
  const dataSize = buf.length * 2 * bytesPerSample;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(2, 22); // stereo
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2 * bytesPerSample, 28);
  header.writeUInt16LE(2 * bytesPerSample, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  const data = Buffer.alloc(dataSize);
  for (let i = 0; i < buf.length; i++) {
    const l = Math.max(-1, Math.min(1, buf.left[i] * scale));
    const r = Math.max(-1, Math.min(1, buf.right[i] * scale));
    data.writeInt16LE(Math.round(l * 32767), i * 4);
    data.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
  }

  fs.writeFileSync(outPath, Buffer.concat([header, data]));
}

// ---------- track 1: Ambient Calm ----------
// Slow evolving 4-chord pad loop, no percussion. 5s per chord x 4 chords = 20s, loops cleanly.
function generateAmbientCalm() {
  const chordDur = 5;
  const total = chordDur * 4;
  const buf = makeBuffer(total);

  const progression = [
    [110.0, 130.81, 164.81, 196.0], // Am7
    [87.31, 110.0, 130.81, 164.81], // Fmaj7
    [130.81, 164.81, 196.0, 246.94], // Cmaj7
    [98.0, 123.47, 146.83, 220.0], // G(add9-ish)
  ];

  progression.forEach((freqs, i) => {
    chord(buf, i * chordDur, chordDur + 1.5, freqs, 0.5, 1.4, 2.2);
  });

  return buf;
}

// ---------- track 2: Lo-Fi Chill ----------
// ii-V-I-vi progression at 80bpm with a soft kick/hat groove. 4 bars x 3s x 2 cycles = 24s loop.
function generateLoFiChill() {
  const bpm = 80;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const barsPerCycle = 4;
  const cycles = 2;
  const total = bar * barsPerCycle * cycles;
  const buf = makeBuffer(total);

  const progression = [
    { chord: [146.83, 174.61, 220.0, 261.63], bass: 73.42 }, // Dm7
    { chord: [98.0, 123.47, 146.83, 174.61], bass: 49.0 }, // G7
    { chord: [130.81, 164.81, 196.0, 246.94], bass: 65.41 }, // Cmaj7
    { chord: [110.0, 130.81, 164.81, 196.0], bass: 55.0 }, // Am7
  ];

  for (let cycle = 0; cycle < cycles; cycle++) {
    progression.forEach((step, barIndex) => {
      const barStart = (cycle * barsPerCycle + barIndex) * bar;

      chord(buf, barStart, bar + 1.2, step.chord, 0.32, 0.6, 1.0);
      addAt(buf, barStart + 0.005, bassNote(step.bass, bar, 0.42));

      for (let b = 0; b < 4; b++) {
        const beatStart = barStart + b * beat;
        const swing = (Math.random() - 0.5) * 0.012;

        if (b === 0 || b === 2) {
          addAt(buf, beatStart + swing, kick(0.55));
        }
        if (b === 1 || b === 3) {
          addAt(buf, beatStart + swing, noiseHit(0.18, 0.16, 1800));
        }
        // soft eighth-note hats, occasionally skipped for a human, non-mechanical feel
        if (Math.random() > 0.25) {
          addAt(buf, beatStart + beat / 2 + swing, noiseHit(0.06, 0.05 + Math.random() * 0.02, 5000));
        }
      }
    });
  }

  return buf;
}

// ---------- run ----------

function main() {
  const musicDir = path.join(process.cwd(), "public", "media", "music");
  fs.mkdirSync(musicDir, { recursive: true });
  const storageDir = path.join(process.cwd(), "storage");
  fs.mkdirSync(storageDir, { recursive: true });

  const tracks = [
    { id: "builtin_ambient_calm", name: "Ambient Calm", gen: generateAmbientCalm },
    { id: "builtin_lofi_chill", name: "Lo-Fi Chill", gen: generateLoFiChill },
  ];

  const registryPath = path.join(storageDir, "music.json");
  const existing = fs.existsSync(registryPath) ? JSON.parse(fs.readFileSync(registryPath, "utf-8")) : [];

  for (const track of tracks) {
    console.log(`Generating "${track.name}"...`);
    const buf = track.gen();
    const wavPath = path.join(musicDir, `${track.id}.wav`);
    const mp3Path = path.join(musicDir, `${track.id}.mp3`);
    normalizeAndWriteWav(buf, wavPath, 0.75);
    execFileSync(ffmpegPath, ["-y", "-i", wavPath, "-codec:a", "libmp3lame", "-q:a", "3", mp3Path], {
      stdio: "inherit",
    });
    fs.rmSync(wavPath, { force: true });
    track.durationInSeconds = buf.length / SAMPLE_RATE;
  }

  // Rebuild cleanly: fresh built-in entries first, plus any non-built-in tracks already registered.
  const nonBuiltin = existing.filter((t) => !tracks.some((tr) => tr.id === t.id));
  const finalRegistry = [
    ...tracks.map((track) => ({
      id: track.id,
      name: track.name,
      fileName: `${track.name}.mp3`,
      durationInSeconds: track.durationInSeconds,
      createdAt: existing.find((t) => t.id === track.id)?.createdAt ?? new Date().toISOString(),
    })),
    ...nonBuiltin,
  ];

  fs.writeFileSync(registryPath, JSON.stringify(finalRegistry, null, 2));
  console.log(`Registered ${tracks.length} built-in tracks in ${registryPath}`);
}

main();
