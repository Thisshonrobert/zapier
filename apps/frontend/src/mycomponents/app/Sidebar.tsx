"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Blocks,
  FileText,
  History,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Server,
} from "lucide-react";
import { MvpAction } from "./MvpDialog";

const NAV = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Assets", icon: LayoutGrid },
  { label: "Templates", icon: FileText },
  { label: "App connections", href: "/connections", icon: Blocks },
  { label: "MCP servers", icon: Server, badge: "New" },
  { label: "Zap history", href: "/history", icon: History },
  { label: "More", icon: MoreHorizontal },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = "href" in item && pathname === item.href;
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
                {"badge" in item && item.badge ? (
                  <span className="ml-auto rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                    {item.badge}
                  </span>
                ) : null}
              </span>
            );

            return "href" in item && item.href ? (
              <Link key={item.label} href={item.href}>
                {content}
              </Link>
            ) : (
              <MvpAction key={item.label} className="cursor-pointer">
                {content}
              </MvpAction>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-zinc-200 pt-4 text-xs text-zinc-600">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">Plan tasks</span>
          <span>0 / 100</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full w-0 rounded-full bg-[#FF4F00]" />
        </div>
        <p className="mt-3 text-zinc-500">Usage resets in 4 weeks</p>
      </div>
    </aside>
  );
}
