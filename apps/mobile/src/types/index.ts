export type RequirementCategory =
  | "experience"
  | "qualification"
  | "licence"
  | "registration"
  | "software"
  | "technical_skill"
  | "industry_experience"
  | "salary"
  | "location"
  | "commute"
  | "availability"
  | "employment_type"
  | "schedule"
  | "work_rights"
  | "sponsorship"
  | "language"
  | "management_experience"
  | "role_responsibilities"
  | "education"
  | "culture"
  | "other";

export type Priority = "critical" | "high" | "medium" | "low";

export type Flexibility = "fixed" | "some" | "open";

export type VerificationStatus = "stated" | "confirmed" | "unverified";

export type RequirementValue =
  | { kind: "money"; amount: number }
  | { kind: "weeks"; amount: number }
  | { kind: "years"; amount: number }
  | { kind: "days"; amount: number };

export interface Requirement {
  id: string;
  description: string;
  category: RequirementCategory;
  priority: Priority;
  mandatory: boolean;
  importance: number;
  evidenceSources: string[];
  confidence: number;
  verification: VerificationStatus;
  flexibility: Flexibility;
  mayCompromise: boolean;
  employerNotes?: string;
  value?: RequirementValue;
}

export type MissionStatus =
  | "draft"
  | "understanding"
  | "searching"
  | "engaging"
  | "screening"
  | "candidates_ready"
  | "needs_decision"
  | "interviewing"
  | "offer"
  | "completed"
  | "paused";

export interface MissionCounts {
  considered: number;
  meetCore: number;
  contacted: number;
  interested: number;
  screening: number;
  ready: number;
}

export interface ActivityEvent {
  id: string;
  at: string;
  text: string;
}

export type FitLabel =
  | "strong_fit"
  | "good_fit"
  | "possible_fit"
  | "insufficient_evidence"
  | "not_eligible";

export type EvidenceSource =
  | "profile"
  | "cv"
  | "prior_application"
  | "verified_answer"
  | "direct_question"
  | "interview"
  | "credential"
  | "reference";

export interface Evidence {
  id: string;
  statement: string;
  source: EvidenceSource;
  recency: string;
}

export interface Concern {
  id: string;
  text: string;
}

export type Interest = "interested" | "quietly_listening" | "unsure";

export type WorkRights = "citizen" | "visa" | "none" | "unknown";

export interface EmploymentSpan {
  title: string;
  place: string;
  period: string;
}

export interface Candidate {
  id: string;
  missionId: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  availability: string;
  startInDays: number;
  salaryAmount: number;
  salaryLabel: string;
  interest: Interest;
  fit: FitLabel;
  experienceLabel: string;
  softwareLabel: string;
  workRights: WorkRights;
  declined?: boolean;
  summary: string;
  topEvidence: string;
  evidence: Evidence[];
  concerns: Concern[];
  history: EmploymentSpan[];
  passedReason?: string;
  interviewLabel?: string;
}

export interface Mission {
  id: string;
  title: string;
  role: string;
  location: string;
  headcount: number;
  status: MissionStatus;
  statusSentence: string;
  requirements: Requirement[];
  counts: MissionCounts;
  activity: ActivityEvent[];
  createdAt: string;
}

export interface InboxAction {
  id: string;
  label: string;
}

export interface InboxItem {
  id: string;
  missionId: string;
  candidateId?: string;
  title: string;
  body: string;
  actions: InboxAction[];
  createdAt: string;
  resolution?: string;
}

export type ChatBlock =
  | { type: "requirements" }
  | { type: "question"; prompt: string; choices: { id: string; label: string }[] }
  | { type: "start" }
  | { type: "explanation"; candidateId: string }
  | { type: "comparison"; candidateIds: [string, string] }
  | { type: "schedule"; candidateId: string };

export interface ChatMessage {
  id: string;
  role: "employer" | "jobgrid";
  text: string;
  blocks?: ChatBlock[];
}

export interface HiringDraft {
  messages: ChatMessage[];
  requirements: Requirement[];
  role: string | null;
  location: string | null;
  headcount: number;
  awaiting: "clarification" | "ready";
}

export type AccountSide = "employer" | "jobseeker";

export interface Session {
  name: string;
  email: string;
  role: "Owner" | "Candidate";
  side: AccountSide;
}

export interface Organisation {
  id: string;
  name: string;
  location: string;
}

export interface MemoryFact {
  id: string;
  label: string;
  value: string;
  scope: "organisation";
  inferred: boolean;
}

export type Autonomy = "assisted" | "automated" | "autonomous";

export interface TimeSlot {
  id: string;
  label: string;
  detail: string;
}

export interface ClarifyingQuestion {
  id: string;
  prompt: string;
  choices: { id: string; label: string }[];
}

export interface Extraction {
  role: string | null;
  location: string | null;
  headcount: number;
  similarTo: string | null;
  requirements: Requirement[];
}

export type OpportunityMode =
  | "not_looking"
  | "quietly_listening"
  | "open"
  | "actively_looking"
  | "available_immediately";

export type MoveCategory = "role" | "current_salary" | "salary_floor" | "commute" | "schedule" | "other";

export interface MovePreference {
  id: string;
  description: string;
  category: MoveCategory;
  mandatory: boolean;
  amount?: number;
}

export interface OpportunityProfile {
  role: string | null;
  currentSalary: number | null;
  minimumSalary: number | null;
  homeArea: string | null;
  preferences: MovePreference[];
}

export interface WatchCounts {
  assessed: number;
  close: number;
  worthInterrupting: number;
}

export type OpportunityStatus = "new" | "interested" | "shared" | "declined";

export interface Opportunity {
  id: string;
  practice: string;
  role: string;
  location: string;
  salaryLabel: string;
  salaryMin: number;
  salaryMax: number;
  commuteMinutes: number;
  schedule: string;
  week: string;
  status: OpportunityStatus;
  declineReason?: string;
}

export type VisibilitySetting = "hidden" | "matched_only" | "open";
export type ContactSetting = "jobgrid_only" | "practice_through_jobgrid";
export type IdentitySetting = "withheld" | "first_name" | "full_name";
export type SalaryVisibility = "hidden" | "move_range" | "exact";

export interface ConsentSettings {
  visibility: VisibilitySetting;
  contact: ContactSetting;
  identity: IdentitySetting;
  salary: SalaryVisibility;
}

export interface SeekerNote {
  id: string;
  role: "candidate" | "jobgrid";
  text: string;
}

export interface SeekerInboxItem {
  id: string;
  opportunityId?: string;
  title: string;
  body: string;
  actions: { id: string; label: string }[];
  createdAt: string;
  resolution?: string;
}

export type MovePending = "role" | "pay" | null;

export interface MoveDraft {
  notes: SeekerNote[];
  profile: OpportunityProfile;
  ready: boolean;
  pending: MovePending;
  question: string | null;
  choices: { id: string; label: string }[];
}

export interface SeekerSlice {
  draft: MoveDraft | null;
  profile: OpportunityProfile | null;
  confirm: string | null;
  mode: OpportunityMode;
  watch: WatchCounts;
  watching: boolean;
  quiet: string | null;
  opportunity: Opportunity | null;
  consent: ConsentSettings;
  inbox: SeekerInboxItem[];
  conversation: SeekerNote[];
}
