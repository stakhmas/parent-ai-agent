# Parent AI Agent

## Prerequisites

- Node.js 18+ (includes `npm`)

## Setup

1. Install dependencies:

   npm install

2. Configure environment variables:

   cp .env.example .env

   Then (optional) set your OpenAI API key in `.env`:

   OPENAI_API_KEY=your_api_key_here

   If `OPENAI_API_KEY` is not set, the app returns a local mock reply from `/chat`.

3. Start the server:

   npm run start

Server runs at `http://localhost:3000`.

## Endpoints

- `GET /` - web UI for chatting with assistant.
- `GET /health` - basic health check.
- `GET /api` - API metadata.
- `POST /chat` - accepts JSON `{ "message": "...", "profile": { ... }, "sessionId": "..." }`.

### Personalization

- Fill out the profile fields in the web UI (`GET /`) to get context-aware guidance.
- Profile data is stored locally in your browser.
- The backend keeps short in-memory conversation context per `sessionId` to make follow-up answers less generic.
- The UI keeps a short local dialogue history panel and allows clearing it with one click.
- If the message contains potential red-flag symptoms, the API response includes a safety marker.

### Example request

curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How can I soothe a fussy 6-month-old before sleep?","profile":{"childName":"Mia","childAgeMonths":"6 months","sleepChallenges":"frequent night wakings","familyGoal":"fall asleep by 21:00","parentStyle":"brief and practical","locale":"Warsaw"}}'
