import type { Mission } from "../../types";
import { uid } from "../../domain/format";
import { isDentalDemo } from "../../domain/mission";
import type { HiringWork, SimEvent } from "../types";
import { michaelBrooks, sarahCole } from "./sandbox";

const timers = new Map<string, ReturnType<typeof setTimeout>[]>();

function later(bucket: ReturnType<typeof setTimeout>[], ms: number, run: () => void) {
  bucket.push(setTimeout(run, ms));
}

export const hiringWork: HiringWork = {
  stop(missionId) {
    for (const timer of timers.get(missionId) ?? []) clearTimeout(timer);
    timers.delete(missionId);
  },
  start(mission, emit) {
    this.stop(mission.id);
    const bucket: ReturnType<typeof setTimeout>[] = [];
    timers.set(mission.id, bucket);
    if (isDentalDemo(mission.role, mission.location)) dental(mission, emit, bucket);
    else quiet(mission, emit, bucket);
  },
};

function dental(mission: Mission, emit: (event: SimEvent) => void, bucket: ReturnType<typeof setTimeout>[]) {
  const sarah = sarahCole(mission.id);
  const michael = michaelBrooks(mission.id);
  const salary = mission.requirements.find((item) => item.category === "salary");
  const cap = salary?.value?.kind === "money" ? salary.description.replace("Salary up to ", "") : "$75,000";

  later(bucket, 700, () =>
    emit({
      type: "progress",
      counts: { considered: 22 },
      activity: "22 people considered around Parramatta.",
    }),
  );
  later(bucket, 1500, () =>
    emit({
      type: "progress",
      counts: { considered: 48, meetCore: 7 },
      activity: "48 people considered. 7 meet the core requirements.",
    }),
  );
  later(bucket, 2400, () =>
    emit({
      type: "progress",
      status: "engaging",
      sentence: "I'm speaking with people who know a dental front desk and can work in Parramatta.",
      counts: { contacted: 6 },
      activity: "Speaking with 6 people who look close.",
    }),
  );
  later(bucket, 3300, () =>
    emit({
      type: "progress",
      counts: { interested: 3 },
      activity: "3 people are interested.",
    }),
  );
  later(bucket, 4300, () =>
    emit({
      type: "progress",
      status: "screening",
      sentence: "I'm checking D4W and how soon they can start.",
      counts: { screening: 2 },
      activity: "Checking D4W and start dates. Jordan Hale didn't continue — no D4W experience.",
    }),
  );
  later(bucket, 5400, () => {
    emit({ type: "candidate", candidate: sarah });
    emit({
      type: "progress",
      status: "needs_decision",
      sentence: "Sarah is ready to meet you.",
      counts: { screening: 1, ready: 1 },
      activity: "Sarah is ready to meet you.",
    });
    emit({
      type: "inbox",
      item: {
        id: uid("inbox"),
        missionId: mission.id,
        candidateId: sarah.id,
        title: "Sarah is ready to meet you",
        body: `Uses D4W every day. Can start in 2 weeks, inside your ${cap} ceiling.`,
        actions: [
          { id: "view", label: "View" },
          { id: "meet", label: "Meet" },
        ],
        createdAt: new Date().toISOString(),
      },
    });
  });
  later(bucket, 6800, () => {
    emit({ type: "candidate", candidate: michael });
    emit({
      type: "progress",
      activity: "Michael is interested. He can start in five weeks, past your three-week preference.",
    });
    emit({
      type: "inbox",
      item: {
        id: uid("inbox"),
        missionId: mission.id,
        candidateId: michael.id,
        title: "Michael can start in five weeks",
        body: "That's past the three weeks you preferred. Keep him in the mix?",
        actions: [
          { id: "keep", label: "Keep him" },
          { id: "release", label: "Let him go" },
        ],
        createdAt: new Date().toISOString(),
      },
    });
  });
}

function quiet(mission: Mission, emit: (event: SimEvent) => void, bucket: ReturnType<typeof setTimeout>[]) {
  later(bucket, 800, () =>
    emit({
      type: "progress",
      counts: { considered: 14, meetCore: 2 },
      activity: `14 people considered for ${mission.role.toLowerCase()} in ${mission.location}.`,
    }),
  );
  later(bucket, 1800, () =>
    emit({
      type: "progress",
      status: "engaging",
      sentence: "JobGrid is looking. I'm searching for people who meet your requirements. I'll interrupt you when someone is worth your attention.",
      counts: { contacted: 2 },
      activity: "Nothing worth interrupting you for yet.",
    }),
  );
}
