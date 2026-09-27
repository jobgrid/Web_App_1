import { formatMoney, uid } from "./format";
import type {
  ConsentSettings,
  MoveDraft,
  MovePending,
  MovePreference,
  Opportunity,
  OpportunityMode,
  OpportunityProfile,
  SeekerNote,
} from "../types";

export const PHYSIO_MOVE =
  "I'm a physiotherapist on $105k, and would move for $120k+, closer to home, no Saturdays.";

export const OPPORTUNITY_MODES: { id: OpportunityMode; label: string; body: string }[] = [
  { id: "not_looking", label: "Not looking", body: "I'll stay quiet." },
  { id: "quietly_listening", label: "Quietly listening", body: "I'll interrupt only when something clears what you asked for." },
  { id: "open", label: "Open", body: "I'll show you anything close, and interrupt for a strong one." },
  { id: "actively_looking", label: "Actively looking", body: "I'll move faster, and matched practices can hear that you're open." },
  { id: "available_immediately", label: "Available immediately", body: "I'll say you can start without a long notice period." },
];

const ROLE_PATTERNS: [RegExp, string][] = [
  [/physiotherapists?|physios?/i, "Physiotherapist"],
  [/dental receptionists?/i, "Dental Receptionist"],
  [/receptionists?/i, "Receptionist"],
  [/practice managers?/i, "Practice Manager"],
];

export function emptyProfile(): OpportunityProfile {
  return { role: null, currentSalary: null, minimumSalary: null, homeArea: null, preferences: [] };
}

export function defaultConsent(): ConsentSettings {
  return {
    visibility: "matched_only",
    contact: "jobgrid_only",
    identity: "withheld",
    salary: "move_range",
  };
}

function money(digits: string, suffix?: string): number {
  const amount = Number(digits.replace(/,/g, ""));
  if (/k/i.test(suffix ?? "") || amount < 1000) return amount * 1000;
  return amount;
}

function firstMoney(pattern: RegExp, text: string): number | null {
  const match = pattern.exec(text);
  if (!match) return null;
  return money(match[1], match[2]);
}

function note(role: SeekerNote["role"], text: string): SeekerNote {
  return { id: uid("note"), role, text };
}

function upsert(preferences: MovePreference[], next: MovePreference): MovePreference[] {
  const index = preferences.findIndex((item) => item.category === next.category);
  if (index < 0) return [...preferences, next];
  const copy = [...preferences];
  copy[index] = { ...copy[index], ...next, id: copy[index].id };
  return copy;
}

export function interruptLine(profile: OpportunityProfile): string {
  const parts: string[] = [];
  if (profile.role) parts.push(`a ${profile.role.toLowerCase()} role`);
  if (profile.minimumSalary) parts.push(`at ${formatMoney(profile.minimumSalary)} or more`);
  if (profile.preferences.some((item) => item.category === "commute")) parts.push("closer to home");
  if (profile.preferences.some((item) => item.category === "schedule")) parts.push("with no Saturdays");
  const extra = profile.preferences.filter((item) => item.category === "other").map((item) => item.description.toLowerCase());
  return `I'll only interrupt you for ${[...parts, ...extra].join(", ").replace(", with", " with")}.`;
}

export function readMove(text: string, prior: OpportunityProfile | null, pending: MovePending): MoveDraft {
  const profile: OpportunityProfile = prior
    ? { ...prior, preferences: prior.preferences.map((item) => ({ ...item })) }
    : emptyProfile();
  const trimmed = text.trim();

  if (pending === "role") {
    const named = ROLE_PATTERNS.find(([pattern]) => pattern.test(trimmed));
    profile.role = named?.[1] ?? (trimmed.length > 1 ? trimmed.replace(/\.$/, "") : profile.role);
  } else if (pending === "pay") {
    const floor = firstMoney(/\$?\s*(\d[\d,]*)\s*(k)?/i, trimmed);
    if (floor) profile.minimumSalary = floor;
  }

  for (const [pattern, label] of ROLE_PATTERNS) {
    if (pattern.test(trimmed)) profile.role = label;
  }

  const current = firstMoney(/(?:\bon|earning|paid|currently)\s*\$?\s*(\d[\d,]*)\s*(k)?/i, trimmed);
  if (current) profile.currentSalary = current;
  const floor = firstMoney(/(?:move for|at least|minimum of|from)\s*\$?\s*(\d[\d,]*)\s*(k)?/i, trimmed);
  if (floor) profile.minimumSalary = floor;

  if (profile.role) {
    profile.preferences = upsert(profile.preferences, {
      id: "role",
      category: "role",
      description: profile.role,
      mandatory: true,
    });
  }
  if (profile.currentSalary) {
    profile.preferences = upsert(profile.preferences, {
      id: "current",
      category: "current_salary",
      description: `On ${formatMoney(profile.currentSalary)}`,
      mandatory: false,
      amount: profile.currentSalary,
    });
  }
  if (profile.minimumSalary) {
    profile.preferences = upsert(profile.preferences, {
      id: "floor",
      category: "salary_floor",
      description: `${formatMoney(profile.minimumSalary)} or more`,
      mandatory: true,
      amount: profile.minimumSalary,
    });
  }
  if (/closer to home|shorter commute|nearer to home/i.test(trimmed)) {
    profile.preferences = upsert(profile.preferences, {
      id: "commute",
      category: "commute",
      description: "Closer to home",
      mandatory: true,
    });
  }
  if (/no saturdays|without saturdays|not on saturdays|saturdays off/i.test(trimmed)) {
    profile.preferences = upsert(profile.preferences, {
      id: "saturdays",
      category: "schedule",
      description: "No Saturdays",
      mandatory: true,
    });
  }
  if (/no on-?call/i.test(trimmed)) {
    profile.preferences = upsert(profile.preferences, {
      id: "oncall",
      category: "other",
      description: "No on-call",
      mandatory: true,
    });
  }

  let nextPending: MovePending = null;
  let question: string | null = null;
  let choices: { id: string; label: string }[] = [];
  if (!profile.role) {
    nextPending = "role";
    question = "What do you do now?";
    choices = [
      { id: "physio", label: "Physiotherapist" },
      { id: "manager", label: "Practice manager" },
    ];
  } else if (!profile.minimumSalary) {
    nextPending = "pay";
    question = "What pay would make you move?";
    choices = [
      { id: "120", label: "$120,000 or more" },
      { id: "110", label: "$110,000 or more" },
    ];
  }

  const ready = Boolean(profile.role && profile.minimumSalary);
  const confirm = ready ? interruptLine(profile) : question ?? "Tell me what would make you move.";
  const notes = [note("candidate", trimmed), note("jobgrid", confirm)];
  return { notes, profile, ready, pending: nextPending, question, choices };
}

export function isPhysioMove(profile: OpportunityProfile): boolean {
  return /physio/i.test(profile.role ?? "") && (profile.minimumSalary ?? 0) >= 120000 && (profile.minimumSalary ?? 0) <= 132000;
}

export function stillFits(profile: OpportunityProfile, opportunity: Opportunity): boolean {
  if (profile.minimumSalary != null && opportunity.salaryMax < profile.minimumSalary) return false;
  const saturdays = profile.preferences.find((item) => item.category === "schedule");
  if (saturdays?.mandatory && !/no saturday/i.test(opportunity.schedule)) return false;
  if (profile.role && !new RegExp(profile.role, "i").test(opportunity.role)) return false;
  return true;
}

export function whyOpportunity(profile: OpportunityProfile, opportunity: Opportunity): string {
  const sentences = [
    `${opportunity.practice} is a ${opportunity.role.toLowerCase()} role in ${opportunity.location}.`,
  ];
  if (profile.minimumSalary) {
    sentences.push(
      `${opportunity.salaryLabel} sits above the ${formatMoney(profile.minimumSalary)} that would make you move.`,
    );
  }
  if (profile.preferences.some((item) => item.category === "schedule")) {
    sentences.push(`${opportunity.schedule}, on a ${opportunity.week}.`);
  }
  if (profile.preferences.some((item) => item.category === "commute")) {
    sentences.push(`The commute is ${opportunity.commuteMinutes} minutes, which is the closer-to-home rule you set.`);
  }
  sentences.push("This comes from what you already told me. There is no application to fill in.");
  return sentences.join(" ");
}

export function commuteReply(area: string): string {
  if (/lane cove/i.test(area)) {
    return "Lane Cove to Northside Physio is the 14-minute commute on the card.";
  }
  return `I don't have a measured commute from ${area}. The role is listed at 14 minutes from Lane Cove. I can still pass on your interest.`;
}

export function disclosureLine(consent: ConsentSettings, profile: OpportunityProfile, name: string): string {
  const who =
    consent.identity === "full_name"
      ? `I'll introduce you as ${name}`
      : consent.identity === "first_name"
        ? `I'll introduce you as ${name.split(" ")[0]}`
        : "I'll introduce you without your name";
  const pay =
    consent.salary === "exact" && profile.currentSalary
      ? `and share your current ${formatMoney(profile.currentSalary)}`
      : consent.salary === "move_range" && profile.minimumSalary
        ? `and share that you'd move from ${formatMoney(profile.minimumSalary)}`
        : "and I won't share your pay";
  const contact = consent.contact === "jobgrid_only" ? "Only JobGrid will contact you." : "The practice can reply through JobGrid.";
  const visibility =
    consent.visibility === "hidden"
      ? "You are hidden, so I will not send this."
      : consent.visibility === "open"
        ? "You are visible beyond this one match."
        : "Only this matched practice sees the introduction.";
  return `${who}, ${pay}. ${contact} ${visibility}`;
}

export function knownLine(profile: OpportunityProfile): string {
  const bits: string[] = [];
  if (profile.role) bits.push(`you're a ${profile.role.toLowerCase()}`);
  if (profile.currentSalary) bits.push(`on ${formatMoney(profile.currentSalary)}`);
  if (profile.minimumSalary) bits.push(`you'd move from ${formatMoney(profile.minimumSalary)}`);
  const rules: string[] = [];
  if (profile.preferences.some((item) => item.category === "schedule")) rules.push("Saturdays are out");
  if (profile.preferences.some((item) => item.category === "commute")) rules.push("it has to be closer to home");
  const rulesText = rules.length ? ` ${rules.join(", and ")}.` : "";
  return `I already know ${bits.join(", ")}.${rulesText} I don't need an application.`;
}

export function answerSeeker(text: string, profile: OpportunityProfile, opportunity: Opportunity): string {
  if (/why|fit|match|saturday|commute|pay|salary|day/i.test(text)) return whyOpportunity(profile, opportunity);
  if (/apply|application|form|cv|resume/i.test(text)) {
    return "No application. I reuse what you already told me, and I only ask when something is missing.";
  }
  return "I can explain the pay, the Saturdays, or the commute. I won't send you a form.";
}

export function modeBody(mode: OpportunityMode): string {
  return OPPORTUNITY_MODES.find((item) => item.id === mode)?.body ?? "";
}
