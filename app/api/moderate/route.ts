import { NextRequest, NextResponse } from "next/server";
import type { JudgeResult, ModerationResponse, Vote } from "@/lib/types";

export const runtime = "edge";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_JUDGES = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-haiku",
  "google/gemini-2.0-flash-001"
];

const CATEGORIES = [
  "harassment",
  "hate",
  "violence",
  "sexual",
  "self_harm",
  "spam_or_scam",
  "misinformation",
  "none"
] as const;

const SYSTEM_PROMPT = `You are one independent judge in a 3-judge content-moderation tribunal for a social platform.
Classify whether the user's post violates policy. Borderline cases matter most: judge carefully, do not over-flag satire, quotes, news reporting, or self-expression, and do not under-flag targeted abuse.

Policy categories: ${CATEGORIES.join(", ")}.

Respond with ONLY a minified JSON object, no markdown, no prose:
{"vote":"FLAG"|"ALLOW","category":"<one category, 'none' if ALLOW>","confidence":<number 0..1>,"reason":"<one short sentence in the same language as the post>"}`;

function extractJson(text: string): any {
  // Strip code fences if the model added them, then grab the first {...} block.
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in model output");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callJudge(
  apiKey: string,
  model: string,
  post: string
): Promise<JudgeResult> {
  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://llm-tribunal.vercel.app",
        "X-Title": "LLM Tribunal"
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 200,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `POST TO MODERATE:\n"""${post}"""` }
        ]
      })
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(raw);

    const vote: Vote = parsed.vote === "FLAG" ? "FLAG" : "ALLOW";
    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0));
    const category =
      typeof parsed.category === "string" ? parsed.category : "none";

    return {
      model,
      ok: true,
      vote,
      category,
      confidence,
      reason: String(parsed.reason ?? "").slice(0, 300),
      latencyMs: Date.now() - t0
    };
  } catch (err: any) {
    return {
      model,
      ok: false,
      error: String(err?.message ?? err).slice(0, 200),
      latencyMs: Date.now() - t0
    };
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  let post: string;
  try {
    const body = await req.json();
    post = String(body?.content ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!post) {
    return NextResponse.json({ error: "Content is empty." }, { status: 400 });
  }
  if (post.length > 4000) {
    return NextResponse.json(
      { error: "Content too long (max 4000 chars)." },
      { status: 400 }
    );
  }

  const judges = (process.env.JUDGE_MODELS ?? DEFAULT_JUDGES.join(","))
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 5);

  const threshold = Math.min(
    1,
    Math.max(0, Number(process.env.CONFIDENCE_THRESHOLD ?? 0.7))
  );

  const t0 = Date.now();

  // ── Fan-out: identical input to N judges, in parallel ──────────────
  const results = await Promise.all(
    judges.map((model) => callJudge(apiKey, model, post))
  );

  // ── Aggregate: majority vote ───────────────────────────────────────
  const okResults = results.filter((r) => r.ok);
  const flag = okResults.filter((r) => r.vote === "FLAG").length;
  const allow = okResults.filter((r) => r.vote === "ALLOW").length;
  const failed = results.length - okResults.length;

  let final: ModerationResponse["final"];
  let finalReason: string;
  let majorityConfidence: number | null = null;

  if (okResults.length < 2) {
    final = "ESCALATE";
    finalReason = "Fewer than 2 judges responded — escalated to human review.";
  } else {
    const majorityVote: Vote = flag > allow ? "FLAG" : "ALLOW";
    const majority = okResults.filter((r) => r.vote === majorityVote);
    majorityConfidence =
      majority.reduce((s, r) => s + (r.confidence ?? 0), 0) / majority.length;

    const unanimous = flag === 0 || allow === 0;

    // ── Threshold guardrail: split vote + low confidence → human ────
    if (!unanimous && majorityConfidence < threshold) {
      final = "ESCALATE";
      finalReason = `Split vote (${flag}–${allow}) with majority confidence ${majorityConfidence.toFixed(
        2
      )} below threshold ${threshold} — escalated to human review.`;
    } else {
      final = majorityVote;
      finalReason = unanimous
        ? `Unanimous verdict (${okResults.length}–0).`
        : `Majority verdict (${Math.max(flag, allow)}–${Math.min(
            flag,
            allow
          )}), confidence ${majorityConfidence.toFixed(2)} ≥ ${threshold}.`;
    }
  }

  const payload: ModerationResponse = {
    judges: results,
    tally: { flag, allow, failed },
    final,
    finalReason,
    majorityConfidence,
    threshold,
    totalLatencyMs: Date.now() - t0
  };

  return NextResponse.json(payload);
}
