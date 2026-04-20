# English Dictation Tool

A web application for English vocabulary dictation practice with text-to-speech support and AI-powered semantic evaluation.

## Features

- **Interactive Mode**: Manual control over word playback - press play to hear each word
- **Continuous Mode**: Auto-play mode for dictation practice (offline)
- **AI Evaluation**: Semantic scoring using Google Gemini or OpenRouter APIs
- **Smart Parsing**: Supports multiple input formats (`,`, `:`, `-`, or whitespace as delimiter)
- **Adjustable Settings**: Configurable playback limit and speech speed

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS 4
- Web Speech API
- Google Gemini API / OpenRouter

## Getting Started

### Prerequisites

- Node.js 18+

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Build for Production

```bash
npm run build
```

## Usage

### Input Format

Enter vocabulary words in the format `English - Chinese` (one per line):

```
Apple - 苹果
Banana - 香蕉
Cat - 猫
```

Supported delimiters: `|`, `:`, `-`, or whitespace.

### Settings

- **Playback Limit**: Number of times each word can be played (1-5)
- **Speech Speed**: Audio rate (0.5x - 1.5x)

### AI Configuration

Click the settings icon in the header to configure:

- **Provider**: Gemini or OpenRouter
- **API Key**: Your API key
- **Model**: Model ID (default: `openai/gpt-oss-120b:free`)

## Project Structure

```
src/
├── components/
│   ├── AISettingsModal.tsx    # AI configuration modal
│   ├── ContinuousMode.tsx   # Auto-play dictation component
│   ├── DataIntegrityCheck.tsx # Session data verification
│   ├── DictationCard.tsx      # Interactive dictation card
│   ├── Header.tsx           # App header
│   ├── ResultsAudit.tsx     # Results display with AI verdicts
│   ├── WelcomePanel.tsx    # Welcome/intro panel
│   └── WordInputPanel.tsx   # Word input form
├── hooks/
│   └── useSpeechSynthesis.ts # Web Speech API hook
├── utils/
│   └── helpers.ts           # Input parsing & shuffling
├── types.ts                # TypeScript interfaces
├── App.tsx                  # Main application
└── main.tsx               # Entry point
```

## License

Apache 2.0