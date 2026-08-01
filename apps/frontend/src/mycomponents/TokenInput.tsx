"use client";
import { useRef } from "react";
import { Badge } from "@/components/ui/badge";

export function TokenInput({
  value,
  onChange
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const tokens = value.split(/(\{\{[^}]+\}\})/g).filter(Boolean);

  return (
    <div className="group relative w-full">

      {/* Token overlay */}
      <div
        className="absolute inset-0 flex items-center gap-1 overflow-hidden px-3 text-sm text-zinc-900 pointer-events-none"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {tokens.map((part, i) =>
          part.startsWith("{{") ? (
            <Badge
              key={i}
              className="h-5 flex items-center rounded-md bg-orange-100 px-1.5 text-xs font-medium text-[#c93f00] ring-1 ring-orange-200"
            >
              {part.replace("{{", "").replace("}}", "")}
            </Badge>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </div>

      {/* Real input under badges */}
      <input
        ref={inputRef}
        className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-transparent caret-zinc-900 transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#FF4F00] focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
