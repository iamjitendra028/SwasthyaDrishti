# SwasthyaDrishti

**Indigenous Computer Vision Ecosystem for Grassroots Sports & Fitness**

This is the starting phase of SwasthyaDrishti based on `Project Synopsis.pdf`. It presents the camera-first sports and wellness system through a responsive login, athlete dashboard, module previews, progress view, and in-product guide. The optional local AI service adds Gemini guidance with LangChain retrieval from Chroma.

## Run locally

Requires Node.js and npm.

```sh
npm install
npm run dev:all
```

Open `http://127.0.0.1:5174/`. For the frontend alone, use `npm run dev`. Gemini and local Chroma setup is documented below. To build a static frontend bundle, run `npm run build`.

## Demo login

The sign-in screen accepts any non-empty name and password. This is intentionally a frontend demo with no authentication or server request.

## Synopsis coverage

- **Sports Talent Scout:** camera-based posture, joint-angle, movement and injury-risk feedback concept.
- **Digital Gymnast:** exercise repetition counting and form-correction concept.
- **Yoga & Pranayama:** guided postures and breathing practice with voice-cue concept.
- **Localized nutrition:** India-relevant food ideas aligned with training and regional food habits.
- **Progress and analytics:** movement trends and recent practice history.
- **Privacy-first edge AI:** the synopsis proposes on-device video processing with MediaPipe/OpenCV and lightweight inference.

## Frontend prototype boundaries

Sign-in, navigation, responsive layout, module previews, theme toggle, camera pose tracking, squat rep estimates, practice timers, and sample interactions run locally in the browser. Chat requests go through the local API to Gemini when configured. Dashboard values and histories are illustrative. The chat guide uses the optional local LangChain API with Gemini and Chroma retrieval.

There is no backend, persistent account, exercise classification, voice feedback, nutrition personalization, or saved progress. Sports Scout and Digital Gymnast include opt-in local camera tracking with YOLOv8 Pose; squat rep counting is an approximate knee-angle estimate. The architecture describes other proposed system services and must not be read as implemented services.

## Project architecture

The high-level design and sprint-aligned low-level designs are in [docs/architecture.md](docs/architecture.md). They follow the SwasthyaDrishti synopsis and organize the sprint goals into design slices. See [docs/project-alignment.md](docs/project-alignment.md) for the current implementation boundary.

## Camera pose preview
Sports Scout and Digital Gymnast request camera access only after you choose to start. YOLOv8n Pose runs in the browser using the bundled ONNX model in public/models/yolov8n-pose.onnx; no camera video is sent to a server or saved. Squat repetitions are an approximate knee-angle practice counter. The browser runtime package and model are AGPL-3.0; review licensing before distributing a modified project.


## AI guide setup (Gemini + LangChain + local Chroma)

The guide sends exercise, yoga, breathing, and nutrition questions to a local Express API. LangChain retrieves relevant project recipes and movement guidance from a persistent local Chroma collection, then Gemini writes the answer. The Google API key stays in the server environment and is never sent to the browser. Recipe macro values are estimates; the guide is not medical or dietetic care.

1. Copy `.env.example` to `.env` and add your Google AI Studio API key to `GOOGLE_API_KEY`.
2. Install and start Docker Desktop, then run `docker compose up -d` from the project folder. Chroma stores its local collection under `data/chroma`.
3. Run `npm run dev:all`. Open `http://127.0.0.1:5174/`. The first AI question creates and fills the project knowledge collection; later questions use it for retrieval.

You can check API readiness at `http://127.0.0.1:3001/api/health`. Gemini and Chroma must both be available for AI answers. Without either configuration, the chat explains the setup issue rather than returning canned replies.

