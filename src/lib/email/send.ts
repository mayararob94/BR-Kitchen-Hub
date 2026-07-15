/**
 * Thin email sender. Uses Resend when configured. In non-production, when
 * Resend is not configured, it logs the message server-side so local OTP
 * login still works — it never exposes contents to the client. Rich
 * templates and delivery logging arrive in Phase 3.
 */
export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info(
        `[email:dev] To: ${input.to}\nSubject: ${input.subject}\n${input.text}`,
      );
      return { ok: true };
    }
    throw new Error("Email is not configured (RESEND_API_KEY / RESEND_FROM).");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  return { ok: res.ok };
}
