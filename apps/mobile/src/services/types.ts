import type { Candidate, InboxItem, Mission, MissionCounts, MissionStatus } from "../types";

export type SimEvent =
  | {
      type: "progress";
      status?: MissionStatus;
      sentence?: string;
      counts?: Partial<MissionCounts>;
      activity?: string;
    }
  | { type: "candidate"; candidate: Candidate }
  | { type: "inbox"; item: InboxItem };

export interface HiringWork {
  start(mission: Mission, emit: (event: SimEvent) => void): void;
  stop(missionId: string): void;
}
