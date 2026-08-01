"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Compass, HelpCircle, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "./Sidebar";
import { MvpAction } from "./MvpDialog";

function TopBar() {
  const router = useRouter();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-4">
      <img
        src="/Zapier-logo.png"
        alt="Zapier"
        className="h-7 w-auto cursor-pointer"
        onClick={() => router.push("/dashboard")}
      />

      <MvpAction className="mx-auto hidden w-full max-w-xl lg:block" title="Search">
        <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-500 transition hover:border-zinc-400">
          <Search className="h-4 w-4" />
          <span>Search assets, apps, templates, and more</span>
          <kbd className="ml-auto rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
            Ctrl K
          </kbd>
        </div>
      </MvpAction>

      <div className="ml-auto flex items-center gap-1">
        <MvpAction className="hidden sm:block" title="Help">
          <span className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            <HelpCircle className="h-4 w-4" /> Help
          </span>
        </MvpAction>
        <MvpAction className="hidden sm:block" title="Explore apps">
          <span className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            <Compass className="h-4 w-4" /> Explore apps
          </span>
        </MvpAction>
        <MvpAction title="Contact Sales">
          <span className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
            Contact Sales
          </span>
        </MvpAction>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="ml-2 h-8 w-8 cursor-pointer">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                localStorage.setItem("token", "");
                router.push("/");
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col bg-white">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-[#fffdf9]">{children}</main>
      </div>
    </div>
  );
}
