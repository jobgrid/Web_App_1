import { bullhorn } from "./bullhorn";
import { jobadder } from "./jobadder";
import type { AtsProvider } from "./types";

export type AtsProviderId = "jobadder" | "bullhorn";

const PROVIDERS: Record<AtsProviderId, AtsProvider> = {
  jobadder,
  bullhorn,
};

export function getAtsProvider(id: AtsProviderId): AtsProvider {
  return PROVIDERS[id];
}

export const ATS_PROVIDERS = Object.values(PROVIDERS);
export type { AtsJob, AtsProvider } from "./types";
