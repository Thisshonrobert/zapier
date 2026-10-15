"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Blocks,
  History,
  Home,
  LifeBuoy,
  Plus,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { useViewerCapabilities } from "@/hooks/useViewerCapabilities";
import { visibleNavigation, type NavigationItem } from "@/types/engineering";

/** `role` marks a link only a privileged account may use. The backend still authorizes
 * every request; hiding the link only avoids advertising a workspace the viewer cannot open. */
const NAV = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "App connections", href: "/connections", icon: Blocks },
  { label: "Zap history", href: "/history", icon: History },
  { label: "Your failures", href: "/failures", icon: LifeBuoy },
  { label: "Support triage", href: "/triage", icon: ShieldCheck, role: "isSupportOperator" },
  { label: "Engineering", href: "/engineering", icon: Wrench, role: "isEngineer" },
] as const satisfies readonly (NavigationItem & { icon: LucideIcon })[];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const capabilities = useViewerCapabilities();
  const items = visibleNavigation(NAV, capabilities);

  return (
    <aside className="hidden md:flex w-[248px] shrink-0 flex-col justify-between border-r border-zinc-200 bg-white px-3 py-4">
      <div>
        <button
          onClick={() => router.push("/zap/create")}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF4F00] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e64700]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create
        </button>

        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const content = (
              <span
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-orange-50 font-semibold text-[#FF4F00]"
                    : "font-medium text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {item.label}
              </span>
            );

            return (
              <Link key={item.label} href={item.href}>
                {content}
              </Link>
            );
          })}
        </nav>
      </div>

    </aside>
  );
}
