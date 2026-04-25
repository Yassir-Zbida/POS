import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { type Locale } from "@/i18n/routing";
import { ThemeToggle } from "@/components/theme-toggle";
import { TwoFactorSetting } from "@/components/two-factor-setting";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta.titles" });
  return { title: t("dashboardSettings") };
}

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <ThemeToggle />
      </div>
      <div className="mt-8 grid max-w-xl gap-6">
        <TwoFactorSetting />
      </div>
    </div>
  );
}

