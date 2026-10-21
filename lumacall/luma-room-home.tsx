"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Plus } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { NameModal } from "@/components/ui/name-modal";
import { createRoomCode } from "@/lib/utils";

export function HomeClient() {
  const router = useRouter();
  const [nameOpen, setNameOpen] = useState(false);

  return (
    <main className="lc-start flex min-h-dvh flex-col bg-[#090b0e] px-5">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between">
        <Brand />
        <span className="rounded-lg border border-white/[.07] bg-[#15181e] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-zinc-500">Sua sala, seu espaço.</span>
      </header>

      <div className="flex flex-1 items-center justify-center pb-24">
        <div className="flex w-full max-w-[490px] flex-col items-center gap-8 text-center">
          <div className="grid size-24 place-items-center rounded-[27px] border border-white/[.11] bg-[#171b23] p-4 shadow-[0_18px_56px_rgba(0,0,0,.35)]">
            <img src="/icons/lumacall-obsidian-mark.svg" alt="" className="size-full" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-[-.055em] text-[#f4f4f7] sm:text-5xl">LumaCall</h1>
          </div>
          <button
            type="button"
            onClick={() => setNameOpen(true)}
            className="focus-ring group flex w-full items-center justify-between rounded-2xl border border-[#c5c0ff] bg-[#beb9f8] px-5 py-4 text-left text-[15px] font-bold text-[#11131c] transition-colors hover:bg-[#d2ceff] sm:px-6 sm:py-5"
          >
            <span className="flex items-center gap-3"><Plus className="size-5" />Criar sua sala</span>
            <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>

      <NameModal
        open={nameOpen}
        onClose={() => setNameOpen(false)}
        onSave={() => {
          setNameOpen(false);
          router.push("/sala/" + createRoomCode());
        }}
      />
    </main>
  );
}
