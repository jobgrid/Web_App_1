import type { Candidate } from "../../types";

export function sarahCole(missionId: string): Candidate {
  return {
    id: `${missionId}_sarah`,
    missionId,
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
    topEvidence: "Uses D4W every day · 4 years in dental",
    evidence: [
      {
        id: "sarah-exp",
        statement: "Four years as a dental receptionist at Westmead Family Dental.",
        source: "profile",
        recency: "Current role",
      },
      {
        id: "sarah-d4w",
        statement: "Uses D4W every day for appointments, recalls, and treatment plans.",
        source: "profile",
        recency: "Current role",
      },
      {
        id: "sarah-start",
        statement: "Can start in two weeks.",
        source: "verified_answer",
        recency: "This week",
      },
      {
        id: "sarah-salary",
        statement: "Expects $72,000.",
        source: "verified_answer",
        recency: "This week",
      },
      {
        id: "sarah-days",
        statement: "Happy to work four days a week.",
        source: "verified_answer",
        recency: "This week",
      },
      {
        id: "sarah-rights",
        statement: "Australian citizen, with full work rights.",
        source: "profile",
        recency: "On profile",
      },
    ],
    concerns: [{ id: "sarah-saturday", text: "Saturday shifts are not confirmed." }],
    history: [
      { title: "Dental receptionist", place: "Westmead Family Dental", period: "2022 — now" },
      { title: "Receptionist", place: "Parramatta Medical", period: "2020 — 2022" },
    ],
  };
}

export function michaelBrooks(missionId: string): Candidate {
  return {
    id: `${missionId}_michael`,
    missionId,
    name: "Michael Brooks",
    initials: "MB",
    role: "Dental receptionist",
    location: "Harris Park",
    availability: "Can start in 5 weeks",
    startInDays: 35,
    salaryAmount: 74000,
    salaryLabel: "$74,000",
    interest: "interested",
    fit: "good_fit",
    experienceLabel: "3 years front desk, 18 months in dental",
    softwareLabel: "Some D4W, mainly Exact",
    workRights: "citizen",
    summary:
      "Michael has three years at a front desk, including 18 months in a dental practice. He knows Exact well and some D4W, so the software is familiar rather than daily. He can start in five weeks.",
    topEvidence: "18 months in dental · some D4W",
    evidence: [
      {
        id: "michael-exp",
        statement: "Three years on a front desk, including 18 months in dental.",
        source: "profile",
        recency: "Current role",
      },
      {
        id: "michael-software",
        statement: "Uses Exact every day, and some D4W.",
        source: "profile",
        recency: "Current role",
      },
      {
        id: "michael-start",
        statement: "Can start in five weeks.",
        source: "verified_answer",
        recency: "This week",
      },
      {
        id: "michael-salary",
        statement: "Expects $74,000.",
        source: "verified_answer",
        recency: "This week",
      },
      {
        id: "michael-place",
        statement: "Based in Harris Park, a short trip to Parramatta.",
        source: "profile",
        recency: "On profile",
      },
      {
        id: "michael-rights",
        statement: "Australian citizen, with full work rights.",
        source: "profile",
        recency: "On profile",
      },
    ],
    concerns: [
      { id: "michael-start-concern", text: "His start date is past the three weeks you preferred." },
      { id: "michael-d4w", text: "D4W is familiar, not something he uses every day." },
    ],
    history: [
      { title: "Dental receptionist", place: "Harris Park Dental", period: "2024 — now" },
      { title: "Medical receptionist", place: "Auburn Clinic", period: "2022 — 2024" },
    ],
  };
}
