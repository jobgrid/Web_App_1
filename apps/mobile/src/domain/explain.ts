import type { Candidate, Requirement } from "../types";
import { firstName, formatMoney, weeksPhrase } from "./format";

export function explainCandidate(candidate: Candidate, requirements: Requirement[]): string {
  const sentences = [candidate.summary];
  const salary = requirements.find((item) => item.category === "salary");
  const cap = salary?.value?.kind === "money" ? salary.value.amount : undefined;
  if (cap != null) {
    sentences.push(
      candidate.salaryAmount <= cap
        ? `The ${candidate.salaryLabel} expectation sits inside your ${formatMoney(cap)} ceiling.`
        : `The ${candidate.salaryLabel} expectation is above your ${formatMoney(cap)} ceiling.`,
    );
  }

  const availability = requirements.find((item) => item.category === "availability");
  const preferredWeeks = availability?.value?.kind === "weeks" ? availability.value.amount : undefined;
  if (preferredWeeks != null && candidate.startInDays > preferredWeeks * 7) {
    sentences.push(`That start is later than the ${preferredWeeks} weeks you preferred.`);
  }

  return sentences.join(" ");
}

export function similarHiringNote(candidate: Candidate): string {
  return `${firstName(candidate.name)} is a useful reference for the work, not a person to copy. I would look for about ${candidate.experienceLabel.toLowerCase()}, ${candidate.softwareLabel.toLowerCase()}, a start around ${weeksPhrase(candidate.startInDays)}, pay near ${candidate.salaryLabel}, and someone who can work around ${candidate.location}. I will not use age, gender, background, or anything else that is not part of the job.`;
}
