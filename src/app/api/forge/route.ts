import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

async function tavilySearch(query: string, key: string, max = 3) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query, search_depth: "basic", max_results: max }),
  });
  if (!res.ok) throw new Error("Tavily " + res.status);
  return res.json();
}

async function groqCall(groqKey: string, system: string, user: string, tokens = 400) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + groqKey },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: tokens,
      temperature: 0.5,
    }),
  });
  if (!res.ok) throw new Error("Groq " + res.status);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, tavilyKey, groqKey, articleText, articleTag, articleTitle, weakArea, answer, task } = body;

    if (action === "news") {
      const queries = [
        { q: "NSE Nifty Sensex Indian stock market news today", cat: "indian" },
        { q: "India RBI economy Dalal Street today", cat: "indian" },
        { q: "Bitcoin Ethereum cryptocurrency market today", cat: "crypto" },
        { q: "USD INR forex currency market today", cat: "forex" },
        { q: "global stock futures indices markets today", cat: "global" },
      ];

      const settled = await Promise.allSettled(
        queries.map(({ q, cat }) =>
          tavilySearch(q, tavilyKey, 3).then(d => ({ results: d.results || [], cat }))
        )
      );

      const items: object[] = [];
      settled.forEach(r => {
        if (r.status !== "fulfilled") return;
        r.value.results.forEach((item: any) => {
          let source = item.url;
          try { source = new URL(item.url).hostname.replace("www.", ""); } catch {}
          items.push({
            title: item.title,
            summary: (item.content || "").slice(0, 200),
            url: item.url,
            source,
            category: r.value.cat,
          });
        });
      });

      return NextResponse.json({ items });
    }

    if (action === "generate_task") {
      const bias = weakArea ? `User is weak in: ${weakArea}. Bias toward this if relevant.` : "";
      const system = `You are FORGE — a task generator for a personal learning app.
Given an article, generate ONE practical task the user can do right now.
${bias}

Return ONLY valid JSON, no explanation:
{
  "type": "code" | "quiz" | "design" | "review" | "link",
  "title": "short task title max 8 words",
  "description": "clear what to do, specific, max 120 words. For quiz include 3 MCQ options.",
  "starterCode": "starter code string if type is code, else omit",
  "language": "python or javascript if type is code, else omit",
  "linkUrl": "best URL if type is link, else omit"
}

Rules:
- DSA/Algorithm → code with real problem
- Trading/Finance → quiz with 3 MCQ
- System Design → design prompt
- AI/ML → code or review
- Vague/other → link to best resource
- Task must be doable in 15-30 mins`;

      const raw = await groqCall(groqKey, system,
        `Tag: ${articleTag}\nTitle: ${articleTitle}\nContent: ${(articleText || "").slice(0, 2000)}`,
        600
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      return NextResponse.json({ task: JSON.parse(clean) });
    }

    if (action === "check_answer") {
      const system = `You are FORGE checker. Evaluate the user answer for the task.
Return ONLY valid JSON:
{
  "score": 0-100,
  "feedback": "2-3 sentences: what was right, what was wrong, how to improve",
  "correct": true or false
}`;
      const raw = await groqCall(groqKey, system,
        `Task: ${task?.title}\nDescription: ${task?.description}\nUser answer:\n${answer}`,
        300
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
