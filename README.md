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
- `POST /chat` - accepts JSON `{ "message": "..." }`.

### Example request

curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How can I soothe a fussy 6-month-old before sleep?"}'
