export type Vote = "FLAG" | "ALLOW";

export type FinalVerdict = "FLAG" | "ALLOW" | "ESCALATE";

export interface JudgeResult {
  model: string;
  ok: boolean;
  vote?: Vote;
  category?: string;
  confidence?: number; // 0..1
  reason?: string;
  latencyMs?: number;
  error?: string;
}

export interface ModerationResponse {
  judges: JudgeResult[];
  tally: { flag: number; allow: number; failed: number };
  final: FinalVerdict;
  finalReason: string;
  majorityConfidence: number | null;
  threshold: number;
  totalLatencyMs: number;
}
