"use client";

import { useRouter } from "next/navigation";
import { Bot, FileInput, MessageSquare, Plug, Zap as ZapIcon } from "lucide-react";
import { LoaderOne } from "@/components/ui/loader";
import { ZapTable } from "@/mycomponents/ZapTable";
import { AppShell } from "@/mycomponents/app/AppShell";
import { MvpAction } from "@/mycomponents/app/MvpDialog";
import { useZaps } from "@/hooks/useZaps";

export type { Zap } from "@/types/zap";

const SCRATCH_CARDS = [
  {
    label: "Zap",
    description: "Automated workflows",
    icon: ZapIcon,
    tint: "bg-orange-100 text-[#FF4F00]",
    href: "/zap/create",
  },
  { label: "Agent", description: "AI teammates", icon: Bot, tint: "bg-red-100 text-red-600" },
  {
    label: "Chatbot",
    description: "AI-powered chatbot",
    icon: MessageSquare,
    tint: "bg-purple-100 text-purple-600",
  },
  { label: "MCP", description: "AI tool integrations", icon: Plug, tint: "bg-pink-100 text-pink-600" },
  { label: "Form", description: "Automation-ready forms", icon: FileInput, tint: "bg-amber-100 text-amber-600" },
] as const;

export default function DashboardPage() {
  const { loading, zaps } = useZaps();
  const router = useRouter();

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <h1 className="mb-1 text-3xl font-bold tracking-tight text-zinc-900">
          Welcome back
        </h1>
        <p className="mb-8 text-sm text-zinc-600">
          Build a workflow, then watch every run land in your Zap history.
        </p>

        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          Start from scratch
        </h2>
        <div className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SCRATCH_CARDS.map((card) => {
            const Icon = card.icon;
            const body = (
              <div className="flex h-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${card.tint}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-zinc-900">
                    {card.label}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    {card.description}
                  </span>
                </span>
              </div>
            );

            return "href" in card && card.href ? (
              <button
                key={card.label}
                className="text-left"
                onClick={() => router.push(card.href)}
              >
                {body}
              </button>
            ) : (
              <MvpAction key={card.label} className="cursor-pointer" title={card.label}>
                {body}
              </MvpAction>
            );
          })}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">My Zaps</h2>
          <button
            onClick={() => router.push("/zap/create")}
            className="rounded-lg bg-[#FF4F00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e64700]"
          >
            Create
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <LoaderOne />
          </div>
        ) : (
          <ZapTable zaps={zaps} />
        )}
      </div>
    </AppShell>
  );
}
