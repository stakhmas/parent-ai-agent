# Parent AI Agent

## Prerequisites

- Node.js 18+ (includes `npm`)

## Setup

1. Install dependencies:

   npm install

2. Configure environment variables:

   cp .env.example .env

   Optional settings in `.env`:

   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   LEAD_LOG_PATH=/workspace/data/leads.ndjson

   If `OPENAI_API_KEY` is not set, `/chat` returns a local mock reply.

3. Start the server:

   npm run start

Server runs at `http://localhost:3000`.

## What is included for marketing

- Landing section with clear offer and CTA.
- Lead form for contact capture and callback request.
- UTM auto-attribution from URL query params (`utm_source`, `utm_medium`, `utm_campaign`, etc.).
- Lead storage in memory + append-only NDJSON log (`data/leads.ndjson` by default).
- Internal summary endpoint to inspect lead flow by traffic source.

## Endpoints

- `GET /` - marketing landing + lead form + demo chat.
- `GET /health` - basic health check.
- `GET /api` - API metadata and enabled features.
- `POST /chat` - accepts JSON `{ "message": "..." }`.
- `POST /api/leads` - accepts lead JSON and saves lead with attribution.
- `GET /api/leads` - returns lead summary grouped by source.

## Lead payload format

`POST /api/leads` accepts:

- `parentName` (string, optional)
- `contact` (string, required)
- `childAge` (string, optional)
- `goal` (string, optional)
- `notes` (string, optional)
- `consent` (boolean, required, must be `true`)
- `landingPath` (string, optional)
- `sessionId` (string, optional)
- `utm` (object, optional) with fields:
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
  - `gclid`, `fbclid`, `yclid`

## Quick campaign test

Open landing with UTM tags:

http://localhost:3000/?utm_source=instagram&utm_medium=paid&utm_campaign=spring_launch

Then submit lead form and verify:

curl -s http://localhost:3000/api/leads

You should see source counters and the latest masked contacts.

## Example API requests

Chat:

curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How can I soothe a fussy 6-month-old before sleep?"}'

Lead:

curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"parentName":"Anna","contact":"+79990000000","childAge":"2 years","goal":"sleep by 21:00","notes":"frequent night wakings","consent":true,"landingPath":"/?utm_source=instagram","sessionId":"demo","utm":{"utm_source":"instagram","utm_medium":"paid","utm_campaign":"spring_launch"}}'
