import { getAppUrl } from "@/lib/reset-password";
import { OTP_TTL_MS } from "@/lib/otp-challenge";

export type OtpEmailPurpose = "LOGIN" | "REGISTER" | "VERIFY_PHONE";

export function buildOtpEmail(input: {
  locale: string;
  code: string;
  purpose: OtpEmailPurpose;
  appName?: string;
}) {
  const appName = input.appName ?? "Hssabaty POS";
  const expiryMinutes = Math.max(1, Math.round(OTP_TTL_MS / 60_000));
  const t = getStrings(input.locale, input.purpose, expiryMinutes);
  const dir = input.locale === "ar" ? "rtl" : "ltr";

  const text = `${t.subject}\n\n${t.textIntro}\n\n${t.textCodeLabel} ${input.code}\n\n${t.textExpiry}\n\n${t.textIgnore}`;

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

        <div style="padding:16px 22px 22px;text-align:center;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">
            ${escapeHtml(t.codeLabel)}
          </p>
          <div style="display:inline-block;padding:14px 28px;border-radius:12px;background:#faf5ff;border:1px solid #e9d5ff;border-top:3px solid #6D28D9;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:28px;font-weight:800;letter-spacing:0.35em;color:#111827;">
            ${escapeHtml(input.code)}
          </div>

          <p style="margin:18px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            ${escapeHtml(t.expiry)}
          </p>
          <p style="margin:12px 0 0;color:#b91c1c;font-size:12px;line-height:1.6;">
            ${escapeHtml(t.security)}
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

function getStrings(locale: string, purpose: OtpEmailPurpose, expiryMinutes: number) {
  const expiryFr = expiryMinutes === 1 ? "1 minute" : `${expiryMinutes} minutes`;
  const expiryEn = expiryMinutes === 1 ? "1 minute" : `${expiryMinutes} minutes`;
  const expiryAr = expiryMinutes === 1 ? "دقيقة واحدة" : `${expiryMinutes} دقائق`;

  if (locale === "fr") {
    const head =
      purpose === "LOGIN"
        ? {
            subject: "Votre code de connexion",
            title: "Connexion sécurisée",
            subtitle: "Utilisez le code ci-dessous pour vous connecter. Ne le partagez avec personne.",
          }
        : purpose === "REGISTER"
          ? {
              subject: "Vérifiez votre adresse e-mail",
              title: "Vérification de l’e-mail",
              subtitle: "Saisissez ce code pour poursuivre la création de votre compte.",
            }
          : {
              subject: "Code de vérification",
              title: "Vérification",
              subtitle: "Voici votre code de vérification.",
            };

    return {
      ...head,
      codeLabel: "Code à usage unique",
      expiry: `Ce code expire dans ${expiryFr}.`,
      security: "Ne partagez jamais ce code. Notre équipe ne vous le demandera jamais.",
      textIntro: head.subtitle,
      textCodeLabel: "Code :",
      textExpiry: `Ce code expire dans ${expiryFr}.`,
      textIgnore: "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.",
      sentFrom: "Envoyé depuis",
    };
  }

  if (locale === "ar") {
    const head =
      purpose === "LOGIN"
        ? {
            subject: "رمز تسجيل الدخول",
            title: "تسجيل دخول آمن",
            subtitle: "استخدم الرمز أدناه لتسجيل الدخول. لا تشاركه مع أي شخص.",
          }
        : purpose === "REGISTER"
          ? {
              subject: "تأكيد بريدك الإلكتروني",
              title: "التحقق من البريد",
              subtitle: "أدخل هذا الرمز لمتابعة إنشاء حسابك.",
            }
          : {
              subject: "رمز التحقق",
              title: "التحقق",
              subtitle: "إليك رمز التحقق.",
            };

    return {
      ...head,
      codeLabel: "رمز لمرة واحدة",
      expiry: `ينتهي هذا الرمز خلال ${expiryAr}.`,
      security: "لا تشارك هذا الرمز أبدًا. لن يطلبه فريقنا منك.",
      textIntro: head.subtitle,
      textCodeLabel: "الرمز:",
      textExpiry: `ينتهي هذا الرمز خلال ${expiryAr}.`,
      textIgnore: "إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة.",
      sentFrom: "مرسل من",
    };
  }

  const head =
    purpose === "LOGIN"
      ? {
          subject: "Your sign-in code",
          title: "Secure sign-in",
          subtitle: "Use the code below to sign in. Do not share it with anyone.",
        }
      : purpose === "REGISTER"
        ? {
            subject: "Verify your email",
            title: "Email verification",
            subtitle: "Enter this code to continue creating your account.",
          }
        : {
            subject: "Your verification code",
            title: "Verification",
            subtitle: "Here is your verification code.",
          };

  return {
    ...head,
    codeLabel: "One-time code",
    expiry: `This code expires in ${expiryEn}.`,
    security: "Never share this code. Our team will never ask you for it.",
    textIntro: head.subtitle,
    textCodeLabel: "Code:",
    textExpiry: `This code expires in ${expiryEn}.`,
    textIgnore: "If you didn’t request this, you can safely ignore this email.",
    sentFrom: "Sent from",
  };
}
