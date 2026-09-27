import type { Candidate, Requirement } from "../types";
import { formatMoney } from "./format";

export interface Eligibility {
  status: "eligible" | "not_eligible" | "uncertain";
  reason?: string;
}

export function assessEligibility(
  candidate: Pick<Candidate, "salaryAmount" | "softwareLabel" | "workRights" | "declined" | "location">,
  requirements: Requirement[],
): Eligibility {
  if (candidate.declined) {
    return { status: "not_eligible", reason: "They declined" };
  }

  const software = requirements.find((item) => item.category === "software" && item.mandatory);
  if (software && /d4w/i.test(software.description)) {
    if (/no d4w|without d4w|does not know d4w/i.test(candidate.softwareLabel)) {
      return { status: "not_eligible", reason: "No D4W experience" };
    }
    if (/some|familiar|uncertain/i.test(candidate.softwareLabel)) {
      return { status: "uncertain" };
    }
  }

  const salary = requirements.find((item) => item.category === "salary" && item.mandatory && !item.mayCompromise);
  const cap = salary?.value?.kind === "money" ? salary.value.amount : undefined;
  if (cap != null && candidate.salaryAmount > cap) {
    return { status: "not_eligible", reason: `Salary expectation is above ${formatMoney(cap)}` };
  }

  if (candidate.workRights === "none") {
    return { status: "not_eligible", reason: "No work rights for this role" };
  }

  const place = requirements.find((item) => item.category === "location" && item.mandatory && !item.mayCompromise);
  if (place && /impossible/i.test(candidate.location)) {
    return { status: "not_eligible", reason: `Cannot work in ${place.description}` };
  }

  return { status: "eligible" };
}
