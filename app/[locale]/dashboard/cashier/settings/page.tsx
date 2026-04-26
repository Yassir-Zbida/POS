"use client";

import * as React from "react";
import { KeyRound, ShieldCheck, Eye, EyeOff, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/store/use-auth-store";

// ─── PIN input (single digit box, like OTP) ────────────────────────────────

type PinInputProps = {
  length?: number;
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
  autoFocus?: boolean;
  hidden?: boolean;
};

function PinInput({ length = 4, value, onChange, label, autoFocus, hidden = true }: PinInputProps) {
  const refs = React.useRef<Array<HTMLInputElement | null>>(Array(length).fill(null));

  React.useEffect(() => {
    if (autoFocus) setTimeout(() => refs.current[0]?.focus(), 50);
  }, [autoFocus]);

  function handleChange(i: number, raw: string) {
    const ch = raw.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = ch;
    onChange(next);
    if (ch && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (value[i]) {
        const next = [...value]; next[i] = ""; onChange(next);
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < length - 1) {
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent, start: number) {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!digits) return;
    const next = [...value];
    for (let i = 0; i < digits.length; i++) {
      if (start + i < length) next[start + i] = digits[i];
    }
    onChange(next);
    const focus = Math.min(start + digits.length, length - 1);
    refs.current[focus]?.focus();
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-center gap-2" dir="ltr">
        {value.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type={hidden ? "password" : "text"}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete="off"
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={(e) => handlePaste(e, i)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "h-12 w-10 rounded-lg border bg-background text-center font-mono text-lg font-semibold transition-colors",
              "focus:outline-none focus:ring-1 focus:ring-ring/50 focus:border-ring/60",
              digit
                ? "border-ring/40 text-foreground"
                : "border-input text-muted-foreground",
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ─── PIN Setup card ─────────────────────────────────────────────────────────

type Step = "idle" | "verify-current" | "set-new";

export default function StaffSettingsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [hasPinSet, setHasPinSet] = React.useState<boolean | null>(null);
  const [step, setStep] = React.useState<Step>("idle");
  const [pending, setPending] = React.useState(false);
  const [showPins, setShowPins] = React.useState(false);

  // Current PIN (for change-PIN flow)
  const [currentPin, setCurrentPin] = React.useState<string[]>(Array(4).fill(""));
  // New PIN
  const [newPin, setNewPin] = React.useState<string[]>(Array(4).fill(""));
  const [confirmPin, setConfirmPin] = React.useState<string[]>(Array(4).fill(""));

  // Load PIN status on mount
  React.useEffect(() => {
    if (!accessToken) return;
    void fetch("/api/v1/auth/pin/set", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d: { hasPinSet: boolean }) => setHasPinSet(d.hasPinSet))
      .catch(() => setHasPinSet(false));
  }, [accessToken]);

  function reset() {
    setStep("idle");
    setCurrentPin(Array(4).fill(""));
    setNewPin(Array(4).fill(""));
    setConfirmPin(Array(4).fill(""));
    setShowPins(false);
  }

  async function handleVerifyCurrentPin() {
    const pin = currentPin.join("");
    if (pin.length < 4) {
      toast.error("Entrez votre PIN actuel (4 chiffres)");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/v1/auth/pin/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; remainingSeconds?: number };

      if (res.status === 423) {
        const mins = Math.ceil((data.remainingSeconds ?? 300) / 60);
        toast.error(`Compte verrouillé — réessayez dans ${mins} min`);
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "PIN incorrect");
        setCurrentPin(Array(4).fill(""));
        return;
      }
      setStep("set-new");
    } finally {
      setPending(false);
    }
  }

  async function handleSetPin() {
    const pin = newPin.join("");
    const confirm = confirmPin.join("");
    if (pin.length < 4) { toast.error("PIN incomplet (4 chiffres requis)"); return; }
    if (pin !== confirm) { toast.error("Les deux PINs ne correspondent pas"); return; }
    setPending(true);
    try {
      const res = await fetch("/api/v1/auth/pin/set", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      toast.success(hasPinSet ? "PIN modifié avec succès" : "PIN configuré avec succès");
      setHasPinSet(true);
      reset();
    } finally {
      setPending(false);
    }
  }

  const currentComplete = currentPin.every(Boolean);
  const newComplete = newPin.every(Boolean);
  const confirmComplete = confirmPin.every(Boolean);

  return (
    <div className="space-y-6">
      {/* ── Appearance ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Apparence</CardTitle>
            <CardDescription>Préférences d&apos;affichage de l&apos;interface</CardDescription>
          </div>
          <ThemeToggle />
        </CardHeader>
      </Card>

      {/* ── PIN Lock ── */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <KeyRound className="size-5 text-primary" />
            </div>
            <div>
              <CardTitle>Verrouillage par PIN</CardTitle>
              <CardDescription className="mt-0.5">
                {hasPinSet
                  ? "Votre caisse est protégée par un PIN à 4 chiffres."
                  : "Configurez un PIN à 4 chiffres pour verrouiller votre caisse automatiquement."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {hasPinSet && step === "idle" && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-medium text-green-700 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-400">
              <ShieldCheck className="size-4 shrink-0" />
              PIN actif — la caisse se verrouille automatiquement après 15 min d&apos;inactivité
            </div>
          )}

          {/* idle → show action button */}
          {step === "idle" && (
            <Button
              onClick={() => setStep(hasPinSet ? "verify-current" : "set-new")}
              variant={hasPinSet ? "outline" : "default"}
              className="w-full sm:w-auto"
              disabled={hasPinSet === null}
            >
              {hasPinSet ? "Modifier le PIN" : "Configurer votre PIN"}
            </Button>
          )}

          {/* verify-current step */}
          {step === "verify-current" && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Étape 1 — Vérification du PIN actuel</p>
                <button
                  type="button"
                  onClick={() => setShowPins((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showPins ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {showPins ? "Masquer" : "Afficher"}
                </button>
              </div>

              <PinInput
                label="PIN actuel"
                value={currentPin}
                onChange={setCurrentPin}
                hidden={!showPins}
                autoFocus
              />

              <div className="flex gap-2">
                <Button
                  onClick={handleVerifyCurrentPin}
                  disabled={!currentComplete || pending}
                  className="flex-1 sm:flex-none"
                >
                  {pending ? "Vérification…" : "Continuer"}
                </Button>
                <Button variant="ghost" onClick={reset} disabled={pending}>
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* set-new step */}
          {step === "set-new" && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  {hasPinSet ? "Étape 2 — Nouveau PIN" : "Définir votre PIN"}
                </p>
                <button
                  type="button"
                  onClick={() => setShowPins((v) => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showPins ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  {showPins ? "Masquer" : "Afficher"}
                </button>
              </div>

              <div className="space-y-4">
                <PinInput
                  label="Nouveau PIN"
                  value={newPin}
                  onChange={setNewPin}
                  hidden={!showPins}
                  autoFocus
                />

                <PinInput
                  label="Confirmer le PIN"
                  value={confirmPin}
                  onChange={setConfirmPin}
                  hidden={!showPins}
                />

                {newComplete && confirmComplete && newPin.join("") !== confirmPin.join("") && (
                  <p className="text-sm text-destructive">Les PINs ne correspondent pas</p>
                )}

                {newComplete && confirmComplete && newPin.join("") === confirmPin.join("") && (
                  <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <Check className="size-3.5" />
                    PINs identiques
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSetPin}
                  disabled={
                    !newComplete ||
                    !confirmComplete ||
                    newPin.join("") !== confirmPin.join("") ||
                    pending
                  }
                  className={cn(
                    "flex-1 sm:flex-none",
                    newComplete && confirmComplete && newPin.join("") === confirmPin.join("") &&
                      "bg-primary",
                  )}
                >
                  {pending ? "Sauvegarde…" : hasPinSet ? "Enregistrer le nouveau PIN" : "Activer le PIN"}
                </Button>
                <Button variant="ghost" onClick={reset} disabled={pending}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
