import type { HiringDraft, MemoryFact, Mission, Requirement } from "../types";
import { titleCase, uid } from "./format";

export function emptyCounts(): Mission["counts"] {
  return { considered: 0, meetCore: 0, contacted: 0, interested: 0, screening: 0, ready: 0 };
}

export function buildMission(draft: Pick<HiringDraft, "role" | "location" | "headcount" | "requirements">): Mission {
  const role = draft.role ?? "Someone";
  const location = draft.location ?? "your practice";
  const now = new Date().toISOString();
  return {
    id: uid("mission"),
    title: `Hire ${titleCase(role)}`,
    role,
    location,
    headcount: draft.headcount,
    status: "searching",
    statusSentence:
      "I'm searching for people who meet your requirements. I'll interrupt you when someone is worth your attention.",
    requirements: draft.requirements,
    counts: emptyCounts(),
    activity: [
      {
        id: uid("act"),
        at: now,
        text: `Started looking for ${draft.headcount > 1 ? `${draft.headcount} ` : "a "}${role.toLowerCase()} in ${location}.`,
      },
    ],
    createdAt: now,
  };
}

export function isDentalDemo(role: string | null, location: string | null): boolean {
  return /receptionist/i.test(role ?? "") && /parramatta/i.test(location ?? "");
}

export function inferredFacts(role: string, location: string, requirements: Requirement[]): MemoryFact[] {
  const facts: MemoryFact[] = [
    {
      id: "hire-focus",
      label: "Current hire",
      value: `${titleCase(role)} in ${location}`,
      scope: "organisation",
      inferred: true,
    },
  ];
  const salary = requirements.find((item) => item.category === "salary");
  if (salary) {
    facts.push({
      id: "salary-ceiling",
      label: "Salary ceiling",
      value: salary.description,
      scope: "organisation",
      inferred: true,
    });
  }
  return facts;
}
