import { createContext, useContext, useMemo, useReducer, useRef, type ReactNode } from "react";
import { compareCandidates } from "../domain/compare";
import { explainCandidate, similarHiringNote } from "../domain/explain";
import {
  applyClarification,
  chooseClarifyingQuestion,
  extractRequirements,
  mergeRequirements,
} from "../domain/extractRequirements";
import { firstName, uid, weeksPhrase } from "../domain/format";
import { interpret, isMissionQuestion } from "../domain/interpret";
import { buildMission, inferredFacts } from "../domain/mission";
import { hiringWork, opportunityWork, type SimEvent } from "../services";
import type {
  Autonomy,
  Candidate,
  ChatMessage,
  ConsentSettings,
  HiringDraft,
  InboxItem,
  MemoryFact,
  Mission,
  OpportunityMode,
  Requirement,
  Session,
  Organisation,
} from "../types";
import { applySeeker, emptySeeker, type SeekerAction } from "./seeker";

export interface SignInInput {
  name: string;
  email: string;
  organisation: string;
  location: string;
}

export interface AppState {
  onboarded: boolean;
  session: Session | null;
  organisation: Organisation | null;
  memory: MemoryFact[];
  autonomy: Autonomy;
  draft: HiringDraft | null;
  missions: Mission[];
  candidates: Candidate[];
  inbox: InboxItem[];
  threads: Record<string, ChatMessage[]>;
  seeker: import("../types").SeekerSlice;
}

const initialState: AppState = {
  onboarded: false,
  session: null,
  organisation: null,
  memory: [],
  autonomy: "automated",
  draft: null,
  missions: [],
  candidates: [],
  inbox: [],
  threads: {},
  seeker: emptySeeker(),
};

type Action =
  | { type: "onboard" }
  | { type: "sign-in"; input: SignInInput }
  | { type: "sign-out" }
  | { type: "draft"; draft: HiringDraft | null }
  | { type: "mission-created"; mission: Mission; facts: MemoryFact[] }
  | { type: "sim"; missionId: string; event: SimEvent }
  | { type: "thread"; missionId: string; messages: ChatMessage[] }
  | { type: "book"; candidateId: string; slotLabel: string }
  | { type: "pass"; candidateId: string; reason: string }
  | { type: "resolve"; itemId: string; resolution: string }
  | { type: "memory"; id: string; value: string }
  | { type: "autonomy"; autonomy: Autonomy }
  | SeekerAction;

function practiceMemory(): MemoryFact[] {
  return [
    { id: "hours", label: "Hours", value: "Monday to Friday", scope: "organisation", inferred: false },
    { id: "software", label: "Clinical software", value: "D4W", scope: "organisation", inferred: false },
    { id: "interview", label: "Interview style", value: "20 minutes at the practice with you", scope: "organisation", inferred: false },
  ];
}

function withFact(memory: MemoryFact[], facts: MemoryFact[]): MemoryFact[] {
  const next = [...memory];
  for (const fact of facts) {
    const index = next.findIndex((item) => item.id === fact.id);
    if (index >= 0) next[index] = fact;
    else next.push(fact);
  }
  return next;
}

function msg(role: ChatMessage["role"], text: string, blocks?: ChatMessage["blocks"]): ChatMessage {
  return { id: uid("msg"), role, text, blocks };
}

export function visibleCandidates(state: AppState, missionId: string): Candidate[] {
  return state.candidates.filter((candidate) => candidate.missionId === missionId && !candidate.passedReason);
}

function byName(list: Candidate[], name: string): Candidate | undefined {
  return list.find((candidate) => firstName(candidate.name).toLowerCase() === name.toLowerCase());
}

export function draftFromEmployerText(current: HiringDraft | null, text: string): HiringDraft {
  const employer = msg("employer", text);
  const base = current?.messages ?? [];

  if (current?.awaiting === "clarification") {
    const applied = applyClarification(current, text);
    return {
      role: applied.role,
      location: applied.location,
      headcount: applied.headcount || current.headcount,
      requirements: applied.requirements,
      awaiting: "ready",
      messages: [...base, employer, msg("jobgrid", "I have enough to start.", [{ type: "requirements" }, { type: "start" }])],
    };
  }

  const extracted = extractRequirements(text);
  const requirements = mergeRequirements(current?.requirements ?? [], extracted.requirements);
  const role = extracted.role ?? current?.role ?? null;
  const location = extracted.location ?? current?.location ?? null;
  const headcount = extracted.headcount > 1 ? extracted.headcount : (current?.headcount ?? extracted.headcount);
  const snapshot = { role, location, requirements };

  if (current?.awaiting === "ready" && role && location) {
    return {
      role,
      location,
      headcount,
      requirements,
      awaiting: "ready",
      messages: [...base, employer, msg("jobgrid", "Updated.", [{ type: "requirements" }, { type: "start" }])],
    };
  }

  if (role && location) {
    const question = chooseClarifyingQuestion(snapshot);
    return {
      role,
      location,
      headcount,
      requirements,
      awaiting: "clarification",
      messages: [
        ...base,
        employer,
        msg("jobgrid", "Got it.", [
          { type: "requirements" },
          { type: "question", prompt: question.prompt, choices: question.choices },
        ]),
      ],
    };
  }

  const question = chooseClarifyingQuestion(snapshot);
  return {
    role,
    location,
    headcount,
    requirements,
    awaiting: "clarification",
    messages: [...base, employer, msg("jobgrid", question.prompt, [{ type: "question", prompt: question.prompt, choices: question.choices }])],
  };
}

function replyFor(state: AppState, mission: Mission, text: string): ChatMessage[] {
  const visible = visibleCandidates(state, mission.id);
  const intent = interpret(text);
  const employer = msg("employer", text);
  const waiting = msg(
    "jobgrid",
    "I'm still speaking with people. I'll interrupt you when someone is worth your attention.",
  );

  if (intent.type === "why") {
    const candidate = byName(visible, intent.name);
    if (!candidate) return [employer, waiting];
    return [employer, msg("jobgrid", `Here's why ${firstName(candidate.name)} fits.`, [{ type: "explanation", candidateId: candidate.id }])];
  }

  if (intent.type === "compare") {
    const left = byName(visible, "sarah") ?? visible[0];
    const right = byName(visible, "michael") ?? visible.find((candidate) => candidate.id !== left?.id);
    if (!left || !right) return [employer, waiting];
    return [
      employer,
      msg("jobgrid", compareCandidates(left, right, mission.requirements).lead, [
        { type: "comparison", candidateIds: [left.id, right.id] },
      ]),
    ];
  }

  if (intent.type === "fastest") {
    if (!visible.length) return [employer, waiting];
    const soonest = [...visible].sort((a, b) => a.startInDays - b.startInDays)[0];
    return [
      employer,
      msg("jobgrid", `${firstName(soonest.name)} can start soonest, in ${weeksPhrase(soonest.startInDays)}.`, [
        { type: "explanation", candidateId: soonest.id },
      ]),
    ];
  }

  if (intent.type === "similar") {
    const candidate =
      byName(visible, intent.name) ??
      byName(
        state.candidates.filter((item) => item.missionId === mission.id),
        intent.name,
      );
    if (!candidate) return [employer, waiting];
    return [employer, msg("jobgrid", similarHiringNote(candidate))];
  }

  if (intent.type === "meet") {
    const candidate = byName(visible, intent.name);
    if (!candidate) return [employer, waiting];
    return [
      employer,
      msg("jobgrid", `When should ${firstName(candidate.name)} come in?`, [{ type: "schedule", candidateId: candidate.id }]),
    ];
  }

  const lead = visible[0] ? firstName(visible[0].name) : null;
  return [
    employer,
    msg(
      "jobgrid",
      lead
        ? `I can tell you why ${lead} fits, compare the people in front of you, or see who can start fastest.`
        : "Tell me who you want to understand, or wait until someone is ready to meet.",
    ),
  ];
}

function isSeekerAction(action: Action): action is SeekerAction {
  return (
    action.type === "seeker-sign-in" ||
    action.type === "move-text" ||
    action.type === "looking" ||
    action.type === "seeker-sim" ||
    action.type === "mode" ||
    action.type === "consent" ||
    action.type === "home-area" ||
    action.type === "interest" ||
    action.type === "decline" ||
    action.type === "ask" ||
    action.type === "profile-edit" ||
    action.type === "preference" ||
    action.type === "clear-move"
  );
}

function reducer(state: AppState, action: Action): AppState {
  if (isSeekerAction(action)) return applySeeker(state, action);
  switch (action.type) {
    case "onboard":
      return { ...state, onboarded: true };
    case "sign-in":
      return {
        ...state,
        onboarded: true,
        session: { name: action.input.name.trim(), email: action.input.email.trim(), role: "Owner", side: "employer" },
        organisation: { id: uid("org"), name: action.input.organisation.trim(), location: action.input.location.trim() },
        memory: [
          { id: "location", label: "Location", value: action.input.location.trim(), scope: "organisation", inferred: false },
          ...practiceMemory(),
        ],
      };
    case "sign-out":
      return { ...initialState, onboarded: true };
    case "draft":
      return { ...state, draft: action.draft };
    case "mission-created":
      return {
        ...state,
        draft: null,
        missions: [action.mission, ...state.missions],
        memory: withFact(state.memory, action.facts),
        threads: { ...state.threads, [action.mission.id]: [] },
      };
    case "sim": {
      const event = action.event;
      if (event.type === "candidate") {
        if (state.candidates.some((candidate) => candidate.id === event.candidate.id)) return state;
        return { ...state, candidates: [...state.candidates, event.candidate] };
      }
      if (event.type === "inbox") return { ...state, inbox: [event.item, ...state.inbox] };
      return {
        ...state,
        missions: state.missions.map((mission) =>
          mission.id === action.missionId
            ? {
                ...mission,
                status: event.status ?? mission.status,
                statusSentence: event.sentence ?? mission.statusSentence,
                counts: { ...mission.counts, ...event.counts },
                activity: event.activity
                  ? [...mission.activity, { id: uid("act"), at: new Date().toISOString(), text: event.activity }]
                  : mission.activity,
              }
            : mission,
        ),
      };
    }
    case "thread":
      return {
        ...state,
        threads: { ...state.threads, [action.missionId]: [...(state.threads[action.missionId] ?? []), ...action.messages] },
      };
    case "book": {
      const candidate = state.candidates.find((item) => item.id === action.candidateId);
      if (!candidate) return state;
      const sentence = `I'll ask ${firstName(candidate.name)} for ${action.slotLabel}. You'll only hear from me if that time doesn't work.`;
      return {
        ...state,
        candidates: state.candidates.map((item) => (item.id === candidate.id ? { ...item, interviewLabel: action.slotLabel } : item)),
        missions: state.missions.map((mission) =>
          mission.id === candidate.missionId
            ? {
                ...mission,
                status: "interviewing",
                statusSentence: sentence,
                activity: [
                  ...mission.activity,
                  {
                    id: uid("act"),
                    at: new Date().toISOString(),
                    text: `You asked to meet ${firstName(candidate.name)} on ${action.slotLabel}.`,
                  },
                ],
              }
            : mission,
        ),
        inbox: state.inbox.map((item) =>
          item.candidateId === candidate.id && !item.resolution ? { ...item, resolution: `Meeting ${action.slotLabel}` } : item,
        ),
        threads: {
          ...state.threads,
          [candidate.missionId]: [...(state.threads[candidate.missionId] ?? []), msg("jobgrid", sentence)],
        },
      };
    }
    case "pass": {
      const candidate = state.candidates.find((item) => item.id === action.candidateId);
      if (!candidate || candidate.passedReason) return state;
      const remaining = visibleCandidates(state, candidate.missionId).filter((item) => item.id !== candidate.id);
      return {
        ...state,
        candidates: state.candidates.map((item) => (item.id === candidate.id ? { ...item, passedReason: action.reason } : item)),
        missions: state.missions.map((mission) => {
          if (mission.id !== candidate.missionId) return mission;
          return {
            ...mission,
            counts: { ...mission.counts, ready: Math.max(0, mission.counts.ready - (candidate.fit === "strong_fit" ? 1 : 0)) },
            status: remaining.length ? mission.status : "searching",
            statusSentence: remaining.length
              ? `${firstName(remaining[0].name)} is still in the mix.`
              : "I'll keep looking. I'll interrupt you when someone is worth your attention.",
            activity: [
              ...mission.activity,
              { id: uid("act"), at: new Date().toISOString(), text: `You passed on ${firstName(candidate.name)}. ${action.reason}.` },
            ],
          };
        }),
        inbox: state.inbox.map((item) =>
          item.candidateId === candidate.id && !item.resolution ? { ...item, resolution: "Passed" } : item,
        ),
      };
    }
    case "resolve":
      return { ...state, inbox: state.inbox.map((item) => (item.id === action.itemId ? { ...item, resolution: action.resolution } : item)) };
    case "memory":
      return {
        ...state,
        memory: state.memory.map((fact) => (fact.id === action.id ? { ...fact, value: action.value, inferred: false } : fact)),
      };
    case "autonomy":
      return { ...state, autonomy: action.autonomy };
    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  completeOnboarding: () => void;
  signIn: (input: SignInInput) => void;
  signOut: () => void;
  submitText: (text: string) => { kind: "draft" } | { kind: "mission"; missionId: string };
  updateDraftRequirements: (requirements: Requirement[]) => void;
  clearDraft: () => void;
  startHiring: () => string | null;
  ask: (missionId: string, text: string) => void;
  book: (candidateId: string, slotLabel: string) => void;
  pass: (candidateId: string, reason: string) => void;
  resolveInbox: (itemId: string, resolution: string) => void;
  editMemory: (id: string, value: string) => void;
  setAutonomy: (autonomy: Autonomy) => void;
  signInSeeker: (input: { name: string; email: string }) => void;
  submitMove: (text: string) => void;
  startLooking: () => void;
  setOpportunityMode: (mode: OpportunityMode) => void;
  setConsent: (consent: ConsentSettings) => void;
  setHomeArea: (area: string) => void;
  showInterest: () => void;
  declineOpportunity: (reason: string) => void;
  askOpportunity: (text: string) => void;
  editSeekerProfile: (input: { name: string; currentSalary: number | null; role: string }) => void;
  editPreference: (id: string, mandatory: boolean, amount?: number) => void;
  clearMove: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const api = useMemo<Omit<StoreValue, "state">>(() => {
    return {
      completeOnboarding: () => dispatch({ type: "onboard" }),
      signIn: (input) => dispatch({ type: "sign-in", input }),
      signOut: () => {
        for (const mission of stateRef.current.missions) hiringWork.stop(mission.id);
        opportunityWork.stop();
        dispatch({ type: "sign-out" });
      },
      signInSeeker: (input) => dispatch({ type: "seeker-sign-in", name: input.name, email: input.email }),
      submitMove: (text) => dispatch({ type: "move-text", text }),
      startLooking: () => {
        const profile = stateRef.current.seeker.draft?.profile;
        if (!profile?.role || !profile.minimumSalary) return;
        dispatch({ type: "looking" });
        opportunityWork.start(profile, (event) => dispatch({ type: "seeker-sim", event }));
      },
      setOpportunityMode: (mode) => dispatch({ type: "mode", mode }),
      setConsent: (consent) => dispatch({ type: "consent", consent }),
      setHomeArea: (area) => dispatch({ type: "home-area", area }),
      showInterest: () => dispatch({ type: "interest" }),
      declineOpportunity: (reason) => dispatch({ type: "decline", reason }),
      askOpportunity: (text) => dispatch({ type: "ask", text }),
      editSeekerProfile: (input) => dispatch({ type: "profile-edit", ...input }),
      editPreference: (id, mandatory, amount) => dispatch({ type: "preference", id, mandatory, amount }),
      clearMove: () => dispatch({ type: "clear-move" }),
      submitText: (text) => {
        const current = stateRef.current;
        const latest = current.missions[0];
        if (!current.draft && latest && (isMissionQuestion(text) || extractRequirements(text).similarTo)) {
          dispatch({ type: "thread", missionId: latest.id, messages: replyFor(current, latest, text) });
          return { kind: "mission", missionId: latest.id };
        }
        dispatch({ type: "draft", draft: draftFromEmployerText(current.draft, text) });
        return { kind: "draft" };
      },
      updateDraftRequirements: (requirements) => {
        const draft = stateRef.current.draft;
        if (!draft) return;
        dispatch({ type: "draft", draft: { ...draft, requirements } });
      },
      clearDraft: () => dispatch({ type: "draft", draft: null }),
      startHiring: () => {
        const draft = stateRef.current.draft;
        if (!draft || draft.awaiting !== "ready" || !draft.role || !draft.location) return null;
        const mission = buildMission(draft);
        dispatch({
          type: "mission-created",
          mission,
          facts: inferredFacts(draft.role, draft.location, draft.requirements),
        });
        hiringWork.start(mission, (event) => dispatch({ type: "sim", missionId: mission.id, event }));
        return mission.id;
      },
      ask: (missionId, text) => {
        const current = stateRef.current;
        const mission = current.missions.find((item) => item.id === missionId);
        if (!mission) return;
        dispatch({ type: "thread", missionId, messages: replyFor(current, mission, text) });
      },
      book: (candidateId, slotLabel) => dispatch({ type: "book", candidateId, slotLabel }),
      pass: (candidateId, reason) => dispatch({ type: "pass", candidateId, reason }),
      resolveInbox: (itemId, resolution) => dispatch({ type: "resolve", itemId, resolution }),
      editMemory: (id, value) => dispatch({ type: "memory", id, value }),
      setAutonomy: (autonomy) => dispatch({ type: "autonomy", autonomy }),
    };
  }, []);

  const value = useMemo<StoreValue>(() => ({ state, ...api }), [state, api]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}

export function explainFor(state: AppState, candidateId: string): string {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  const mission = state.missions.find((item) => item.id === candidate?.missionId);
  if (!candidate || !mission) return "";
  return explainCandidate(candidate, mission.requirements);
}
