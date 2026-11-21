"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Grain, Input, Label, Tape, ZineButton, ZineCardRough } from "@moonwitness/ui";
import { ArrowRight, Crown, Star4 } from "@moonwitness/ui/icons";
import { useCreateSuperuser, useSetupStatus } from "@/lib/api/onboarding";

type Step = "instance" | "account" | "review";

const STEPS: { id: Step; label: string }[] = [
  { id: "instance", label: "Instance" },
  { id: "account", label: "Superuser" },
  { id: "review", label: "Selesai" },
];

function StepRail({ current }: { current: Step }) {
  const index = STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const state = i < index ? "done" : i === index ? "active" : "todo";
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center border text-[10px] font-bold ${state === "done" ? "border-[var(--green)] bg-[var(--green)]/15 text-[var(--green)]" : state === "active" ? "border-[var(--pink)] bg-[var(--pink)]/15 text-[var(--pink)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`}
            >
              {i + 1}
            </span>
            <span
              className={`text-[10px] tracking-[0.2em] ${state === "todo" ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]"}`}
            >
              {step.label.toUpperCase()}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-[var(--line)]" />}
          </li>
        );
      })}
    </ol>
  );
}

function OnboardingField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="mb-1.5 block text-xs font-bold tracking-wider text-[var(--foreground)]"
      >
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-[var(--red)]">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">{hint}</p>
      )}
    </div>
  );
}

export function Onboarding() {
  const router = useRouter();
  const status = useSetupStatus();
  const create = useCreateSuperuser();

  const [step, setStep] = useState<Step>("instance");
  const [instanceName, setInstanceName] = useState("Moonwitness");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordHint = useMemo(() => "Minimal 12 karakter (maks 72 byte).", []);

  if (status.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-brush text-2xl text-[var(--pink)]">
        MEMERIKSA INSTANCE…
      </div>
    );
  }

  if (status.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ZineCardRough className="max-w-lg p-6">
          <h1 className="font-brush text-2xl text-[var(--red)]">CONTROL PLANE TIDAK TERJANGKAU</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {(status.error as Error).message}. Pastikan arsy berjalan dan <code>ARSY_URL</code> di
            apps/api sudah benar.
          </p>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            Di VPS: <code>{`sudo ./install.sh --with-app --with-caddy --domain <host>`}</code>, lalu{" "}
            <code>systemctl status arsy.service</code>.
          </p>
        </ZineCardRough>
      </div>
    );
  }

  if (status.data?.initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <ZineCardRough className="max-w-md p-7 text-center">
          <Crown className="mx-auto h-8 w-12 text-[var(--yellow)]" />
          <h1 className="mt-3 font-brush text-3xl text-[var(--foreground)]">
            SUDAH <span className="text-[var(--pink)]">TERPASANG</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Instance{" "}
            <strong className="text-[var(--foreground)]">{status.data.instance.name}</strong> sudah
            punya akun. Masuk lewat halaman control.
          </p>
          <ZineButton asChild className="mt-5 inline-flex px-5 py-3 text-sm">
            <Link href="/control">
              MASUK KE CONTROL PLANE <ArrowRight className="h-4 w-4" />
            </Link>
          </ZineButton>
        </ZineCardRough>
      </div>
    );
  }

  function validateAccount(): boolean {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Nama minimal 2 karakter.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = "Format email tidak valid.";
    const pwdBytes = new TextEncoder().encode(password).length;
    if (pwdBytes < 12 || pwdBytes > 72)
      next.password = "Password minimal 12 karakter (maks 72 byte).";
    if (confirm !== password) next.confirm = "Konfirmasi password tidak sama.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validateAccount()) {
      setStep("account");
      return;
    }
    create.mutate(
      { name, email, password, instanceName },
      {
        onSuccess: () => {
          setStep("review");
          router.refresh();
        },
        onError: (error: Error) => {
          setErrors({ form: error.message });
        },
      },
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Grain />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(255,45,120,0.16), transparent 55%), radial-gradient(circle at 80% 80%, rgba(46,168,255,0.14), transparent 55%)",
        }}
      />
      <Star4 className="absolute right-[12%] top-24 hidden h-10 w-10 text-[var(--pink)] lg:block" />

      <header className="relative z-10 flex h-16 items-center justify-between border-b border-[var(--border)] px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Crown className="h-5 w-8 text-[var(--yellow)]" />
          <span className="font-brush text-xl text-[var(--foreground)] sm:text-2xl">
            {" "}
            MOON<span className="text-[var(--pink)]">WITNESS</span>{" "}
          </span>
        </Link>
        <span className="font-hand text-lg text-[var(--muted-foreground)]">First light setup</span>
      </header>

      <main id="main" className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:px-8">
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.3em] text-[var(--muted-foreground)]">
            CONTROL PLANE / ONBOARDING
          </p>
          <h1 className="mt-1 font-brush text-4xl text-[var(--foreground)] sm:text-5xl">
            {" "}
            WELCOME TO <span className="text-[var(--pink)]">THE SHADOW</span>{" "}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted-foreground)]">
            {" "}
            Instance ini belum punya akun. Buat superuser pertama — hanya bisa dilakukan sekali,
            langsung dari host ini.{" "}
          </p>
        </div>

        <div className="mb-5">
          <StepRail current={step} />
        </div>

        <ZineCardRough className="relative p-6 sm:p-8">
          <Tape className="-top-3 left-10 -rotate-3" />

          {step === "instance" && (
            <div className="space-y-5">
              <OnboardingField
                id="instance"
                label="NAMA INSTANCE"
                hint="Tampil di header dashboard. Bisa diubah nanti."
              >
                <Input
                  id="instance"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Moonwitness"
                  className="rounded-md px-4 py-3 text-sm bg-[var(--background)] border-[var(--border)] focus:border-[var(--pink)] focus:ring-[var(--pink)]"
                />
              </OnboardingField>
              <div className="border border-[var(--border)] bg-[var(--background)] p-3 text-[11px] text-[var(--muted-foreground)]">
                Versi arsy{" "}
                <span className="text-[var(--foreground)]">{status.data?.version ?? "—"}</span> ·
                Instance ID{" "}
                <span className="font-mono text-[var(--muted-foreground)]">
                  {status.data?.instance?.id ?? "—"}
                </span>
              </div>
              <div className="flex justify-end">
                <ZineButton onClick={() => setStep("account")} className="px-5 py-3 text-sm">
                  {" "}
                  LANJUT <ArrowRight className="h-4 w-4" />{" "}
                </ZineButton>
              </div>
            </div>
          )}

          {step === "account" && (
            <form
              className="space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setStep("review");
              }}
            >
              <OnboardingField id="name" label="NAMA" error={errors.name}>
                <Input
                  id="name"
                  value={name}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rezza"
                  aria-invalid={!!errors.name}
                  className="rounded-md px-4 py-3 text-sm bg-[var(--background)] border-[var(--border)] focus:border-[var(--pink)] focus:ring-[var(--pink)]"
                />
              </OnboardingField>
              <OnboardingField id="email" label="EMAIL" error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  autoComplete="username"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  className="rounded-md px-4 py-3 text-sm bg-[var(--background)] border-[var(--border)] focus:border-[var(--pink)] focus:ring-[var(--pink)]"
                />
              </OnboardingField>
              <OnboardingField
                id="password"
                label="PASSWORD"
                hint={passwordHint}
                error={errors.password}
              >
                <Input
                  id="password"
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  aria-invalid={!!errors.password}
                  className="rounded-md px-4 py-3 text-sm bg-[var(--background)] border-[var(--border)] focus:border-[var(--pink)] focus:ring-[var(--pink)]"
                />
              </OnboardingField>
              <OnboardingField id="confirm" label="ULANGI PASSWORD" error={errors.confirm}>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  autoComplete="new-password"
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••••"
                  aria-invalid={!!errors.confirm}
                  className="rounded-md px-4 py-3 text-sm bg-[var(--background)] border-[var(--border)] focus:border-[var(--pink)] focus:ring-[var(--pink)]"
                />
              </OnboardingField>
              <div className="flex items-center justify-between">
                <ZineButton
                  type="button"
                  tone="paper"
                  onClick={() => setStep("instance")}
                  className="px-4 py-3 text-sm"
                >
                  {" "}
                  KEMBALI{" "}
                </ZineButton>
                <ZineButton type="submit" className="px-5 py-3 text-sm">
                  {" "}
                  REVIEW <ArrowRight className="h-4 w-4" />{" "}
                </ZineButton>
              </div>
            </form>
          )}

          {step === "review" && (
            <div className="space-y-5">
              <h2 className="font-brush text-2xl text-[var(--foreground)]">
                {" "}
                SIAP <span className="text-[var(--green)]">DIBUKA</span>{" "}
              </h2>
              <dl className="divide-y divide-[var(--line)] border border-[var(--border)]">
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-[10px] tracking-[0.2em] text-[var(--muted-foreground)]">
                    INSTANCE
                  </dt>
                  <dd className="text-sm text-[var(--foreground)]">
                    {instanceName || "Moonwitness"}
                  </dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-[10px] tracking-[0.2em] text-[var(--muted-foreground)]">
                    SUPERUSER
                  </dt>
                  <dd className="text-sm text-[var(--foreground)]">{name || "—"}</dd>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <dt className="text-[10px] tracking-[0.2em] text-[var(--muted-foreground)]">
                    EMAIL
                  </dt>
                  <dd className="font-mono text-xs text-[var(--foreground)]">{email || "—"}</dd>
                </div>
              </dl>
              {errors.form && (
                <p
                  role="alert"
                  className="border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-2 text-xs text-[var(--red)]"
                >
                  {" "}
                  {errors.form}{" "}
                </p>
              )}
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {" "}
                Setelah dibuat, endpoint setup ditutup permanen. Simpan kredensial di tempat
                aman.{" "}
              </p>
              <div className="flex items-center justify-between">
                <ZineButton
                  type="button"
                  tone="paper"
                  onClick={() => setStep("account")}
                  className="px-4 py-3 text-sm"
                  disabled={create.isPending}
                >
                  {" "}
                  KEMBALI{" "}
                </ZineButton>
                <ZineButton
                  type="button"
                  onClick={submit}
                  disabled={create.isPending}
                  className="px-5 py-3 text-sm"
                >
                  {" "}
                  {create.isPending ? "MEMBUAT…" : "BUAT SUPERUSER"}{" "}
                </ZineButton>
              </div>
            </div>
          )}
        </ZineCardRough>

        <p className="mt-5 text-center text-[11px] text-[var(--muted-foreground)]">
          {" "}
          Setup hanya tersedia dari host ini (loopback / SSH tunnel).{" "}
        </p>
      </main>
    </div>
  );
}
