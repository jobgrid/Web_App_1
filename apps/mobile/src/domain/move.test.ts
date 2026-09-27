import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultConsent, disclosureLine, interruptLine, isPhysioMove, PHYSIO_MOVE, readMove, stillFits, whyOpportunity } from "./move";
import type { Opportunity, OpportunityProfile } from "../types";

const northside: Opportunity = {
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

describe("candidate move", () => {
  it("reads the physiotherapist move and promises to interrupt only for that", () => {
    const draft = readMove(PHYSIO_MOVE, null, null);
    assert.equal(draft.profile.role, "Physiotherapist");
    assert.equal(draft.profile.currentSalary, 105000);
    assert.equal(draft.profile.minimumSalary, 120000);
    assert.equal(draft.ready, true);
    assert.equal(draft.question, null);
    assert.match(draft.notes[1]?.text ?? "", /I'll only interrupt you/);
    assert.match(interruptLine(draft.profile), /\$120,000 or more/);
    assert.match(interruptLine(draft.profile), /closer to home/);
    assert.match(interruptLine(draft.profile), /no Saturdays/);
    assert.equal(isPhysioMove(draft.profile), true);
  });

  it("asks for pay when the role is the only fact", () => {
    const draft = readMove("I'm a physiotherapist.", null, null);
    assert.equal(draft.ready, false);
    assert.equal(draft.pending, "pay");
    assert.match(draft.question ?? "", /pay/);
  });

  it("explains Northside from the rules already given", () => {
    const profile = readMove(PHYSIO_MOVE, null, null).profile;
    const why = whyOpportunity(profile, northside);
    assert.match(why, /\$125k–\$132k/);
    assert.match(why, /No Saturdays/);
    assert.match(why, /14 minutes/);
    assert.match(why, /no application/i);
    assert.equal(stillFits(profile, northside), true);
    const richer: OpportunityProfile = { ...profile, minimumSalary: 140000 };
    assert.equal(stillFits(richer, northside), false);
  });

  it("describes consent without sending a hidden introduction", () => {
    const profile = readMove(PHYSIO_MOVE, null, null).profile;
    const line = disclosureLine(defaultConsent(), profile, "Physiotherapist");
    assert.match(line, /without your name/);
    assert.match(line, /move from \$120,000/);
    assert.match(line, /Only JobGrid will contact you/);
    const hidden = disclosureLine({ ...defaultConsent(), visibility: "hidden" }, profile, "Physiotherapist");
    assert.match(hidden, /will not send this/);
  });
});
