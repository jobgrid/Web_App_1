import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareCandidates } from "./compare";
import { assessEligibility } from "./eligibility";
import { explainCandidate } from "./explain";
import { applyClarification, chooseClarifyingQuestion, extractRequirements } from "./extractRequirements";
import type { Candidate, Requirement } from "../types";

const DEMO =
  "I need a dental receptionist in Parramatta. At least two years experience, must know D4W, salary up to $75k and ideally available within three weeks.";

function category(requirements: Requirement[], name: Requirement["category"]) {
  return requirements.find((item) => item.category === name);
}

describe("requirement extraction", () => {
  it("reads the dental receptionist brief", () => {
    const result = extractRequirements(DEMO);
    assert.equal(result.role, "Dental Receptionist");
    assert.equal(result.location, "Parramatta");

    const experience = category(result.requirements, "experience");
    const software = category(result.requirements, "software");
    const salary = category(result.requirements, "salary");
    const availability = category(result.requirements, "availability");

    assert.equal(experience?.mandatory, true);
    assert.equal(experience?.value?.amount, 2);
    assert.equal(software?.mandatory, true);
    assert.match(software?.description ?? "", /D4W/);
    assert.equal(salary?.mandatory, true);
    assert.equal(salary?.mayCompromise, false);
    assert.equal(salary?.value?.amount, 75000);
    assert.equal(availability?.mandatory, false);
    assert.equal(availability?.value?.amount, 3);
  });

  it("asks how many days a week, then records the answer", () => {
    const result = extractRequirements(DEMO);
    const question = chooseClarifyingQuestion(result);
    assert.equal(question.id, "schedule");
    const next = applyClarification(result, "Four days");
    const schedule = category(next.requirements, "schedule");
    assert.equal(schedule?.description, "Four days per week");
    assert.equal(schedule?.value?.amount, 4);
  });

  it("does not ask about days when the brief already includes them", () => {
    const result = extractRequirements(
      "I need a dental receptionist in Parramatta. Four days per week. Minimum two years of experience. They need to know D4W. Ideally under $75k.",
    );
    assert.equal(category(result.requirements, "schedule")?.description, "Four days per week");
    assert.equal(category(result.requirements, "salary")?.mandatory, false);
    assert.notEqual(chooseClarifyingQuestion(result).id, "schedule");
  });
});

const sarah: Candidate = {
  id: "sarah",
  missionId: "m",
  name: "Sarah Cole",
  initials: "SC",
  role: "Dental receptionist",
  location: "Parramatta",
  availability: "Can start in 2 weeks",
  startInDays: 14,
  salaryAmount: 72000,
  salaryLabel: "$72,000",
  interest: "interested",
  fit: "strong_fit",
  experienceLabel: "4 years on a dental front desk",
  softwareLabel: "Uses D4W every day",
  workRights: "citizen",
  summary:
    "Sarah has spent four years on a dental front desk in Western Sydney. She uses D4W every day for appointments, recalls, and treatment plans, and she can start in two weeks.",
  topEvidence: "Uses D4W every day",
  evidence: [],
  concerns: [],
  history: [],
};

const michael: Candidate = {
  ...sarah,
  id: "michael",
  name: "Michael Brooks",
  initials: "MB",
  location: "Harris Park",
  availability: "Can start in 5 weeks",
  startInDays: 35,
  salaryAmount: 74000,
  salaryLabel: "$74,000",
  fit: "good_fit",
  experienceLabel: "3 years front desk, 18 months in dental",
  softwareLabel: "Some D4W, mainly Exact",
  summary: "Michael has three years at a front desk, including 18 months in dental.",
};

describe("explanations and eligibility", () => {
  const requirements = extractRequirements(DEMO).requirements;

  it("explains Sarah against the salary ceiling", () => {
    const text = explainCandidate(sarah, requirements);
    assert.match(text, /D4W every day/);
    assert.match(text, /inside your \$75,000 ceiling/);
  });

  it("says when a salary moves outside the ceiling", () => {
    const tighter = requirements.map((item) =>
      item.category === "salary" ? { ...item, value: { kind: "money" as const, amount: 60000 } } : item,
    );
    assert.match(explainCandidate(sarah, tighter), /above your \$60,000 ceiling/);
  });

  it("compares Sarah and Michael on start date and D4W", () => {
    const comparison = compareCandidates(sarah, michael, requirements);
    assert.match(comparison.lead, /Sarah can start in 2 weeks/);
    assert.match(comparison.lead, /uses D4W every day/i);
    assert.match(comparison.lead, /Michael/);
    assert.match(comparison.lead, /past the 3 weeks/);
    assert.equal(comparison.rows.length, 6);
  });

  it("rejects only on an explicit objective rule", () => {
    const missing = assessEligibility({ ...sarah, softwareLabel: "No D4W experience" }, requirements);
    assert.equal(missing.status, "not_eligible");
    assert.equal(missing.reason, "No D4W experience");

    const uncertain = assessEligibility(michael, requirements);
    assert.equal(uncertain.status, "uncertain");

    const over = assessEligibility({ ...sarah, salaryAmount: 82000 }, requirements);
    assert.equal(over.status, "not_eligible");
    assert.match(over.reason ?? "", /above \$75,000/);
  });
});
