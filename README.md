# Meeting Notes Summarizer

AI-powered meeting transcription and summarization tool. Upload audio recordings and get structured summaries with key points, action items, and main topics.

## Features

- 🎙️ Audio transcription (MP3, WAV, M4A)
- 📝 AI-powered summarization
- 💡 Key points extraction
- ✅ Action items identification
- 📊 Main topics analysis
- 🔄 Support for large files (chunked processing)
- 🌓 Dark mode support

## Quick Start

### Prerequisites

- Node.js 18+
- Firebase account
- OpenAI API key

### Installation

1. Clone and install dependencies:
```bash
git clone <your-repo-url>
cd meeting-notes-summarizer
npm install
```

2. Create `.env.local` with your API keys:
```env
# Firebase
FIREBASE_API_KEY=xxx
FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
FIREBASE_PROJECT_ID=xxx
FIREBASE_STORAGE_BUCKET=xxx.appspot.com
FIREBASE_MESSAGING_SENDER_ID=xxx
FIREBASE_APP_ID=xxx
FIREBASE_GOOGLE_ANALYTICS_MEASUREMENT_ID=xxx

# OpenAI
OPENAI_API_KEY=xxx
```

### Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database:
   - Go to Firestore Database
   - Click "Create Database"
   - Choose "Start in test mode"

3. Enable Storage:
   - Go to Storage
   - Click "Get Started"
   - Choose a location

4. Deploy security rules:
```bash
firebase deploy --only firestore:rules,storage:rules
```

### Run the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Usage

1. Upload Audio
   - Click "Choose File" or drag & drop
   - Supports MP3, WAV, M4A up to 100MB

2. Processing
   - File uploads to Firebase Storage
   - Audio is transcribed using Whisper
   - GPT generates structured summary

3. View Results
   - See key discussion points
   - Review action items
   - Check main topics
   - Access full transcription

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/     # Audio processing
│   │   └── summaries/  # Summary management
│   ├── summaries/      # Summary list page
│   └── page.tsx        # Home page
├── components/
│   └── AudioUploader.tsx
└── lib/
    └── firebase.ts
```

## Tech Stack

- Next.js 15.2
- Firebase (Storage & Firestore)
- OpenAI (Whisper & GPT-4)
- TailwindCSS
- TypeScript

## License

MIT
