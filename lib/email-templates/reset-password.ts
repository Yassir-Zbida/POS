import { getAppUrl } from "@/lib/reset-password";

export function buildResetPasswordEmail(input: {
  locale: string;
  resetUrl: string;
  appName?: string;
}) {
  const appName = input.appName ?? "Hssabaty POS";
  const brand = "#6D28D9"; // matches typical primary (purple) in UI

  const t = getStrings(input.locale);
  const dir = input.locale === "ar" ? "rtl" : "ltr";

  const text = `${t.subject}\n\n${t.openLink}\n${input.resetUrl}\n\n${t.ignore}`;

  const html = `<!doctype html>
<html lang="${escapeHtml(input.locale)}" dir="${dir}">
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;direction:${dir};">
    <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
      <div style="text-align:center;margin:12px 0 22px;">
        <div style="font-weight:800;letter-spacing:-0.02em;font-size:18px;color:#111827;">${escapeHtml(appName)}</div>
      </div>

      <div style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
        <div style="padding:22px 22px 10px;">
          <h1 style="margin:0;font-size:18px;line-height:1.3;color:#111827;">${escapeHtml(t.title)}</h1>
          <p style="margin:10px 0 0;color:#4b5563;font-size:14px;line-height:1.6;">
            ${escapeHtml(t.subtitle)}
          </p>
        </div>

        <div style="padding:16px 22px 22px;">
          <a href="${escapeAttr(input.resetUrl)}"
             style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;font-size:14px;">
            ${escapeHtml(t.cta)}
          </a>

          <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            ${escapeHtml(t.expiry)}
          </p>
          <p style="margin:12px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            ${escapeHtml(t.trouble)}
            <br />
            <span style="word-break:break-all;color:#111827;">${escapeHtml(input.resetUrl)}</span>
          </p>
        </div>
      </div>

      <div style="text-align:center;margin-top:18px;color:#9ca3af;font-size:12px;">
        ${escapeHtml(t.sentFrom)} ${escapeHtml(getAppUrl())}
      </div>
    </div>
  </body>
</html>`;

  return { subject: t.subject, html, text };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value: string) {
  return escapeHtml(value);
}

function getStrings(locale: string) {
  switch (locale) {
    case "fr":
      return {
        subject: "Réinitialiser votre mot de passe",
        title: "Réinitialiser votre mot de passe",
        subtitle:
          "Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau.",
        cta: "Réinitialiser le mot de passe",
        expiry:
          "Ce lien expirera dans 30 minutes. Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.",
        trouble:
          "Le bouton ne fonctionne pas ? Copiez-collez cette URL dans votre navigateur :",
        openLink: "Ouvrez ce lien pour définir un nouveau mot de passe :",
        ignore: "Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.",
        sentFrom: "Envoyé depuis",
      };
    case "ar":
      return {
        subject: "إعادة تعيين كلمة المرور",
        title: "إعادة تعيين كلمة المرور",
        subtitle:
          "لقد تلقّينا طلبًا لإعادة تعيين كلمة المرور. اضغط على الزر أدناه لتعيين كلمة مرور جديدة.",
        cta: "إعادة تعيين كلمة المرور",
        expiry:
          "ستنتهي صلاحية هذا الرابط خلال 30 دقيقة. إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.",
        trouble: "هل الزر لا يعمل؟ انسخ هذا الرابط والصقه في المتصفح:",
        openLink: "افتح هذا الرابط لتعيين كلمة مرور جديدة:",
        ignore: "إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.",
        sentFrom: "مرسل من",
      };
    default:
      return {
        subject: "Reset your password",
        title: "Reset your password",
        subtitle:
          "We received a request to reset your password. Click the button below to set a new one.",
        cta: "Reset password",
        expiry:
          "This link will expire in 30 minutes. If you didn’t request this, you can safely ignore this email.",
        trouble: "Trouble with the button? Copy and paste this URL into your browser:",
        openLink: "Open this link to set a new password:",
        ignore: "If you didn’t request this, you can ignore this email.",
        sentFrom: "Sent from",
      };
  }
}

