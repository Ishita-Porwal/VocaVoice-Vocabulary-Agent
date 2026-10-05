# VocaVoice — AI Vocabulary Coach

A simple voice-first vocabulary learning prototype built with HTML, CSS and JavaScript.

## Features
- Voice prompt using browser speech synthesis
- Voice input using Web Speech API
- Vocabulary definitions and examples
- Spoken-sentence practice
- Instant feedback
- Score, words practiced and streak tracking
- Responsive UI

## Run locally
Open `index.html` in Google Chrome.

For best microphone behavior, use a local server:
- VS Code → install Live Server → right click `index.html` → Open with Live Server
- Or run: `python -m http.server 5500`

Then open:
http://localhost:5500

## Deploy
This is a static website, so it can be deployed on GitHub Pages, Netlify, Vercel, or similar static hosting.

## Note
The prototype intentionally avoids requiring an API key. The browser's built-in Web Speech API handles speech recognition and text-to-speech.
