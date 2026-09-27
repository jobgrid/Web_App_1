export type Intent =
  | { type: "why"; name: string }
  | { type: "compare" }
  | { type: "fastest" }
  | { type: "similar"; name: string }
  | { type: "meet"; name: string }
  | { type: "unknown" };

export function interpret(text: string): Intent {
  const normalised = text.trim().toLowerCase().replace(/[?.!]/g, "");
  const why = normalised.match(/^why\s+([a-z]+)/);
  if (why) return { type: "why", name: why[1] };
  if (/\bcompare\b/.test(normalised)) return { type: "compare" };
  if (/fastest|soonest|start first|who can start/.test(normalised)) return { type: "fastest" };
  const similar = normalised.match(/similar to\s+([a-z]+)/);
  if (similar) return { type: "similar", name: similar[1] };
  const meet = normalised.match(/^meet\s+([a-z]+)/);
  if (meet) return { type: "meet", name: meet[1] };
  return { type: "unknown" };
}

export function isMissionQuestion(text: string): boolean {
  return interpret(text).type !== "unknown";
}
