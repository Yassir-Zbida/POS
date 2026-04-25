"use client";

import * as React from "react";
import Image from "next/image";
import { Globe, ChevronDown } from "lucide-react";

import { AuthLiquidBackground } from "@/components/auth-liquid-background";
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

const COPY: Record<Lang, { title: string; description: string; back: string; langs: Record<Lang, string> }> = {
  fr: {
    title: "Page introuvable",
    description: "La page que vous cherchez n'existe pas ou a été déplacée.",
    back: "Retour",
    langs: { fr: "Français", en: "English", ar: "العربية" },
  },
  en: {
    title: "Page not found",
    description: "The page you're looking for doesn't exist or was moved.",
    back: "Go back",
    langs: { fr: "Français", en: "English", ar: "العربية" },
  },
  ar: {
    title: "الصفحة غير موجودة",
    description: "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
    back: "رجوع",
    langs: { fr: "Français", en: "English", ar: "العربية" },
  },
};

const SHORT: Record<Lang, string> = { fr: "FR", en: "EN", ar: "ع" };
const LOCALES: Lang[] = ["fr", "en", "ar"];

function inferLang(pathname: string): Lang {
  const seg = pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (seg === "fr" || seg === "en" || seg === "ar") return seg;
  return "en";
}

export default function RootNotFound() {
  const [lang, setLang] = React.useState<Lang>("en");

  React.useEffect(() => {
    setLang(inferLang(window.location.pathname));
  }, []);

  const c = COPY[lang];
  const isRtl = lang === "ar";

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-y-auto bg-muted px-4 py-8 pb-24 sm:p-6 sm:pb-24 md:p-10">
      <AuthLiquidBackground />

      {/* Mode toggle — top-right (ltr) or top-left (rtl) */}
      <div
        className={`absolute top-[max(1rem,env(safe-area-inset-top,1rem))] z-20 ${
          isRtl
            ? "left-[max(1rem,env(safe-area-inset-left,1rem))]"
            : "right-[max(1rem,env(safe-area-inset-right,1rem))]"
        }`}
      >
        <ModeToggle />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <Image
          src="/assets/server-failure_syqp.svg"
          alt=""
          width={260}
          height={219}
          priority
          aria-hidden="true"
          className="w-52 sm:w-64 dark:opacity-80"
        />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{c.description}</p>
        </div>

        <Button
          size="lg"
          className="w-full max-w-xs"
          onClick={() => window.history.back()}
        >
          {c.back}
        </Button>
      </div>

      {/* Language switcher — fixed bottom-left, same visual as auth */}
      <div className="fixed bottom-6 left-6 right-6 z-50 flex items-center justify-start">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-border/70 bg-background/80 px-3 font-medium shadow-sm backdrop-blur hover:bg-background"
            >
              <Globe className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-6 text-center tabular-nums">{SHORT[lang]}</span>
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            <DropdownMenuRadioGroup
              value={lang}
              onValueChange={(v) => {
                setLang(v as Lang);
                window.location.href = `/${v}`;
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
      </div>
    </div>
  );
}
