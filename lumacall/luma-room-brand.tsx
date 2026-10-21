import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" aria-label="Página inicial do LumaCall" className="focus-ring inline-flex items-center gap-2.5 rounded-xl text-white no-underline">
    <img src="/icons/lumacall-obsidian-mark.svg" alt="" width="34" height="34" className="size-[34px] rounded-[10px]" />
    {!compact && <span className="text-[15px] font-bold tracking-[-.025em] text-[#eaeaf0]">{APP_NAME}</span>}
  </Link>;
}
