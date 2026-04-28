"use client";

import * as React from "react";
import Image from "next/image";
import { Globe, ChevronDown } from "lucide-react";

import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Lang = "fr" | "en" | "ar";

const COPY: Record<
  Lang,
  {
    title: string;
    description: string;
    reload: string;
    reference: string;
    langs: Record<Lang, string>;
  }
> = {
  fr: {
    title: "Erreur inattendue",
    description: "Un problème critique est survenu. Veuillez recharger la page.",
    reload: "Recharger",
    reference: "Référence :",
    langs: { fr: "Français", en: "English", ar: "العربية" },
  },
  en: {
    title: "Unexpected error",
    description: "A critical error occurred. Please reload the page.",
    reload: "Reload",
    reference: "Reference:",
    langs: { fr: "Français", en: "English", ar: "العربية" },
  },
  ar: {
    title: "حدث خطأ غير متوقع",
    description: "حدثت مشكلة حرجة. يرجى إعادة تحميل الصفحة.",
    reload: "إعادة تحميل",
    reference: "المرجع:",
    langs: { fr: "Français", en: "English", ar: "العربية" },
  },
};

const SHORT: Record<Lang, string> = { fr: "FR", en: "EN", ar: "ع" };
const LOCALES: Lang[] = ["fr", "en", "ar"];

function readLang(): Lang {
  if (typeof document === "undefined") return "en";
  const raw = (document.documentElement.lang || "").toLowerCase().split("-")[0];
  if (raw === "fr" || raw === "en" || raw === "ar") return raw as Lang;
  const seg = window.location.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (seg === "fr" || seg === "en" || seg === "ar") return seg as Lang;
  return "en";
}

function switchToLocale(nextLocale: Lang) {
  const url = new URL(window.location.href);
  const segs = url.pathname.split("/").filter(Boolean);
  const rest =
    segs[0] === "fr" || segs[0] === "en" || segs[0] === "ar" ? segs.slice(1) : segs;
  url.pathname = `/${nextLocale}${rest.length ? `/${rest.join("/")}` : ""}`;
  window.location.replace(url.toString());
}

function InnerGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = React.useState<Lang>("en");

  React.useEffect(() => {
    const l = readLang();
    setLang(l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  const c = COPY[lang];
  const isRtl = lang === "ar";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-y-auto bg-muted/80 px-4 py-8 pb-24 dark:bg-background/95 sm:p-6 sm:pb-24 md:p-10"
    >
      {/* Language switcher + dark mode — same placement as auth pages */}
      <div
        className={`absolute top-[max(1rem,env(safe-area-inset-top,1rem))] z-20 flex items-center gap-2 ${
          isRtl
            ? "left-[max(1rem,env(safe-area-inset-left,1rem))]"
            : "right-[max(1rem,env(safe-area-inset-right,1rem))]"
        }`}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md border-border/70 bg-background/80 px-2 text-sm font-medium shadow-sm backdrop-blur hover:bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <span className="flex items-center gap-1">
                <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-6 text-center tabular-nums">{SHORT[lang]}</span>
                <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-44"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <DropdownMenuRadioGroup
              value={lang}
              onValueChange={(v) => {
                const next = v as Lang;
                setLang(next);
                switchToLocale(next);
              }}
            >
              {LOCALES.map((l) => (
                <DropdownMenuRadioItem key={l} value={l}>
                  {c.langs[l]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <ModeToggle className="focus-visible:ring-0 focus-visible:ring-offset-0" />
      </div>

      {/* Content — card surface aligned with admin dashboard tiles */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border/80 bg-card px-6 py-8 text-center shadow-sm dark:border-border/60 dark:bg-card/90">
        <div className="flex flex-col items-center gap-6">
          <Image
            src="/assets/server-failure_syqp.svg"
            alt=""
            width={260}
            height={219}
            priority
            aria-hidden="true"
            className="w-52 sm:w-64 dark:opacity-90"
          />

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{c.title}</h1>
            <p className="text-sm text-muted-foreground">{c.description}</p>
            {error?.digest ? (
              <p className="mt-1 text-xs text-muted-foreground/70">
                {c.reference} <span className="font-mono">{error.digest}</span>
              </p>
            ) : null}
          </div>

          <Button
            size="lg"
            className="w-full max-w-xs"
            onClick={() => {
              reset();
              window.location.reload();
            }}
          >
            {c.reload}
          </Button>
        </div>
      </div>

    </div>
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className="min-h-svh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <InnerGlobalError error={error} reset={reset} />
        </ThemeProvider>
      </body>
    </html>
  );
}
