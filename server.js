import express from "express";
import fetch from "node-fetch";

const app = express();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
app.use(express.json());

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== "string") {
      return res.status(400).json({
        error: "Field \"message\" must be a non-empty string."
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Missing OPENAI_API_KEY environment variable."
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Ты — заботливый помощник для родителей детей 0-3 лет.
Не давай медицинских диагнозов.
Объясняй просто и спокойно.
Давай практические советы.`
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI API request failed."
      });
    }

    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(502).json({
        error: "OpenAI API returned an unexpected response format."
      });
    }

    return res.json({ reply });
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected server error.",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
