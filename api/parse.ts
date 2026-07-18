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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "AI is not configured" });
  const rawBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const text = (rawBody as { text?: unknown } | null)?.text;
  if (typeof text !== "string" || !text.trim() || text.length > 600) return res.status(400).json({ error: "Invalid text" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 900,
        temperature: 0,
        system: "Ти модуль українського планера Lad. Перетворюй хаотичний текст на конкретні задачі. Не вигадуй задач. Повертай виключно валідний JSON без markdown.",
        messages: [{ role: "user", content: `Розбери текст на максимум 12 задач. Поверни масив об'єктів з полями: title (коротка дія українською), duration (оцінка у хвилинах від 5 до 480), priority (high, medium або low). Враховуй терміновість, дедлайни та важливість. Текст:\n${text.trim()}` }],
      }),
    });
    if (!response.ok) throw new Error(`Anthropic request failed: ${response.status}`);
    const payload = await response.json() as { content?: Array<{ type?: string; text?: string }> };
    const content = payload.content?.find((block) => block.type === "text")?.text;
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
