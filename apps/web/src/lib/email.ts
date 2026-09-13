import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "JobGrid <notifications@jobgrid.ai>";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

async function send(to: string, subject: string, html: string) {
  const resend = getResend();
  if (!resend) {
    console.log(`[email:skipped] to=${to} subject="${subject}" (RESEND_API_KEY not set)`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error("[email:error]", error);
}

function layout(body: string): string {
  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#18181b">
    <div style="font-size:20px;font-weight:700;margin-bottom:24px">Job<span style="color:#4f46e5">Grid</span></div>
    ${body}
    <p style="margin-top:32px;font-size:12px;color:#71717a">JobGrid — the AI job board · <a href="https://jobgrid.ai" style="color:#4f46e5">jobgrid.ai</a></p>
  </div>`;
}

export async function sendChatRequestEmail(opts: {
  to: string;
  candidateName: string;
  jobTitle: string | null;
  message: string;
  siteUrl: string;
}) {
  const jobLine = opts.jobTitle ? ` about <strong>${opts.jobTitle}</strong>` : "";
  await send(
    opts.to,
    `${opts.candidateName} wants to chat${opts.jobTitle ? ` — ${opts.jobTitle}` : ""}`,
    layout(`
      <h2 style="font-size:17px;margin:0 0 12px">New chat request</h2>
      <p style="font-size:14px;line-height:1.6"><strong>${opts.candidateName}</strong> wants to chat with you${jobLine}.</p>
      <blockquote style="margin:16px 0;padding:12px 16px;background:#f4f4f5;border-radius:8px;font-size:14px">${opts.message || "(no message)"}</blockquote>
      <p style="font-size:14px">Accept the request to unlock the conversation, or decline it.</p>
      <a href="${opts.siteUrl}/employer/chats" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Review request</a>
    `)
  );
}

export async function sendChatAcceptedEmail(opts: {
  to: string;
  companyName: string;
  jobTitle: string | null;
  siteUrl: string;
}) {
  await send(
    opts.to,
    `${opts.companyName} accepted your chat request`,
    layout(`
      <h2 style="font-size:17px;margin:0 0 12px">Chat unlocked 🎉</h2>
      <p style="font-size:14px;line-height:1.6"><strong>${opts.companyName}</strong> accepted your chat request${opts.jobTitle ? ` about <strong>${opts.jobTitle}</strong>` : ""}. You can now message them directly.</p>
      <a href="${opts.siteUrl}/chat" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Open chat</a>
    `)
  );
}

export async function sendApplicationEmail(opts: {
  to: string;
  candidateName: string;
  jobTitle: string;
  matchScore: number | null;
  siteUrl: string;
}) {
  await send(
    opts.to,
    `New application — ${opts.jobTitle}`,
    layout(`
      <h2 style="font-size:17px;margin:0 0 12px">New application</h2>
      <p style="font-size:14px;line-height:1.6"><strong>${opts.candidateName}</strong> applied for <strong>${opts.jobTitle}</strong>${opts.matchScore != null ? ` with a <strong>${opts.matchScore}% match</strong>` : ""}.</p>
      <a href="${opts.siteUrl}/employer/jobs" style="display:inline-block;margin-top:12px;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">View applicants</a>
    `)
  );
}
