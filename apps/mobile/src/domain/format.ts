import type { EvidenceSource, FitLabel, MissionStatus } from "../types";

export function titleCase(value: string): string {
  return value.replace(/\w\S*/g, (word) => {
    if (/^d4w$/i.test(word)) return "D4W";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

export function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString("en-AU")}`;
}

export function weeksPhrase(days: number): string {
  const weeks = Math.max(1, Math.round(days / 7));
  return weeks === 1 ? "1 week" : `${weeks} weeks`;
}

export function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export function fitLabel(fit: FitLabel): string {
  switch (fit) {
    case "strong_fit":
      return "Strong fit";
    case "good_fit":
      return "Good fit";
    case "possible_fit":
      return "Possible fit";
    case "insufficient_evidence":
      return "Insufficient evidence";
    case "not_eligible":
      return "Not eligible";
  }
}

export function sourceLabel(source: EvidenceSource): string {
  switch (source) {
    case "profile":
      return "Profile";
    case "cv":
      return "CV";
    case "prior_application":
      return "Earlier conversation";
    case "verified_answer":
      return "Answered";
    case "direct_question":
      return "Asked directly";
    case "interview":
      return "Interview";
    case "credential":
      return "Credential";
    case "reference":
      return "Reference";
  }
}

export function workingLabel(status: MissionStatus): string {
  switch (status) {
    case "interviewing":
      return "Interviewing";
    case "needs_decision":
    case "candidates_ready":
      return "Needs your decision";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    case "offer":
      return "Offer stage";
    case "draft":
    case "understanding":
      return "Understanding";
    default:
      return "Working";
  }
}

export function interestLabel(interest: "interested" | "quietly_listening" | "unsure"): string {
  switch (interest) {
    case "interested":
      return "Interested";
    case "quietly_listening":
      return "Quietly listening";
    case "unsure":
      return "Not sure yet";
  }
}

let seq = 0;

export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}
