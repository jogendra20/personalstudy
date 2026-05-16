import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const NEXUS_URL    = process.env.NEXUS_URL    || "https://nexus-56tm.onrender.com"\;
const NEXUS_SECRET = process.env.NEXUS_SECRET || "";

const nexusHeaders = {
  "Content-Type": "application/json",
  "X-API-Key":    NEXUS_SECRET,
};

async function nexusAsk(prompt: string, task = "reasoning"): Promise<string> {
  const res = await fetch(`${NEXUS_URL}/ask`, {
    method: "POST",
    headers: nexusHeaders,
    body: JSON.stringify({ prompt, task }),
  });
  if (!res.ok) throw new Error(`NEXUS /ask failed: ${res.status}`);
  const data = await res.json();
  return data.response as string;
}

async function nexusSearch(query: string, max = 3): Promise<object[]> {
  const res = await fetch(`${NEXUS_URL}/search`, {
    method: "POST",
    headers: nexusHeaders,
    body: JSON.stringify({ query, max_results: max, freshness: "day" }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, articleText, articleTag, articleTitle, weakArea, answer, task } = body;

    if (action === "news") {
      const queries = [
        { q: "NSE Nifty Sensex Indian stock market news today",   cat: "indian" },
        { q: "India RBI economy Dalal Street today",              cat: "indian" },
        { q: "Bitcoin Ethereum cryptocurrency market today",      cat: "crypto" },
        { q: "USD INR forex currency market today",               cat: "forex"  },
        { q: "global stock futures indices markets today",        cat: "global" },
      ];

      const settled = await Promise.allSettled(
        queries.map(({ q, cat }) =>
          nexusSearch(q, 3).then(results => ({ results, cat }))
        )
      );

      const items: object[] = [];
      settled.forEach(r => {
        if (r.status !== "fulfilled") return;
        r.value.results.forEach((item: any) => {
          let source = item.url;
          try { source = new URL(item.url).hostname.replace("www.", ""); } catch {}
          items.push({
            title:    item.title,
            summary:  (item.snippet || "").slice(0, 200),
            url:      item.url,
            source,
            category: r.value.cat,
          });
        });
      });

      return NextResponse.json({ items });
    }

    if (action === "generate_task") {
      const bias = weakArea ? `User is weak in: ${weakArea}. Bias toward this if relevant.` : "";
      const prompt = `You are FORGE — a task generator for a personal learning app.
Given an article, generate ONE practical task the user can do right now.
${bias}

Article Tag: ${articleTag}
Article Title: ${articleTitle}
Article Content: ${(articleText || "").slice(0, 2000)}

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

      const raw   = await nexusAsk(prompt, "reasoning");
      const clean = raw.replace(/\`\`\`json|\`\`\`/g, "").trim();
      return NextResponse.json({ task: JSON.parse(clean) });
    }

    if (action === "check_answer") {
      const prompt = `You are FORGE checker. Evaluate the user answer for the task.
Return ONLY valid JSON:
{
  "score": 0-100,
  "feedback": "2-3 sentences: what was right, what was wrong, how to improve",
  "correct": true or false
}

Task: ${task?.title}
Description: ${task?.description}
User answer:
${answer}`;

      const raw   = await nexusAsk(prompt, "reasoning");
      const clean = raw.replace(/\`\`\`json|\`\`\`/g, "").trim();
      return NextResponse.json(JSON.parse(clean));
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
