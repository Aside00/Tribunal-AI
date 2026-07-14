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
  },
  {
    label: "عربي — حالة حدّية",
    text: "والله لو أشوفك قدامي كان وريتك، بس أكيد بتنجلد وتختفي مثل كل مرة 😂"
  }
];

const VERDICT_STYLE: Record<string, { cls: string; label: string }> = {
  FLAG: { cls: "border-flag text-flag", label: "FLAG" },
  ALLOW: { cls: "border-allow text-allow", label: "ALLOW" },
  ESCALATE: { cls: "border-escalate text-escalate", label: "ESCALATE" }
};

function ConfidenceBar({ value, vote }: { value: number; vote?: string }) {
  const color =
    vote === "FLAG" ? "bg-flag" : vote === "ALLOW" ? "bg-allow" : "bg-accent";
  return (
    <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-700`}
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

function VoteBadge({ vote }: { vote: string }) {
  const style =
    vote === "FLAG"
      ? "bg-flag/10 text-flag"
      : vote === "ALLOW"
      ? "bg-allow/10 text-allow"
      : "bg-escalate/10 text-escalate";
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider ${style}`}
    >
      {vote}
    </span>
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
  const verdictBorder =
    state === "revealed" && result?.ok
      ? result.vote === "FLAG"
        ? "border-flag/50"
        : "border-allow/50"
      : "border-line";
  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-card transition-colors duration-500 ${verdictBorder}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-[0.2em] text-muted">
          JUDGE {String(index + 1).padStart(2, "0")}
        </span>
        {state === "thinking" && (
          <span className="lane-pulse font-mono text-[11px] font-medium text-accent">
            deliberating…
          </span>
        )}
        {state === "revealed" && result?.ok && <VoteBadge vote={result.vote!} />}
        {state === "revealed" && result && !result.ok && (
          <VoteBadge vote="FAILED" />
        )}
      </div>

      <p className="mt-1.5 font-mono text-sm font-medium break-all">{model}</p>

      {state === "revealed" && result?.ok && (
        <div className="rise-in mt-3 space-y-2">
          <div className="flex items-center justify-between font-mono text-[11px] text-muted">
            <span>
              conf {(result.confidence ?? 0).toFixed(2)}
              {result.category && result.category !== "none"
                ? ` · ${result.category}`
                : ""}
            </span>
            <span>{result.latencyMs} ms</span>
          </div>
          <ConfidenceBar value={result.confidence ?? 0} vote={result.vote} />
          <p dir="auto" className="text-xs leading-relaxed text-muted">
            {result.reason}
          </p>
        </div>
      )}

      {state === "revealed" && result && !result.ok && (
        <p className="rise-in mt-3 text-xs text-escalate break-all">
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
  const [revealed, setRevealed] = useState(0);
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

      resp.judges.forEach((_, i) => {
        timers.current.push(setTimeout(() => setRevealed(i + 1), 250 + i * 450));
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
      {/* ── Top rule ───────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-between border-b border-line pb-3">
        <span className="font-mono text-[11px] tracking-[0.25em] text-muted">
          TRUST &amp; SAFETY CONSOLE
        </span>
        <span className="font-mono text-[11px] tracking-[0.25em] text-muted">
          FAN-OUT → AGGREGATE
        </span>
      </div>

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="mb-10">
        <p className="font-mono text-xs font-semibold tracking-[0.25em] text-accent">
          PARALLELIZATION · VOTING
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
          LLM Tribunal
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Borderline moderation calls you can&apos;t get wrong. The same post
          fans out to three independent LLM judges in parallel; a voter takes
          the majority verdict. A confidence-threshold guardrail escalates
          split, low-confidence calls to human review.
        </p>
      </header>

      {/* ── Input dock ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-line bg-card p-5 shadow-card">
        <label
          htmlFor="post"
          className="font-mono text-[11px] tracking-[0.2em] text-muted"
        >
          POST UNDER REVIEW
        </label>
        <textarea
          id="post"
          dir="auto"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          maxLength={4000}
          placeholder="Paste the post to moderate — Arabic or English…"
          className="mt-2 w-full resize-y rounded-lg border border-line bg-paper p-3 text-sm leading-relaxed outline-none transition placeholder:text-muted/60 focus:border-accent focus:bg-card"
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={run}
            disabled={!content.trim() || phase === "deliberating"}
            className="rounded-lg bg-ink px-5 py-2.5 font-display text-sm font-semibold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-35"
          >
            {phase === "deliberating"
              ? "Convening judges…"
              : "Convene the tribunal"}
          </button>
          <span className="ml-1 font-mono text-[11px] text-muted">samples:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => setContent(s.text)}
              className="rounded-full border border-line bg-card px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-accent"
            >
              {s.label}
            </button>
          ))}
        </div>
        {phase === "error" && (
          <p className="mt-3 rounded-lg border border-flag/30 bg-flag/5 p-3 text-xs text-flag">
            {errorMsg}
          </p>
        )}
      </section>

      {/* ── Pipeline ───────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.2em] text-muted">
            PIPELINE
          </span>
          <span className="h-px flex-1 bg-line" />
          {data && (
            <span className="font-mono text-[11px] text-muted">
              total {data.totalLatencyMs} ms
            </span>
          )}
        </div>

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
        <div className="mt-6 rounded-xl border border-line bg-card p-5 shadow-card md:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] tracking-[0.2em] text-muted">
                AGGREGATOR / VOTER — MAJORITY RULE
              </p>
              {data && showVerdict ? (
                <div className="rise-in mt-2">
                  <p className="font-mono text-sm font-medium">
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
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {data.finalReason}
                  </p>
                  {data.majorityConfidence !== null && (
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      majority confidence {data.majorityConfidence.toFixed(2)} ·
                      guardrail threshold {data.threshold}
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
            <div className="flex h-24 w-full items-center justify-center border-t border-dashed border-line pt-5 md:w-60 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              {data && showVerdict && verdict ? (
                <span
                  className={`stamp-in inline-block rounded-md border-4 border-double px-6 py-2 font-display text-2xl font-bold tracking-[0.15em] ${verdict.cls}`}
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
