import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const NEXUS_URL    = process.env.NEXUS_URL    || "https://nexus-56tm.onrender.com"\;
const NEXUS_SECRET = process.env.NEXUS_SECRET || "";

const nexusHeaders = {
  "Content-Type": "application/json",
  "X-API-Key":    NEXUS_SECRET,
};

async function nexusAsk(prompt: string, task = "default"): Promise<string> {
  const res = await fetch(`${NEXUS_URL}/ask`, {
    method: "POST",
    headers: nexusHeaders,
    body: JSON.stringify({ prompt, task }),
  });
  if (!res.ok) throw new Error(`NEXUS /ask failed: ${res.status}`);
  const data = await res.json();
  return data.response as string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, input, systemPrompt, articleText, articleTitle } = body;

    if (action === "classify") {
      const prompt = `You are an intent classifier for a personal read-later app called Onyx with an AI agent called SAGE.
Classify user input into exactly one intent and extract params.
Return ONLY valid JSON, no explanation.

Intents:
- FEED_FILTER: user wants to see articles by topic/tag. params: { tag: string }
- SEARCH: user wants to find articles matching a query. params: { query: string }
- GOAL_SHOW: user wants to see their goals or progress. params: {}
- GOAL_UPDATE: user wants to update goal progress. params: { goal: string, progress: string }
- ARTICLE_OPEN: user wants to open a specific article. params: { title: string }
- GHOSTREADER: user wants to explain/summarise current article. params: { action: "explain"|"summarise"|"eli5" }
- FORGE_TASK: user wants to generate a practice task from current article. params: {}
- CHAT: general conversation, questions, motivation, anything else. params: {}

Tags: AI, ML, Python, DSA, System Design, Web Dev, Programming, Trading, DevOps, Linux, Career, Security, Psychology

User input: ${input}`;

      const raw   = await nexusAsk(prompt, "reasoning");
      const clean = raw.replace(/\`\`\`json|\`\`\`/g, "").trim();
      try {
        return NextResponse.json(JSON.parse(clean));
      } catch {
        return NextResponse.json({ intent: "CHAT", params: {} });
      }
    }

    if (action === "ghostread") {
      const { mode } = body;
      const modePrompts: Record<string, string> = {
        explain:   "Explain this article clearly in 3-4 sentences. Focus on the key insight.",
        summarise: "Summarise this article in 2-3 bullet points. Be concise.",
        eli5:      "Explain this article like I am 12 years old. Use simple words and an analogy.",
      };
      const instruction = modePrompts[mode] || modePrompts.summarise;
      const prompt = `${instruction}\n\nArticle: ${articleTitle}\n\n${(articleText || "").slice(0, 3000)}`;
      const response = await nexusAsk(prompt, "reasoning");
      return NextResponse.json({ response });
    }

    if (action === "chat") {
      const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\nUser: ${input}`
        : input;
      const response = await nexusAsk(fullPrompt, "default");
      return NextResponse.json({ response });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
