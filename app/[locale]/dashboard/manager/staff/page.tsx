import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ManagerStaffClient } from "@/components/manager/manager-staff-client";
import { type Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "meta.titles" });
  return { title: t("managerStaff") };
}

export default async function ManagerStaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale as Locale);

  return <ManagerStaffClient />;
}
