"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BadgeCheck, KeyRound, LockKeyhole, UserRound, X } from "lucide-react";
import { sanitizeDisplayName } from "@/lib/utils";

export const DISPLAY_NAME_KEY = "lumacall.displayName";
export const RESERVED_NAME_PROOF_KEY = "lumacall.reservedNameProof";

function reservedName(value: string) {
  const normalized = sanitizeDisplayName(value).toLocaleLowerCase("pt-BR");
  if (normalized === "ohenrique") return { name: "OHenrique", label: "Criador" };
  if (normalized === "userqubo") return { name: "UserQubo", label: "Editor" };
  return null;
}

export function NameModal({
  open,
  initialName = "",
  onSave,
  onClose,
}: {
  open: boolean;
  initialName?: string;
  onSave: (name: string, reservedNameProof?: string) => void;
  onClose?: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const reserved = useMemo(() => reservedName(name), [name]);

  useEffect(() => {
    setName(initialName);
    setCode("");
    setError("");
  }, [initialName, open]);

  useEffect(() => {
    if (!open || !onClose) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = sanitizeDisplayName(name);
    if (clean.length < 2) {
      setError("Digite um nome com pelo menos 2 caracteres.");
      return;
    }

    const selectedReserved = reservedName(clean);
    if (!selectedReserved) {
      localStorage.setItem(DISPLAY_NAME_KEY, clean);
      localStorage.removeItem(RESERVED_NAME_PROOF_KEY);
      onSave(clean);
      return;
    }

    const savedName = sanitizeDisplayName(localStorage.getItem(DISPLAY_NAME_KEY) || "");
    const savedProof = localStorage.getItem(RESERVED_NAME_PROOF_KEY) || "";
    if (
      savedProof &&
      savedName.toLocaleLowerCase("pt-BR") === selectedReserved.name.toLocaleLowerCase("pt-BR") &&
      !code
    ) {
      onSave(selectedReserved.name, savedProof);
      return;
    }

    if (!code.trim()) {
      setError("Digite o código de acesso deste nome reservado.");
      return;
    }

    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/livekit/reserved-name", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: selectedReserved.name, code }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Código incorreto.");

      localStorage.setItem(DISPLAY_NAME_KEY, payload.displayName);
      localStorage.setItem(RESERVED_NAME_PROOF_KEY, payload.proof);
      setCode("");
      onSave(payload.displayName, payload.proof);
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : "Não foi possível validar o código.");
    } finally {
      setChecking(false);
    }
  }

  const alreadyVerified = Boolean(
    reserved &&
    localStorage.getItem(RESERVED_NAME_PROOF_KEY) &&
    sanitizeDisplayName(localStorage.getItem(DISPLAY_NAME_KEY) || "").toLocaleLowerCase("pt-BR") ===
      reserved.name.toLocaleLowerCase("pt-BR"),
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="name-title">
      <form onSubmit={submit} className="glass relative w-full max-w-[420px] rounded-3xl p-7">
        {onClose && <button type="button" onClick={onClose} className="focus-ring absolute right-5 top-5 rounded-lg p-2 text-zinc-500 hover:bg-white/[.05] hover:text-white" aria-label="Fechar"><X className="size-4" /></button>}
        <div className="mb-5 grid size-11 place-items-center rounded-2xl bg-violet-400/10 text-violet-300">
          {reserved ? <LockKeyhole className="size-5" /> : <UserRound className="size-5" />}
        </div>
        <h2 id="name-title" className="text-xl font-semibold tracking-[-.025em]">
          {reserved ? "Este nome é reservado" : "Como devemos chamar você?"}
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {reserved
            ? `${reserved.name} possui uma identidade personalizada no LunaCall.`
            : "Esse nome aparece apenas dentro das salas em que você entrar."}
        </p>

        <label className="mt-6 block text-xs font-medium text-zinc-400" htmlFor="display-name">Seu nome</label>
        <input
          id="display-name"
          autoFocus
          maxLength={24}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setCode("");
            setError("");
          }}
          placeholder="Seu nome"
          className="focus-ring mt-2 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-zinc-600"
        />

        {reserved && (
          <div className="mt-4 rounded-2xl border border-violet-300/15 bg-violet-300/[.045] p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-200">
              <BadgeCheck className="size-4" />
              Identidade {reserved.label}
            </div>
            {alreadyVerified && !code ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-300/[.04] px-3 py-2.5 text-xs text-emerald-200">
                <BadgeCheck className="size-4" />
                Identidade já verificada neste navegador.
              </div>
            ) : (
              <>
                <label className="mt-3 block text-xs font-medium text-zinc-400" htmlFor="reserved-code">
                  Código de acesso
                </label>
                <div className="relative mt-2">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                  <input
                    id="reserved-code"
                    type="password"
                    autoComplete="off"
                    value={code}
                    onChange={(event) => { setCode(event.target.value); setError(""); }}
                    placeholder="Digite o código"
                    className="focus-ring w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
        <button disabled={checking} className="focus-ring mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50">
          {checking ? "Verificando..." : reserved ? (alreadyVerified && !code ? "Continuar como " + reserved.name : "Validar e continuar") : "Continuar"}
        </button>
      </form>
    </div>
  );
}
