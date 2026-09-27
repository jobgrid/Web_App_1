import { uid } from "../domain/format";
import {
  answerSeeker,
  commuteReply,
  defaultConsent,
  disclosureLine,
  emptyProfile,
  interruptLine,
  knownLine,
  readMove,
  stillFits,
  whyOpportunity,
} from "../domain/move";
import type { SeekerEvent } from "../services/mock/opportunities";
import type { AppState } from "./store";
import type { ConsentSettings, OpportunityMode, OpportunityProfile, SeekerNote, SeekerSlice } from "../types";

export function emptySeeker(): SeekerSlice {
  return {
    draft: null,
    profile: null,
    confirm: null,
    mode: "quietly_listening",
    watch: { assessed: 0, close: 0, worthInterrupting: 0 },
    watching: false,
    quiet: null,
    opportunity: null,
    consent: defaultConsent(),
    inbox: [],
    conversation: [],
  };
}

export type SeekerAction =
  | { type: "seeker-sign-in"; name: string; email: string }
  | { type: "move-text"; text: string }
  | { type: "looking" }
  | { type: "seeker-sim"; event: SeekerEvent }
  | { type: "mode"; mode: OpportunityMode }
  | { type: "consent"; consent: ConsentSettings }
  | { type: "home-area"; area: string }
  | { type: "interest" }
  | { type: "decline"; reason: string }
  | { type: "ask"; text: string }
  | { type: "profile-edit"; name: string; currentSalary: number | null; role: string }
  | { type: "preference"; id: string; mandatory: boolean; amount?: number }
  | { type: "clear-move" };

function say(notes: SeekerNote[], role: SeekerNote["role"], text: string): SeekerNote[] {
  return [...notes, { id: uid("note"), role, text }];
}

function withProfile(state: AppState, profile: OpportunityProfile): AppState {
  const confirm = profile.role && profile.minimumSalary ? interruptLine(profile) : state.seeker.confirm;
  let opportunity = state.seeker.opportunity;
  let quiet = state.seeker.quiet;
  if (opportunity && opportunity.status !== "declined" && !stillFits(profile, opportunity)) {
    opportunity = { ...opportunity, status: "declined", declineReason: "Below what would make you move" };
    quiet = "Nothing worth interrupting you for yet.";
  }
  return { ...state, seeker: { ...state.seeker, profile, confirm, opportunity, quiet } };
}

export function applySeeker(state: AppState, action: SeekerAction): AppState {
  switch (action.type) {
    case "seeker-sign-in":
      return {
        ...state,
        onboarded: true,
        session: { name: action.name.trim(), email: action.email.trim(), role: "Candidate", side: "jobseeker" },
        organisation: null,
        memory: [],
        seeker: emptySeeker(),
      };
    case "move-text": {
      const prior = state.seeker.draft?.profile ?? state.seeker.profile;
      const pending = state.seeker.draft?.pending ?? null;
      const draft = readMove(action.text, prior, pending);
      if (state.seeker.watching && state.seeker.profile) {
        const updated = withProfile(state, { ...draft.profile, homeArea: state.seeker.profile.homeArea });
        return {
          ...updated,
          seeker: {
            ...updated.seeker,
            conversation: say(state.seeker.conversation, "jobgrid", draft.notes[1]?.text ?? interruptLine(draft.profile)),
          },
        };
      }
      const previous = state.seeker.draft?.notes ?? [];
      return { ...state, seeker: { ...state.seeker, draft: { ...draft, notes: [...previous, ...draft.notes] } } };
    }
    case "looking": {
      const profile = state.seeker.draft?.profile;
      if (!profile?.role || !profile.minimumSalary) return state;
      return {
        ...state,
        seeker: {
          ...state.seeker,
          draft: null,
          profile,
          confirm: interruptLine(profile),
          watching: true,
          quiet: null,
          watch: { assessed: 0, close: 0, worthInterrupting: 0 },
        },
      };
    }
    case "seeker-sim": {
      const event = action.event;
      if (event.type === "watch") {
        return { ...state, seeker: { ...state.seeker, watch: event.watch, quiet: event.quiet ?? state.seeker.quiet } };
      }
      if (state.seeker.opportunity) return state;
      return {
        ...state,
        seeker: {
          ...state.seeker,
          opportunity: event.opportunity,
          quiet: null,
          inbox: [event.inbox, ...state.seeker.inbox],
        },
      };
    }
    case "mode":
      return {
        ...state,
        seeker: {
          ...state.seeker,
          mode: action.mode,
          quiet: action.mode === "not_looking" ? "I'll stay quiet until you want to hear about a move." : state.seeker.quiet,
        },
      };
    case "consent":
      return { ...state, seeker: { ...state.seeker, consent: action.consent } };
    case "home-area": {
      const profile = state.seeker.profile ?? emptyProfile();
      const nextProfile = { ...profile, homeArea: action.area };
      const opportunity = state.seeker.opportunity;
      if (!opportunity || opportunity.status === "declined") {
        return { ...state, seeker: { ...state.seeker, profile: nextProfile } };
      }
      if (state.seeker.consent.visibility === "hidden") {
        return {
          ...state,
          seeker: {
            ...state.seeker,
            profile: nextProfile,
            conversation: say(
              state.seeker.conversation,
              "jobgrid",
              `${commuteReply(action.area)} You asked to stay hidden, so I haven't told ${opportunity.practice}.`,
            ),
          },
        };
      }
      const name = state.session?.name ?? "you";
      const text = `${commuteReply(action.area)} ${knownLine(nextProfile)} ${disclosureLine(state.seeker.consent, nextProfile, name)}`;
      return {
        ...state,
        seeker: {
          ...state.seeker,
          profile: nextProfile,
          opportunity: { ...opportunity, status: "shared" },
          conversation: say(state.seeker.conversation, "jobgrid", text),
          inbox: state.seeker.inbox.map((item) =>
            item.opportunityId === opportunity.id && !item.resolution ? { ...item, resolution: "You said you're interested" } : item,
          ),
        },
      };
    }
    case "interest": {
      const opportunity = state.seeker.opportunity;
      const profile = state.seeker.profile;
      if (!opportunity || !profile || opportunity.status === "declined") return state;
      if (state.seeker.consent.visibility === "hidden") {
        return {
          ...state,
          seeker: {
            ...state.seeker,
            opportunity: { ...opportunity, status: "interested" },
            conversation: say(
              state.seeker.conversation,
              "jobgrid",
              `You asked to stay hidden, so I haven't told ${opportunity.practice}. Change visibility if you want me to introduce you. No application either way.`,
            ),
          },
        };
      }
      if (!profile.homeArea) {
        return {
          ...state,
          seeker: {
            ...state.seeker,
            opportunity: { ...opportunity, status: "interested" },
            conversation: say(
              state.seeker.conversation,
              "jobgrid",
              `${knownLine(profile)} Where should the commute start?`,
            ),
          },
        };
      }
      const name = state.session?.name ?? "you";
      return {
        ...state,
        seeker: {
          ...state.seeker,
          opportunity: { ...opportunity, status: "shared" },
          conversation: say(
            state.seeker.conversation,
            "jobgrid",
            `${knownLine(profile)} ${disclosureLine(state.seeker.consent, profile, name)}`,
          ),
          inbox: state.seeker.inbox.map((item) =>
            item.opportunityId === opportunity.id && !item.resolution ? { ...item, resolution: "You said you're interested" } : item,
          ),
        },
      };
    }
    case "decline": {
      const opportunity = state.seeker.opportunity;
      if (!opportunity) return state;
      return {
        ...state,
        seeker: {
          ...state.seeker,
          opportunity: { ...opportunity, status: "declined", declineReason: action.reason },
          quiet: "Nothing worth interrupting you for yet.",
          conversation: say(state.seeker.conversation, "jobgrid", `Passed on ${opportunity.practice}. ${action.reason}.`),
          inbox: state.seeker.inbox.map((item) =>
            item.opportunityId === opportunity.id && !item.resolution ? { ...item, resolution: "Not for me" } : item,
          ),
        },
      };
    }
    case "ask": {
      const opportunity = state.seeker.opportunity;
      const profile = state.seeker.profile;
      if (!opportunity || !profile) return state;
      const question = action.text.trim() || "Why this one?";
      const answer = action.text.trim() ? answerSeeker(action.text, profile, opportunity) : whyOpportunity(profile, opportunity);
      return {
        ...state,
        seeker: {
          ...state.seeker,
          conversation: say(say(state.seeker.conversation, "candidate", question), "jobgrid", answer),
        },
      };
    }
    case "profile-edit": {
      const profile = state.seeker.profile ?? emptyProfile();
      const next: OpportunityProfile = {
        ...profile,
        role: action.role.trim() || profile.role,
        currentSalary: action.currentSalary,
        preferences: profile.preferences.map((item) =>
          item.category === "role"
            ? { ...item, description: action.role.trim() || item.description }
            : item.category === "current_salary"
              ? {
                  ...item,
                  amount: action.currentSalary ?? undefined,
                  description: action.currentSalary ? `On $${action.currentSalary.toLocaleString("en-AU")}` : item.description,
                }
              : item,
        ),
      };
      return {
        ...withProfile(state, next),
        session: state.session ? { ...state.session, name: action.name.trim() || state.session.name } : state.session,
      };
    }
    case "clear-move":
      return { ...state, seeker: { ...state.seeker, draft: null } };
    case "preference": {
      const profile = state.seeker.profile;
      if (!profile) return state;
      const preferences = profile.preferences.map((item) =>
        item.id === action.id
          ? {
              ...item,
              mandatory: action.mandatory,
              amount: action.amount ?? item.amount,
              description:
                item.category === "salary_floor" && action.amount
                  ? `$${action.amount.toLocaleString("en-AU")} or more`
                  : item.description,
            }
          : item,
      );
      const minimumSalary =
        action.id === "floor" && action.amount ? action.amount : profile.minimumSalary;
      return withProfile(state, { ...profile, preferences, minimumSalary });
    }
    default:
      return state;
  }
}
