type VercelRequest = { method?: string; body?: unknown };
type VercelResponse = { status(code: number): VercelResponse; json(value: unknown): void; setHeader(name: string, value: string): void };
type AiTask = { title: string; duration: number; priority: "high" | "medium" | "low" };

function isTask(value: unknown): value is AiTask {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return typeof task.title === "string" && task.title.trim().length > 0
    && typeof task.duration === "number" && task.duration >= 5 && task.duration <= 480
    && ["high", "medium", "low"].includes(String(task.priority));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "AI is not configured" });
  const rawBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const body = rawBody as { text?: unknown; language?: unknown } | null;
  const text = body?.text;
  const language = body?.language === "uk" ? "Ukrainian" : "English";
  if (typeof text !== "string" || !text.trim() || text.length > 600) return res.status(400).json({ error: "Invalid text" });

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent", {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `You are the task-parsing module for Lad, a daily planner. Turn unstructured thoughts into concrete tasks. Never invent tasks. Always write task titles in ${language}.` }],
        },
        contents: [{
          role: "user",
          parts: [{ text: `Extract up to 12 tasks from the text. Write each title as a short action in ${language}. Estimate duration in minutes from 5 to 480. Set priority to high, medium, or low based on urgency, deadlines, and importance. Text:\n${text.trim()}` }],
        }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 900,
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            maxItems: 12,
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: `A short, concrete action in ${language}` },
                duration: { type: "integer", minimum: 5, maximum: 480 },
                priority: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["title", "duration", "priority"],
              additionalProperties: false,
            },
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const content = payload.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text;
    if (!content) throw new Error("Empty AI response");
    const parsed: unknown = JSON.parse(content.replace(/^```json\s*|\s*```$/g, ""));
    if (!Array.isArray(parsed)) throw new Error("Invalid AI response");
    const tasks = parsed.filter(isTask).slice(0, 12).map((task) => ({ ...task, title: task.title.trim() }));
    if (!tasks.length) throw new Error("No valid tasks");
    return res.status(200).json({ tasks });
  } catch (error) {
    console.error(error);
    return res.status(502).json({ error: "AI parsing failed" });
  }
}
