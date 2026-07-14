"use client";

import { useRef, useState } from "react";
import type { JudgeResult, ModerationResponse } from "@/lib/types";

type Phase = "idle" | "deliberating" | "done" | "error";

const SAMPLES: { label: string; text: string }[] = [
  {
    label: "Borderline sarcasm",
    text: "Wow, another genius take from you. Truly the smartest person to ever hold a keyboard. 🙄"
  },
  {
    label: "News quote",
    text: 'The report states: "the militia threatened to burn the village down" — residents fled overnight.'
  },
  {
    label: "Targeted abuse",
    text: "People like you don't deserve to be on this platform. Go crawl back to whatever hole you came from."
  }
];

const VERDICT_STYLE: Record<
  string,
  { text: string; ring: string; label: string }
> = {
  FLAG: { text: "text-flag", ring: "border-flag", label: "FLAGGED" },
  ALLOW: { text: "text-allow", ring: "border-allow", label: "APPROVED" },
  ESCALATE: {
    text: "text-escalate",
    ring: "border-escalate",
    label: "ESCALATE"
  }
};

function ConfidenceBar({ value, vote }: { value: number; vote?: string }) {
  const color =
    vote === "FLAG" ? "bg-flag" : vote === "ALLOW" ? "bg-allow" : "bg-signal";
  return (
    <div className="h-1 w-full rounded-full bg-line/60 overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-700`}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

function JudgeCard({
  index,
  model,
  state,
  result
}: {
  index: number;
  model: string;
  state: "idle" | "thinking" | "revealed";
  result?: JudgeResult;
}) {
  return (
    <div
      className={`relative rounded-lg border bg-panel p-4 transition-colors duration-500 ${
        state === "revealed" && result?.ok
          ? result.vote === "FLAG"
            ? "border-flag/50"
            : "border-allow/50"
          : "border-line"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-widest text-muted">
          JUDGE {String(index + 1).padStart(2, "0")}
        </span>
        {state === "thinking" && (
          <span className="lane-pulse font-mono text-[11px] text-signal">
            deliberating…
          </span>
        )}
        {state === "revealed" && result?.ok && (
          <span
            className={`font-mono text-xs font-semibold ${
              result.vote === "FLAG" ? "text-flag" : "text-allow"
            }`}
          >
            {result.vote}
          </span>
        )}
        {state === "revealed" && result && !result.ok && (
          <span className="font-mono text-xs text-escalate">FAILED</span>
        )}
      </div>

      <p className="mt-1 font-display text-sm font-medium break-all">
        {model}
      </p>

      {state === "revealed" && result?.ok && (
        <div className="rise-in mt-3 space-y-2">
          <div className="flex items-center justify-between font-mono text-[11px] text-muted">
            <span>
              confidence {(result.confidence ?? 0).toFixed(2)}
              {result.category && result.category !== "none"
                ? ` · ${result.category}`
                : ""}
            </span>
            <span>{result.latencyMs} ms</span>
          </div>
          <ConfidenceBar value={result.confidence ?? 0} vote={result.vote} />
          <p className="text-xs leading-relaxed text-muted">{result.reason}</p>
        </div>
      )}

      {state === "revealed" && result && !result.ok && (
        <p className="rise-in mt-3 text-xs text-escalate/90 break-all">
          {result.error}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const [content, setContent] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [data, setData] = useState<ModerationResponse | null>(null);
  const [revealed, setRevealed] = useState(0); // how many judge cards revealed
  const [showVerdict, setShowVerdict] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const judgeModels = data?.judges.map((j) => j.model) ?? [
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-haiku",
    "google/gemini-2.0-flash-001"
  ];

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  async function run() {
    if (!content.trim() || phase === "deliberating") return;
    clearTimers();
    setPhase("deliberating");
    setData(null);
    setRevealed(0);
    setShowVerdict(false);
    setErrorMsg("");

    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      const resp = json as ModerationResponse;
      setData(resp);

      // staggered reveal: judge 1 → 2 → 3 → verdict stamp
      resp.judges.forEach((_, i) => {
        timers.current.push(
          setTimeout(() => setRevealed(i + 1), 250 + i * 450)
        );
      });
      timers.current.push(
        setTimeout(() => {
          setShowVerdict(true);
          setPhase("done");
        }, 250 + resp.judges.length * 450 + 350)
      );
    } catch (err: any) {
      setErrorMsg(String(err?.message ?? err));
      setPhase("error");
    }
  }

  const verdict = data ? VERDICT_STYLE[data.final] : null;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 md:py-14">
      {/* ── Header ─────────────────────────────────────────────── */}
      
<header className="mb-14">
  <p className="font-mono text-[11px] tracking-[0.4em] text-[#8B6A4A]">DIGITAL COURT • CONSENSUS ENGINE</p>
  <h1 className="mt-3 font-display text-5xl font-bold text-[#E8DFC8]">Tribunal AI</h1>
  <p className="mt-5 max-w-3xl leading-8 text-[#B8AA99]">
    Three independent AI judges deliberate every case before a consensus engine issues a trusted verdict.
  </p>
</header>


      {/* ── Input dock ─────────────────────────────────────────── */}
      <section className="rounded-lg border border-line bg-panel2 p-4">
        <label
          htmlFor="post"
          className="font-mono text-[11px] tracking-widest text-muted"
        >
          CASE FILE
        </label>
        <textarea
          id="post"
          dir="auto"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Submit evidence, testimony, or online content for judicial review..."
          className="mt-2 w-full resize-y rounded-md border border-line bg-ink p-3 text-sm leading-relaxed outline-none placeholder:text-muted/60 focus:border-signal"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={run}
            disabled={!content.trim() || phase === "deliberating"}
            className="rounded-md bg-signal px-5 py-2 font-display text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase === "deliberating" ? "Court in Session..." : "Begin Deliberation"}
          </button>
          <span className="font-mono text-[11px] text-muted">samples:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => setContent(s.text)}
              className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-muted transition hover:border-signal hover:text-signal"
            >
              {s.label}
            </button>
          ))}
        </div>
        {phase === "error" && (
          <p className="mt-3 rounded-md border border-flag/40 bg-flag/10 p-3 text-xs text-flag">
            {errorMsg}
          </p>
        )}
      </section>

      {/* ── Pipeline ───────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-widest text-muted">
            COURT PROCEEDINGS
          </span>
          <span className="h-px flex-1 bg-line" />
          {data && (
            <span className="font-mono text-[11px] text-muted">
              total {data.totalLatencyMs} ms
            </span>
          )}
        </div>

        {/* fan-out lanes */}
        <div className="grid gap-4 md:grid-cols-3">
          {judgeModels.map((m, i) => (
            <JudgeCard
              key={m + i}
              index={i}
              model={m}
              state={
                phase === "deliberating" || (data && revealed <= i)
                  ? phase === "idle"
                    ? "idle"
                    : "thinking"
                  : data && revealed > i
                  ? "revealed"
                  : "idle"
              }
              result={data?.judges[i]}
            />
          ))}
        </div>

        {/* voter / verdict */}
        <div className="mt-6 rounded-lg border border-line bg-panel p-5 md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-widest text-muted">
                CONSENSUS CHAMBER
              </p>
              {data && showVerdict ? (
                <div className="rise-in mt-2">
                  <p className="font-mono text-sm">
                    <span className="text-flag">FLAG {data.tally.flag}</span>
                    <span className="text-muted"> · </span>
                    <span className="text-allow">ALLOW {data.tally.allow}</span>
                    {data.tally.failed > 0 && (
                      <>
                        <span className="text-muted"> · </span>
                        <span className="text-escalate">
                          FAILED {data.tally.failed}
                        </span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {data.finalReason}
                  </p>
                  {data.majorityConfidence !== null && (
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      majority confidence{" "}
                      {data.majorityConfidence.toFixed(2)} · guardrail
                      threshold {data.threshold}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted">
                  {phase === "deliberating"
                    ? "Counting votes…"
                    : "Awaiting a case."}
                </p>
              )}
            </div>

            {/* the stamp */}
            <div className="flex h-24 w-full items-center justify-center md:w-56">
              {data && showVerdict && verdict ? (
                <span
                  className={`stamp-in inline-block rounded-md border-4 px-6 py-2 font-display text-2xl font-bold tracking-widest ${verdict.ring} ${verdict.text}`}
                >
                  {verdict.label}
                </span>
              ) : (
                <span className="font-mono text-[11px] text-muted/50">
                  — verdict —
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-12 border-t border-line pt-4">
        <p className="font-mono text-[11px] text-muted">
          pattern: parallelization / voting · components: parallel LLM calls ·
          aggregator/voter · threshold guardrail
        </p>
      </footer>
    </main>
  );
}
