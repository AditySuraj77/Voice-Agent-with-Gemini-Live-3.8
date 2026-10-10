# Gemini Live Voice Agent

A real-time, low-latency conversational AI voice assistant inspired by ChatGPT Voice Mode, built with **Gemini 3.8 Live** models (`gemini-3.8-live` and `gemini-3.8-live-extended-thinking`), Web Audio API, Express, and React.

---

## Architecture Overview

- **Frontend**: React (Vite, JavaScript/JSX, Tailwind CSS v4, Lucide Icons).
- **Backend**: Node.js Express server acting as a secure ephemeral-token gatekeeper.
- **Protocol**: Direct WebSocket streaming between browser and Gemini Live API (`wss://generativelanguage.googleapis.com/.../BidiGenerateContentConstrained`) authenticated via short-lived tokens.
- **Audio Pipeline**:
  - Input: Browser microphone captured via Web Audio API, downsampled from 44.1/48kHz to **16kHz 16-bit linear PCM**, base64 encoded and streamed.
  - Output: **24kHz 16-bit linear PCM** streamed from Gemini, scheduled seamlessly through Web Audio `AudioBufferSourceNode`.
  - Barge-in / Interruption: Server `interrupted: true` signal immediately stops playing audio and flushes the buffer queue with zero latency.

---

## Setup & Running on Windows

### 1. Configure Backend Environment
Navigate to the `Backend` directory and configure your `.env` file:
```powershell
cd Backend
Copy-Item .env.example .env
```
Open `Backend/.env` and insert your Gemini API key:
```env
PORT=3001
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
CLIENT_ORIGIN=http://localhost:5173
```

### 2. Start Backend Server
In PowerShell:
```powershell
cd Backend
npm run dev
```
The server will start on `http://localhost:3001`. You can test health at `http://localhost:3001/api/health`.

### 3. Start Frontend Client
In a second PowerShell terminal:
```powershell
cd Frontend
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## How to Test

1. Ensure your Gemini API Key is entered in `Backend/.env`.
2. Open `http://localhost:5173` in Google Chrome or Microsoft Edge.
3. Click **Start Voice Session** at the bottom right.
4. Allow microphone access when prompted.
5. Speak naturally into the microphone (e.g., *"Hello Gemini, can you introduce yourself?"*).
   - Your speech will be transcribed in a user message bubble.
   - Gemini will speak back naturally with minimal latency while displaying its assistant transcript bubble.
6. **Test Barge-in / Interruption**: While Gemini is answering, speak out loud (e.g., *"Wait, stop!"*). Notice Gemini halts speech output immediately and listens to your new statement.
7. **Test Deep Thinking Voice**: Click the **Deep Thinking** model toggle at the top to switch to `gemini-3.8-live-extended-thinking`.
