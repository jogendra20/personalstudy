import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
const NEXUS_URL    = process.env.NEXUS_URL || "https://nexus-56tm.onrender.com";
const NEXUS_SECRET = process.env.NEXUS_SECRET || "";

const dbHeaders = {
  "Content-Type":  "application/json",
  "apikey":        SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

const nexusHeaders = {
  "Content-Type": "application/json",
  "X-API-Key":    NEXUS_SECRET,
};

// ── Extract OG image from HTML ────────────────────────────────────
function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  return match ? match[1] : null;
}

function extractOgDescription(html: string): string | null {
  const match = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// ── GET — fetch articles ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") || "20";
  const tag   = searchParams.get("tag");

  let url = `${SUPABASE_URL}/rest/v1/articles?order=score.desc,created_at.desc&limit=${limit}`;
  if (tag) url += `&tag=eq.${tag}`;

  const res = await fetch(url, { headers: dbHeaders });
  const data = await res.json();
  return NextResponse.json(data);
}

// ── POST — add new article ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, tag } = body;
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    // 1. Fetch article HTML for OG data
    let imageUrl: string | null = null;
    let imageSource = "none";
    let summary: string | null = null;
    let title = body.title || "";

    try {
      const pageRes = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
      });
      const html = await pageRes.text();

      // Extract OG image
      imageUrl = extractOgImage(html);
      if (imageUrl) imageSource = "og";

      // Extract description
      summary = extractOgDescription(html);

      // Extract title if not provided
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1].trim();
      }
    } catch {}

    // 2. If no OG image, generate via NEXUS
    if (!imageUrl) {
      try {
        const imgRes = await fetch(`${NEXUS_URL}/image`, {
          method: "POST",
          headers: nexusHeaders,
          body: JSON.stringify({
            prompt: `${title} ${tag || ""}`.trim(),
            callback_url: "none",
          }),
        });
        const imgData = await imgRes.json();
        if (imgData.image_url) {
          imageUrl = imgData.image_url;
          imageSource = "pollinations";
        }
      } catch {}
    }

    // 3. Generate summary via NEXUS if missing
    if (!summary && title) {
      try {
        const sumRes = await fetch(`${NEXUS_URL}/ask`, {
          method: "POST",
          headers: nexusHeaders,
          body: JSON.stringify({
            prompt: `Write a 1-sentence summary of this article: "${title}". Be specific and concise.`,
            task: "default",
          }),
        });
        const sumData = await sumRes.json();
        summary = sumData.response || null;
      } catch {}
    }

    // 4. Save to Supabase
    const article = {
      url,
      title,
      source: new URL(url).hostname.replace("www.", ""),
      tag: tag || "Programming",
      summary,
      image_url:    imageUrl,
      image_source: imageSource,
      score:        0.5,
    };

    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/articles`, {
      method: "POST",
      headers: { ...dbHeaders, "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify(article),
    });

    if (!saveRes.ok) {
      const err = await saveRes.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    return NextResponse.json({ success: true, article });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
