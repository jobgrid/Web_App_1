import { uid } from "../../domain/format";
import { isPhysioMove } from "../../domain/move";
import type { Opportunity, OpportunityProfile, SeekerInboxItem, WatchCounts } from "../../types";

export type SeekerEvent =
  | { type: "watch"; watch: WatchCounts; quiet?: string }
  | { type: "opportunity"; opportunity: Opportunity; inbox: SeekerInboxItem };

export interface OpportunityWork {
  start(profile: OpportunityProfile, emit: (event: SeekerEvent) => void): void;
  stop(): void;
}

const timers: ReturnType<typeof setTimeout>[] = [];

function later(ms: number, run: () => void) {
  timers.push(setTimeout(run, ms));
}

export function northsidePhysio(): Opportunity {
  return {
    id: "northside",
    practice: "Northside Physio",
    role: "Physiotherapist",
    location: "St Leonards",
    salaryLabel: "$125k–$132k",
    salaryMin: 125000,
    salaryMax: 132000,
    commuteMinutes: 14,
    schedule: "No Saturdays",
    week: "4-day week",
    status: "new",
  };
}

export const opportunityWork: OpportunityWork = {
  stop() {
    for (const timer of timers) clearTimeout(timer);
    timers.length = 0;
  },
  start(profile, emit) {
    this.stop();
    if (isPhysioMove(profile)) {
      later(700, () => emit({ type: "watch", watch: { assessed: 18, close: 2, worthInterrupting: 0 } }));
      later(1600, () => emit({ type: "watch", watch: { assessed: 36, close: 5, worthInterrupting: 0 } }));
      later(2500, () => emit({ type: "watch", watch: { assessed: 44, close: 6, worthInterrupting: 1 } }));
      later(3400, () => {
        const opportunity = northsidePhysio();
        emit({
          type: "opportunity",
          opportunity,
          inbox: {
            id: uid("sin"),
            opportunityId: opportunity.id,
            title: "Northside Physio is worth a look",
            body: "$125k–$132k · 14-minute commute · no Saturdays · 4-day week",
            actions: [
              { id: "interested", label: "Interested" },
              { id: "ask", label: "Ask JobGrid" },
              { id: "pass", label: "Not for me" },
            ],
            createdAt: new Date().toISOString(),
          },
        });
      });
      return;
    }
    later(800, () => emit({ type: "watch", watch: { assessed: 11, close: 0, worthInterrupting: 0 } }));
    later(1800, () =>
      emit({
        type: "watch",
        watch: { assessed: 24, close: 1, worthInterrupting: 0 },
        quiet: "Nothing worth interrupting you for yet.",
      }),
    );
  },
};
