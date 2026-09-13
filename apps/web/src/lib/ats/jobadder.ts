import type { AtsJob, AtsProvider } from "./types";

/**
 * JobAdder integration (https://api.jobadder.com/v2).
 *
 * Live mode requires an OAuth2 access token in the connection settings:
 *   { "mode": "live", "accessToken": "...", "boardId": 1234 }
 * Obtain tokens via JobAdder's OAuth flow (client id/secret from the JobAdder
 * developer portal). Demo mode returns representative sample jobs so the full
 * import pipeline can be exercised without credentials.
 */
export const jobadder: AtsProvider = {
  id: "jobadder",
  name: "JobAdder",
  docsUrl: "https://developers.jobadder.com",

  async fetchOpenJobs(settings) {
    if (settings.mode !== "live") return DEMO_JOBS;

    const accessToken = settings.accessToken as string | undefined;
    if (!accessToken) throw new Error("JobAdder access token missing");

    const response = await fetch("https://api.jobadder.com/v2/jobads?limit=50", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`JobAdder API error: ${response.status}`);
    const payload = (await response.json()) as {
      items?: Array<{
        adId: number;
        title: string;
        description?: string;
        summary?: string;
        // Additional JobAdder fields elided
      }>;
    };

    return (payload.items ?? []).map((ad) => ({
      externalRef: `jobadder:${ad.adId}`,
      title: ad.title,
      description: ad.description ?? ad.summary ?? "",
    }));
  },
};

const DEMO_JOBS: AtsJob[] = [
  {
    externalRef: "jobadder:demo-2001",
    title: "Registered Nurse — Aged Care",
    description:
      "Join a leading aged-care provider with facilities across the eastern suburbs.\n\nYou will deliver high-quality clinical care, mentor junior staff and work with a supportive multidisciplinary team.\n\nAHPRA registration required.",
    location: "Melbourne, VIC",
    category: "Healthcare",
    workType: "part_time",
    salaryMin: 75000,
    salaryMax: 92000,
    skills: ["Nursing", "Patient Care"],
  },
  {
    externalRef: "jobadder:demo-2002",
    title: "Civil Project Engineer",
    description:
      "Tier-2 contractor seeking a project engineer for major road infrastructure works.\n\nManage subcontractors, budgets and programme across a $40M package.",
    location: "Brisbane, QLD",
    category: "Engineering",
    workType: "full_time",
    salaryMin: 120000,
    salaryMax: 145000,
    skills: ["Project Management"],
  },
];
