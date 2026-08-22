# 🎬 Captions Gen (AI Video Caption Generator & Editor)

An open-source, AI-powered video caption generator and motion-graphics editor built with **Next.js**, **OpenAI Whisper**, and **Remotion**. Automatically transcribe speech, customize animated subtitle styles, add logos, background music, and title cards, preview changes in real time, and render production-ready videos directly from your browser.

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [⚡ Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [Installation & Setup](#installation--setup)
- [⚙️ Environment Variables](#️-environment-variables)
- [🚀 How to Use (Step-by-Step)](#-how-to-use-step-by-step)
  - [1. Upload a Video](#1-upload-a-video)
  - [2. Generate AI Captions](#2-generate-ai-captions)
  - [3. Edit & Style Subtitles](#3-edit--style-subtitles)
  - [4. Add Overlays & Audio](#4-add-overlays--audio)
  - [5. Export & Render](#5-export--render)
- [📁 Project Structure](#-project-structure)
- [🛠️ Available Scripts](#️-available-scripts)
- [❓ Troubleshooting & FAQ](#-troubleshooting--faq)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

- **🎙️ Automatic AI Transcription**: Extract speech and generate word-level timestamped captions using OpenAI Whisper.
- **🎨 Rich Caption Styling**:
  - Customize typography, font size, text colors, and highlights.
  - Choose animated caption presets (TikTok / Reels / Shorts style).
  - Fine-tune positioning (top, center, bottom, custom coordinates).
- **🔤 Multi-language & Transliteration Support**: Transcribe and transliterate across multiple languages.
- **🏷️ Title Cards & Watermarks**: Add opening title cards and brand logo overlays with customizable positioning and opacity.
- **🎵 Background Music**: Overlay background tracks and control audio volume levels.
- **⚡ Live Preview & Remotion Player**: Instant playback and real-time visual feedback before rendering.
- **💾 Subtitle Export / Import**: Export captions to standard `.srt` or `.vtt` formats.
- **🎞️ High-Quality Video Rendering**: Server-side video rendering powered by `@remotion/renderer` and `ffmpeg`.

---

## ⚡ Quick Start

Get the project running locally in under 2 minutes.

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18+` (v20+ recommended)
- **npm** (comes with Node.js)
- **OpenAI API Key**: Required for Whisper speech transcription.

### Installation & Setup

1. **Clone the repository** (or download the source files):
   ```bash
   git clone https://github.com/mzain-dev/captions-generator.git
   cd captions-generator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your environment variables**:
   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.local.example .env.local
   ```
   Open `.env.local` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=your_actual_openai_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open the application**:
   Navigate to [http://localhost:3000](http://localhost:3000) in your web browser.

---

## ⚙️ Environment Variables

The application uses the following environment variables:

| Variable | Required | Description | Example Value |
| :--- | :--- | :--- | :--- |
| `OPENAI_API_KEY` | **Yes** | Your secret OpenAI API key for speech-to-text transcription via the Whisper API. | `sk-proj-abc123xyz...` |

> 🔒 **Security Notice**: Never commit `.env.local` or expose your secret API keys in version control.

---

## 🚀 How to Use (Step-by-Step)

### 1. Upload a Video
- On the home page, click **Upload Video** or drag and drop your video file (`.mp4`, `.mov`, `.webm`).
- The app will extract the audio and load the video into the project workspace.

### 2. Generate AI Captions
- Select the spoken language or leave it on auto-detect.
- Click **Transcribe**. The audio will be processed via OpenAI Whisper to generate timestamped caption blocks.

### 3. Edit & Style Subtitles
- **Edit Words & Timing**: Adjust text spelling, timing boundaries, and segment breaks directly in the sidebar editor or timeline.
- **Customize Appearance**: Pick font families, font weights, colors, stroke borders, shadows, and active word highlight colors.
- **Apply Presets**: Choose pre-built caption presets optimized for vertical video formats (Reels, TikTok, YouTube Shorts).

### 4. Add Overlays & Audio
- **Title Card**: Toggle an introductory title banner with custom heading text.
- **Logo/Watermark**: Upload a transparent PNG logo and adjust its corner placement, scale, and opacity.
- **Background Music**: Add a background audio track and adjust balance sliders.

### 5. Export & Render
- **Export Subtitles**: Download `.srt` or `.vtt` files for use in external video editors (Premiere, DaVinci, CapCut).
- **Render Video**: Click **Export / Render** to generate the final processed `.mp4` video with burned-in subtitles and overlays.

---

## 📁 Project Structure

```text
captions-gen/
├── app/                      # Next.js App Router
│   ├── api/                  # API Route Handlers
│   │   ├── fonts/            # Custom font loading endpoints
│   │   ├── logos/            # Logo upload and management
│   │   ├── music/            # Background music endpoints
│   │   ├── presets/          # Caption style presets
│   │   ├── projects/         # Project persistence
│   │   ├── render/           # Remotion video rendering pipeline
│   │   ├── subtitles/        # SRT / VTT export and parsing
│   │   ├── transcribe/       # OpenAI Whisper transcription
│   │   └── upload/           # Video upload handling
│   ├── editor/[id]/          # Main video & caption editor page
│   ├── layout.tsx            # Root HTML layout and metadata
│   └── page.tsx              # Home & project list page
├── components/               # React UI Components
│   ├── CaptionListEditor.tsx # Interactive caption line & word editor
│   ├── CaptionPreview.tsx    # Subtitle preview overlay
│   ├── EditorSidebar.tsx     # Style, font, audio, and overlay controls
│   ├── ExportButton.tsx      # Video rendering and download modal
│   ├── ProjectList.tsx       # Saved projects management
│   ├── Timeline.tsx          # Interactive playback timeline
│   ├── VideoEditor.tsx       # Main editor orchestrator
│   └── VideoUploader.tsx     # File upload dropzone component
├── lib/                      # Core Utilities & Backend Helpers
│   ├── captions.ts           # Caption data structures and transformations
│   ├── ffmpeg.ts             # Audio extraction and FFmpeg processing
│   ├── openai.ts             # OpenAI Whisper client configuration
│   ├── paths.ts              # Local file and asset path resolution
│   ├── renderer.ts           # Remotion rendering engine integration
│   └── subtitles.ts          # SRT/VTT parser and generator
├── remotion/                 # Remotion Compositions & Video Templates
│   ├── Caption.tsx           # Animated subtitle rendering component
│   ├── CaptionVideo.tsx      # Main Remotion composition
│   ├── Logo.tsx              # Logo / watermark layer
│   ├── Root.tsx              # Remotion root entry
│   └── TitleCard.tsx         # Title card overlay component
├── storage/                  # Local storage for uploads, audio, and renders
├── public/                   # Static assets
├── .env.local.example        # Environment variable template
├── package.json              # Project dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server at [http://localhost:3000](http://localhost:3000). |
| `npm run build` | Builds the optimized production application. |
| `npm run start` | Runs the production build server. |
| `npm run lint` | Runs ESLint checks across the codebase. |

---

## ❓ Troubleshooting & FAQ

<details>
<summary><strong>1. "OpenAI API Key Missing or Invalid" Error</strong></summary>

- Verify that you created a `.env.local` file in the project root.
- Ensure the key starts with `sk-` and has active credits in your OpenAI account.
- Restart the development server (`npm run dev`) after editing `.env.local`.
</details>

<details>
<summary><strong>2. Video Fails to Transcribe or Upload</strong></summary>

- Check that the video contains an audible audio track.
- Very large videos may take longer to extract audio; ensure your browser tab remains open during processing.
</details>

<details>
<summary><strong>3. Video Rendering Issues</strong></summary>

- Ensure your system has sufficient free disk space in the `storage/` directory.
- Verify that your Node.js environment has permissions to execute FFmpeg binaries.
</details>

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit your changes: `git commit -m 'Add amazing feature'`.
4. Push to the branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use, modify, and distribute it for personal or commercial projects.
