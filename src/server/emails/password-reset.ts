import type { Email } from "@/server/lib/email";

export function passwordResetEmail({ to, name, url }: { to: string; name: string; url: string }): Email {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const text = [
    greeting,
    "",
    "We received a request to reset your Nourish password. Use this link within the next hour:",
    url,
    "",
    "If you didn't ask for this, you can ignore this email — your password won't change.",
  ].join("\n");
  const html = `<p>${escapeHtml(greeting)}</p>
<p>We received a request to reset your Nourish password. This link works for the next hour:</p>
<p><a href="${escapeHtml(url)}">Reset your password</a></p>
<p>If you didn't ask for this, you can ignore this email — your password won't change.</p>`;
  return { to, subject: "Reset your Nourish password", text, html };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
