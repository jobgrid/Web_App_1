import type { Database } from "@/lib/database.types";

export type AtsJob = {
  externalRef: string;
  title: string;
  description: string;
  location?: string;
  category?: string;
  workType?: Database["public"]["Enums"]["work_type"];
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
};

export type AtsProvider = {
  id: string;
  name: string;
  docsUrl: string;
  /**
   * Fetch open job ads from the ATS. `settings` comes from the stored
   * ats_connections row (OAuth tokens, account ids, or { mode: "demo" }).
   */
  fetchOpenJobs(settings: Record<string, unknown>): Promise<AtsJob[]>;
};
