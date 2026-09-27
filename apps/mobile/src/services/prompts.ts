export const DEMO_UTTERANCE =
  "I need a dental receptionist in Parramatta. At least two years experience, must know D4W, salary up to $75k and ideally available within three weeks.";

export const SAVED_RECEPTIONIST_DESCRIPTION = `Dental receptionist in Parramatta.
Four days per week, Tuesday to Friday.
Minimum two years of experience in a dental practice.
They need to know D4W for appointments, recalls, and treatment coordination.
Salary up to $75,000 plus super.`;

export const SEEKER_DEMO_UTTERANCE =
  "I'm a physiotherapist on $105k, and would move for $120k+, closer to home, no Saturdays.";

export const SEEKER_PROMPTS = [{ id: "physio-move", label: "Physiotherapist, $120k+", text: SEEKER_DEMO_UTTERANCE }];

export const EXAMPLE_PROMPTS = [
  { id: "dental", label: "Dental receptionist in Parramatta", text: DEMO_UTTERANCE },
  { id: "physio", label: "Two physiotherapists in Brisbane", text: "Find me two physiotherapists for our Brisbane clinic." },
  { id: "manager", label: "Practice manager in Sydney", text: "Find me a practice manager in Sydney." },
];
