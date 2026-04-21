import Image from "next/image";

import { Link } from "@/i18n/navigation";
import { LanguageSwitcherFooter } from "@/components/language-switcher-footer";
import { SignupForm } from "@/components/signup-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 pb-24 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center justify-center self-center">
          <Image
            src="/assets/brand/logo.svg"
            alt="Hssabaty"
            width={160}
            height={40}
            priority
          />
        </Link>
        <SignupForm />
      </div>
      <LanguageSwitcherFooter />
    </div>
  );
}

