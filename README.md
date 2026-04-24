# Parent AI Agent

## Prerequisites

- Node.js 18+ (includes `npm`)

## Setup

1. Install dependencies:

   npm install

2. Set your OpenAI API key:

   export OPENAI_API_KEY="your_api_key_here"

3. Start the server:

   npm run start

Server runs at `http://localhost:3000`.

## Endpoints

- `GET /health` - basic health check.
- `POST /chat` - accepts JSON `{ "message": "..." }`.

### Example request

curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How can I soothe a fussy 6-month-old before sleep?"}'
