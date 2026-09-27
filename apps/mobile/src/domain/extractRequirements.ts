import type {
  ClarifyingQuestion,
  Extraction,
  Requirement,
  RequirementCategory,
} from "../types";
import { formatMoney, titleCase } from "./format";

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const PLACES = [
  "Parramatta",
  "Brisbane",
  "Sydney",
  "Melbourne",
  "Perth",
  "Adelaide",
  "Canberra",
  "Gold Coast",
  "Newcastle",
  "Wollongong",
  "Hobart",
  "Darwin",
  "Westmead",
  "Harris Park",
];

const ROLE_PATTERNS: RegExp[] = [
  /dental receptionists?/i,
  /practice managers?/i,
  /senior react developers?/i,
  /physiotherapists?/i,
  /receptionists?/i,
  /react developers?/i,
];

function singularRole(match: string): string {
  const lower = match.toLowerCase();
  const singular = lower.endsWith("s") && !lower.endsWith("ss") ? lower.slice(0, -1) : lower;
  return titleCase(singular);
}

function wordNumber(token: string): number | null {
  const named = NUMBER_WORDS[token.toLowerCase()];
  if (named) return named;
  const numeric = Number(token);
  return Number.isFinite(numeric) ? numeric : null;
}

function moneyAmount(raw: string): number | null {
  const match = raw.match(/\$\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(\s*k)?/i);
  if (!match) return null;
  let amount = Number(match[1].replace(/,/g, ""));
  if (match[2]) amount *= 1000;
  if (amount < 1000) amount *= 1000;
  return amount;
}

function requirement(partial: Omit<Requirement, "evidenceSources" | "confidence" | "verification" | "importance"> & {
  evidenceSources?: string[];
  confidence?: number;
  importance?: number;
}): Requirement {
  return {
    evidenceSources: partial.evidenceSources ?? ["employer"],
    confidence: partial.confidence ?? 0.9,
    verification: "stated",
    importance: partial.importance ?? (partial.mandatory ? 1 : 3),
    ...partial,
  };
}

function preferredNear(text: string, index: number): boolean {
  const window = text.slice(Math.max(0, index - 28), index + 12).toLowerCase();
  return /ideally|preferably|nice to|would be nice|if possible/.test(window);
}

export function extractRequirements(text: string): Extraction {
  const requirements: Requirement[] = [];
  const similar = text.match(/similar to\s+([A-Za-z]+)/i);
  const roleMatch = ROLE_PATTERNS.map((pattern) => text.match(pattern)).find(Boolean);
  const cleanedRole = roleMatch ? singularRole(roleMatch[0]) : null;

  let location: string | null = null;
  for (const place of PLACES) {
    if (new RegExp(`\\b${place}\\b`, "i").test(text)) {
      location = place;
      break;
    }
  }

  const countMatch = text.match(/\b(one|two|three|four|five|\d+)\s+(?:physiotherapists|receptionists|developers|people)\b/i);
  const headcount = countMatch ? wordNumber(countMatch[1]) ?? 1 : 1;

  if (cleanedRole) {
    requirements.push(
      requirement({
        id: "role",
        description: cleanedRole,
        category: "other",
        priority: "critical",
        mandatory: true,
        flexibility: "some",
        mayCompromise: false,
      }),
    );
  }

  if (location) {
    requirements.push(
      requirement({
        id: "location",
        description: location,
        category: "location",
        priority: "critical",
        mandatory: true,
        flexibility: "some",
        mayCompromise: false,
      }),
    );
  }

  const experience = text.match(
    /(?:at least|minimum|min\.?)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+years?/i,
  );
  if (experience) {
    const years = wordNumber(experience[1]) ?? 0;
    requirements.push(
      requirement({
        id: "experience",
        description: `At least ${years} ${years === 1 ? "year" : "years"} of experience`,
        category: "experience",
        priority: "high",
        mandatory: true,
        flexibility: "some",
        mayCompromise: false,
        value: { kind: "years", amount: years },
      }),
    );
  }

  const software = text.match(
    /(?:must know|need to know|needs to know|know)\s+([A-Za-z][A-Za-z0-9.+#-]{1,16})/i,
  );
  if (software) {
    const name = software[1].replace(/[.,]$/, "");
    const display = /^d4w$/i.test(name) ? "D4W" : name;
    const must = /must know|need to know|needs to know/i.test(software[0]);
    requirements.push(
      requirement({
        id: "software",
        description: must ? `Must know ${display}` : `Knows ${display}`,
        category: "software",
        priority: must ? "critical" : "high",
        mandatory: must,
        flexibility: must ? "fixed" : "some",
        mayCompromise: !must,
      }),
    );
  }

  const salary = text.match(
    /(ideally\s+|preferably\s+)?(?:salary\s+)?(up to|under|cannot exceed|no more than|maximum)\s+(\$\s*[\d,]+k?)/i,
  );
  if (salary) {
    const amount = moneyAmount(salary[3]);
    if (amount) {
      const soft = Boolean(salary[1]) || preferredNear(text, salary.index ?? 0);
      const hardCap = /up to|cannot exceed|no more than|maximum/i.test(salary[2]);
      requirements.push(
        requirement({
          id: "salary",
          description: `Salary up to ${formatMoney(amount)}`,
          category: "salary",
          priority: soft ? "medium" : "critical",
          mandatory: !soft,
          flexibility: soft ? "some" : "fixed",
          mayCompromise: soft || !hardCap,
          value: { kind: "money", amount },
        }),
      );
    }
  }

  const availability = text.match(
    /(?:available|start(?:ing)?)\s+within\s+(?:the\s+next\s+)?(one|two|three|four|five|six|\d+)\s+weeks?/i,
  );
  const withinMonth = /within the next month/i.test(text);
  if (availability) {
    const weeks = wordNumber(availability[1]) ?? 0;
    const soft = preferredNear(text, availability.index ?? 0);
    requirements.push(
      requirement({
        id: "availability",
        description: `Available within ${weeks} ${weeks === 1 ? "week" : "weeks"}`,
        category: "availability",
        priority: soft ? "medium" : "high",
        mandatory: !soft,
        flexibility: soft ? "some" : "fixed",
        mayCompromise: soft,
        value: { kind: "weeks", amount: weeks },
      }),
    );
  } else if (withinMonth) {
    requirements.push(
      requirement({
        id: "availability",
        description: "Available within a month",
        category: "availability",
        priority: "medium",
        mandatory: false,
        flexibility: "some",
        mayCompromise: true,
        value: { kind: "weeks", amount: 4 },
      }),
    );
  }

  if (/\b(four|4)\s+days?\b/i.test(text)) {
    requirements.push(scheduleRequirement("Four days per week", 4));
  } else if (/\bfull[- ]?time\b/i.test(text)) {
    requirements.push(employmentRequirement("Full time"));
  } else if (/\bpart[- ]?time\b/i.test(text)) {
    requirements.push(employmentRequirement("Part time"));
  }

  return {
    role: cleanedRole,
    location,
    headcount,
    similarTo: similar ? titleCase(similar[1]) : null,
    requirements,
  };
}

function scheduleRequirement(description: string, days: number): Requirement {
  return requirement({
    id: "schedule",
    description,
    category: "schedule",
    priority: "high",
    mandatory: true,
    flexibility: "some",
    mayCompromise: true,
    value: { kind: "days", amount: days },
  });
}

function employmentRequirement(description: string): Requirement {
  return requirement({
    id: "employment_type",
    description,
    category: "employment_type",
    priority: "high",
    mandatory: true,
    flexibility: "some",
    mayCompromise: true,
  });
}

export function mergeRequirements(current: Requirement[], incoming: Requirement[]): Requirement[] {
  const next = [...current];
  for (const item of incoming) {
    const index = next.findIndex((existing) => existing.category === item.category);
    if (index >= 0) next[index] = { ...item, id: next[index].id };
    else next.push(item);
  }
  return next;
}

function upsert(requirements: Requirement[], item: Requirement): Requirement[] {
  return mergeRequirements(requirements, [item]);
}

export function chooseClarifyingQuestion(extraction: Pick<Extraction, "role" | "location" | "requirements">): ClarifyingQuestion {
  const has = (category: RequirementCategory) => extraction.requirements.some((item) => item.category === category);

  if (!extraction.role) {
    return {
      id: "role",
      prompt: "What role should I hire for?",
      choices: [
        { id: "role-receptionist", label: "Dental receptionist" },
        { id: "role-manager", label: "Practice manager" },
      ],
    };
  }

  if (!extraction.location) {
    return {
      id: "location",
      prompt: "Where should they be based?",
      choices: [
        { id: "loc-parramatta", label: "Parramatta" },
        { id: "loc-sydney", label: "Sydney" },
      ],
    };
  }

  if (!has("schedule") && !has("employment_type")) {
    return {
      id: "schedule",
      prompt: "How many days a week should they work?",
      choices: [
        { id: "four-days", label: "Four days" },
        { id: "full-time", label: "Full time" },
      ],
    };
  }

  if (!has("salary")) {
    return {
      id: "salary",
      prompt: "What salary should I stay under?",
      choices: [
        { id: "sal-70", label: "Up to $70k" },
        { id: "sal-75", label: "Up to $75k" },
        { id: "sal-90", label: "Up to $90k" },
      ],
    };
  }

  if (!has("experience")) {
    return {
      id: "experience",
      prompt: "How much experience do you need?",
      choices: [
        { id: "exp-1", label: "At least 1 year" },
        { id: "exp-2", label: "At least 2 years" },
      ],
    };
  }

  return {
    id: "site",
    prompt: `Should I look only around ${extraction.location}?`,
    choices: [
      { id: "site-yes", label: `Yes, ${extraction.location}` },
      { id: "site-wider", label: "The wider area is fine" },
    ],
  };
}

export function applyClarification(
  current: Pick<Extraction, "role" | "location" | "requirements" | "headcount">,
  answer: string,
): Extraction {
  const extracted = extractRequirements(answer);
  let requirements = mergeRequirements(current.requirements, extracted.requirements);
  const normalised = answer.trim().toLowerCase();

  if (normalised === "four days" || /\b(four|4)\s+days?\b/i.test(answer)) {
    requirements = upsert(requirements, scheduleRequirement("Four days per week", 4));
  }
  if (normalised === "full time" || /\bfull[- ]?time\b/i.test(answer)) {
    requirements = upsert(requirements, employmentRequirement("Full time"));
  }
  if (normalised === "dental receptionist") {
    requirements = upsert(
      requirements,
      requirement({
        id: "role",
        description: "Dental Receptionist",
        category: "other",
        priority: "critical",
        mandatory: true,
        flexibility: "some",
        mayCompromise: false,
      }),
    );
  }
  if (/^parramatta$/i.test(answer) || normalised === "parramatta") {
    requirements = upsert(
      requirements,
      requirement({
        id: "location",
        description: "Parramatta",
        category: "location",
        priority: "critical",
        mandatory: true,
        flexibility: "some",
        mayCompromise: false,
      }),
    );
  }
  const salaryChoice = answer.match(/up to\s+(\$\s*[\d,]+k?)/i);
  if (salaryChoice) {
    const amount = moneyAmount(salaryChoice[1]);
    if (amount) {
      requirements = upsert(
        requirements,
        requirement({
          id: "salary",
          description: `Salary up to ${formatMoney(amount)}`,
          category: "salary",
          priority: "critical",
          mandatory: true,
          flexibility: "fixed",
          mayCompromise: false,
          value: { kind: "money", amount },
        }),
      );
    }
  }
  if (/at least 1 year/i.test(answer)) {
    requirements = upsert(
      requirements,
      requirement({
        id: "experience",
        description: "At least 1 year of experience",
        category: "experience",
        priority: "high",
        mandatory: true,
        flexibility: "some",
        mayCompromise: false,
        value: { kind: "years", amount: 1 },
      }),
    );
  }
  if (/at least 2 years/i.test(answer)) {
    requirements = upsert(
      requirements,
      requirement({
        id: "experience",
        description: "At least 2 years of experience",
        category: "experience",
        priority: "high",
        mandatory: true,
        flexibility: "some",
        mayCompromise: false,
        value: { kind: "years", amount: 2 },
      }),
    );
  }
  if (/wider area/i.test(answer) && current.location) {
    requirements = upsert(
      requirements,
      requirement({
        id: "commute",
        description: `Wider area around ${current.location} is fine`,
        category: "commute",
        priority: "medium",
        mandatory: false,
        flexibility: "open",
        mayCompromise: true,
      }),
    );
  }

  const roleRequirement = requirements.find((item) => item.id === "role" || item.category === "other");
  const locationRequirement = requirements.find((item) => item.category === "location");

  return {
    role: extracted.role ?? current.role ?? roleRequirement?.description ?? null,
    location: extracted.location ?? current.location ?? locationRequirement?.description ?? null,
    headcount: extracted.headcount > 1 ? extracted.headcount : current.headcount,
    similarTo: extracted.similarTo,
    requirements,
  };
}

export function setRequirementMandatory(requirements: Requirement[], id: string, mandatory: boolean): Requirement[] {
  return requirements.map((item) =>
    item.id === id
      ? {
          ...item,
          mandatory,
          mayCompromise: mandatory ? item.mayCompromise : true,
          priority: mandatory ? item.priority : "medium",
          flexibility: mandatory ? item.flexibility : "some",
        }
      : item,
  );
}

export function setSalaryCeiling(requirements: Requirement[], amount: number): Requirement[] {
  return requirements.map((item) =>
    item.category === "salary"
      ? {
          ...item,
          description: `Salary up to ${formatMoney(amount)}`,
          value: { kind: "money", amount },
          mandatory: true,
          mayCompromise: false,
          flexibility: "fixed",
          priority: "critical",
        }
      : item,
  );
}
