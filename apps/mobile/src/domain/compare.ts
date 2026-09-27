import type { Candidate, Requirement } from "../types";
import { firstName, weeksPhrase } from "./format";

export interface ComparisonRow {
  label: string;
  values: [string, string];
}

export interface Comparison {
  lead: string;
  rows: ComparisonRow[];
}

export function compareCandidates(a: Candidate, b: Candidate, requirements: Requirement[]): Comparison {
  const [sooner, later] = a.startInDays <= b.startInDays ? [a, b] : [b, a];
  const availability = requirements.find((item) => item.category === "availability");
  const preferredWeeks = availability?.value?.kind === "weeks" ? availability.value.amount : undefined;
  const laterWeeks = Math.round(later.startInDays / 7);
  const softwareEdge = /every day|daily/i.test(sooner.softwareLabel);
  const late =
    preferredWeeks != null && laterWeeks > preferredWeeks
      ? `, past the ${preferredWeeks} weeks you preferred`
      : "";

  const lead = `${firstName(sooner.name)} can start in ${weeksPhrase(sooner.startInDays)}${
    softwareEdge ? ` and ${sooner.softwareLabel.charAt(0).toLowerCase()}${sooner.softwareLabel.slice(1)}` : ""
  }. ${firstName(later.name)} is close on experience and salary, and can start in ${weeksPhrase(later.startInDays)}${late}.`;

  const rows: ComparisonRow[] = [
    { label: "Experience", values: [a.experienceLabel, b.experienceLabel] },
    { label: "Software", values: [a.softwareLabel, b.softwareLabel] },
    { label: "Can start", values: [a.availability, b.availability] },
    { label: "Salary", values: [a.salaryLabel, b.salaryLabel] },
    { label: "Location", values: [a.location, b.location] },
    {
      label: "Interest",
      values: [a.interest === "interested" ? "Interested" : "Not confirmed", b.interest === "interested" ? "Interested" : "Not confirmed"],
    },
  ];

  return { lead, rows };
}
