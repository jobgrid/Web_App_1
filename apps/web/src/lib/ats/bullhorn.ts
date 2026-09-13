import type { AtsJob, AtsProvider } from "./types";

/**
 * Bullhorn integration (REST API).
 *
 * Live mode requires a REST session in the connection settings:
 *   { "mode": "live", "restUrl": "https://rest.bullhornstaffing.com/rest-services/xyz/", "bhRestToken": "..." }
 * Sessions are obtained via Bullhorn's OAuth + login flow (client id/secret
 * from Bullhorn marketplace). Demo mode returns representative sample jobs.
 */
export const bullhorn: AtsProvider = {
  id: "bullhorn",
  name: "Bullhorn",
  docsUrl: "https://bullhorn.github.io/rest-api-docs/",

  async fetchOpenJobs(settings) {
    if (settings.mode !== "live") return DEMO_JOBS;

    const restUrl = settings.restUrl as string | undefined;
    const token = settings.bhRestToken as string | undefined;
    if (!restUrl || !token) throw new Error("Bullhorn REST session missing");

    const url = `${restUrl}query/JobOrder?fields=id,title,publicDescription,address,employmentType,salary&where=isOpen=true&count=50&BhRestToken=${encodeURIComponent(token)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Bullhorn API error: ${response.status}`);
    const payload = (await response.json()) as {
      data?: Array<{
        id: number;
        title: string;
        publicDescription?: string;
        address?: { city?: string; state?: string };
        salary?: number;
      }>;
    };

    return (payload.data ?? []).map((order) => ({
      externalRef: `bullhorn:${order.id}`,
      title: order.title,
      description: order.publicDescription ?? "",
      location: [order.address?.city, order.address?.state].filter(Boolean).join(", "),
      salaryMin: order.salary || undefined,
    }));
  },
};

const DEMO_JOBS: AtsJob[] = [
  {
    externalRef: "bullhorn:demo-3001",
    title: "Data Engineer — Streaming Platforms",
    description:
      "Global consultancy placing a data engineer with a media client.\n\nBuild and operate real-time pipelines (Kafka, Spark) feeding recommendation systems used by millions.",
    location: "Sydney, NSW",
    category: "AI & Data Science",
    workType: "contract",
    salaryMin: 900,
    salaryMax: 1100,
    skills: ["Data Engineering", "Spark", "Python"],
  },
  {
    externalRef: "bullhorn:demo-3002",
    title: "Customer Success Manager — SaaS",
    description:
      "High-growth HR-tech scale-up.\n\nOwn a book of mid-market accounts, drive adoption and renewals, and feed customer insight back into product.",
    location: "Remote, AU",
    category: "Customer Support",
    workType: "full_time",
    salaryMin: 95000,
    salaryMax: 115000,
    skills: ["Customer Success", "Account Management"],
  },
];
