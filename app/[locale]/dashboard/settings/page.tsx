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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold sm:text-2xl">Settings</h1>
        <ThemeToggle />
      </div>
      <div className="mt-4 grid max-w-xl gap-4 sm:mt-8 sm:gap-6">
        <TwoFactorSetting />
      </div>
    </div>
  );
}

