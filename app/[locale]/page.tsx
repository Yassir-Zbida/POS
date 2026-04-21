import Image from "next/image";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcherFooter } from "@/components/language-switcher-footer";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="mx-auto max-w-5xl p-8 pb-24">
      <div className="flex items-center gap-3">
        <Image
          src="/assets/brand/logo.svg"
          alt="Hssabaty"
          width={150}
          height={38}
          priority
        />
        <h1 className="text-3xl font-bold tracking-tight">{t("headline")}</h1>
      </div>
      <p className="mt-2 text-muted-foreground">{t("subhead")}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/login">{t("login")}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/register">{t("signup")}</Link>
        </Button>
      </div>
      <LanguageSwitcherFooter />
    </main>
  );
}

