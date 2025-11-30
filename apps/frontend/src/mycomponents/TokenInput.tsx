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
    <div className="relative w-full">

      {/* Token overlay */}
      <div
        className="absolute inset-0 flex items-center px-2 py-1 gap-1 pointer-events-none"
        style={{ whiteSpace: "pre-wrap" }}
      >
        {tokens.map((part, i) =>
          part.startsWith("{{") ? (
            <Badge
              key={i}
              className="bg-orange-500 text-white text-xs h-5 flex items-center"
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
        className="w-full border rounded px-2 py-1 bg-transparent text-transparent caret-black"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
