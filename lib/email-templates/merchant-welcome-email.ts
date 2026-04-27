import { getAppUrl } from "@/lib/reset-password";

export function buildMerchantWelcomeEmail(input: {
  locale: string;
  merchantName: string;
  email: string;
  password: string;
  appName?: string;
}) {
  const appName = input.appName ?? "Hssabaty POS";
  const brand = "#6D28D9"; // keep consistent with reset-password email
  const dir = input.locale === "ar" ? "rtl" : "ltr";
  const loginUrl = `${getAppUrl()}/${input.locale}/login`;
  const t = getStrings(input.locale);

  const text =
    `${t.subject}\n\n` +
    `${t.greeting(input.merchantName)}\n\n` +
    `${t.intro(appName)}\n\n` +
    `${t.credentialsLabel}\n` +
    `- ${t.emailLabel} ${input.email}\n` +
    `- ${t.passwordLabel} ${input.password}\n\n` +
    `${t.loginLabel} ${loginUrl}\n\n` +
    `${t.securityNote}\n`;

  const html = `<!doctype html>
<html lang="${escapeHtml(input.locale)}" dir="${dir}">
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;direction:${dir};">
    <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
      <div style="text-align:center;margin:12px 0 22px;">
        <div style="font-weight:800;letter-spacing:-0.02em;font-size:18px;color:#111827;">${escapeHtml(
          appName
        )}</div>
      </div>

      <div style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
        <div style="padding:22px 22px 10px;">
          <h1 style="margin:0;font-size:18px;line-height:1.3;color:#111827;">${escapeHtml(t.title)}</h1>
          <p style="margin:10px 0 0;color:#4b5563;font-size:14px;line-height:1.6;">
            ${escapeHtml(t.greeting(input.merchantName))}
          </p>
          <p style="margin:10px 0 0;color:#4b5563;font-size:14px;line-height:1.6;">
            ${escapeHtml(t.intro(appName))}
          </p>
        </div>

        <div style="padding:16px 22px 22px;">
          <div style="border:1px solid #e5e7eb;border-radius:12px;padding:14px 14px;background:#fafafa;">
            <div style="font-size:12px;font-weight:700;color:#111827;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:10px;">
              ${escapeHtml(t.credentialsLabel)}
            </div>
            <div style="font-size:14px;color:#111827;line-height:1.7;">
              <div><strong>${escapeHtml(t.emailLabel)}</strong> ${escapeHtml(input.email)}</div>
              <div><strong>${escapeHtml(t.passwordLabel)}</strong> ${escapeHtml(input.password)}</div>
            </div>
          </div>

          <div style="margin-top:14px;">
            <a href="${escapeAttr(loginUrl)}"
              style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:700;font-size:14px;">
              ${escapeHtml(t.cta)}
            </a>
          </div>

          <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            ${escapeHtml(t.loginLabel)} <span style="color:#111827;">${escapeHtml(loginUrl)}</span>
          </p>
          <p style="margin:12px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            ${escapeHtml(t.trouble)}
            <br />
            <span style="word-break:break-all;color:#111827;">${escapeHtml(loginUrl)}</span>
          </p>
          <p style="margin:10px 0 0;color:#b91c1c;font-size:12px;line-height:1.6;">
            ${escapeHtml(t.securityNote)}
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
  if (locale === "fr") {
    return {
      subject: "Bienvenue sur Hssabaty POS",
      title: "Votre compte marchand est prêt",
      greeting: (name: string) => `Bonjour ${name},`,
      intro: (appName: string) => `Votre compte ${appName} a été créé. Vous pouvez vous connecter avec les identifiants ci-dessous.`,
      credentialsLabel: "Identifiants",
      emailLabel: "E-mail :",
      passwordLabel: "Mot de passe :",
      loginLabel: "Lien de connexion :",
      cta: "Se connecter",
      trouble: "Le bouton ne fonctionne pas ? Copiez-collez cette URL dans votre navigateur :",
      securityNote: "Pour votre sécurité, changez ce mot de passe après votre première connexion et ne le partagez avec personne.",
      sentFrom: "Envoyé depuis",
    };
  }

  if (locale === "ar") {
    return {
      subject: "مرحبًا بك في Hssabaty POS",
      title: "تم إنشاء حساب التاجر",
      greeting: (name: string) => `مرحبًا ${name}،`,
      intro: (appName: string) => `تم إنشاء حسابك في ${appName}. يمكنك تسجيل الدخول باستخدام البيانات التالية.`,
      credentialsLabel: "بيانات الدخول",
      emailLabel: "البريد الإلكتروني:",
      passwordLabel: "كلمة المرور:",
      loginLabel: "رابط تسجيل الدخول:",
      cta: "تسجيل الدخول",
      trouble: "هل الزر لا يعمل؟ انسخ هذا الرابط والصقه في المتصفح:",
      securityNote: "لأمانك، غيّر كلمة المرور بعد أول تسجيل دخول ولا تشاركها مع أي شخص.",
      sentFrom: "مرسل من",
    };
  }

  return {
    subject: "Welcome to Hssabaty POS",
    title: "Your merchant account is ready",
    greeting: (name: string) => `Hi ${name},`,
    intro: (appName: string) => `Your ${appName} account has been created. You can sign in using the credentials below.`,
    credentialsLabel: "Account credentials",
    emailLabel: "Email:",
    passwordLabel: "Password:",
    loginLabel: "Login URL:",
    cta: "Sign in",
    trouble: "Trouble with the button? Copy and paste this URL into your browser:",
    securityNote: "For your security, change this password after your first login and do not share it with anyone.",
    sentFrom: "Sent from",
  };
}

