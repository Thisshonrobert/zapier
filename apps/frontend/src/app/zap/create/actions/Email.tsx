"use client";

import { useState } from "react";
import { FieldPicker } from "@/mycomponents/fieldPicker";
import { TokenInput } from "@/mycomponents/TokenInput";
import { useZapStore } from "@/app/store/zapStore";
import { toast } from "sonner";

export function Email({ nodeId }: { nodeId: string }) {
  const updateAction = useZapStore(s => s.updateAction);

  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const saveAction = () => {
    updateAction(nodeId, { metadata: { to, from, subject, body }});
    toast.success("Action saved");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Email Action</h2>

      {/* TO */}
      <div>
        <label className="block mb-1">To</label>
        <div className="flex gap-2 items-center">
          <TokenInput value={to} onChange={setTo} />
          <FieldPicker onSelect={(v) => setTo(p => p + "" + v)} />
        </div>
      </div>

      {/* FROM */}
      <div>
        <label className="block mb-1">From</label>
        <div className="flex gap-2 items-center">
          <TokenInput value={from} onChange={setFrom} />
          <FieldPicker onSelect={(v) => setFrom(p => p + "" + v)} />
        </div>
      </div>

      {/* SUBJECT */}
      <div>
        <label className="block mb-1">Subject</label>
        <div className="flex gap-2 items-center">
          <TokenInput value={subject} onChange={setSubject} />
          <FieldPicker onSelect={(v) => setSubject(p => p + "" + v)} />
        </div>
      </div>

      {/* BODY */}
      <div>
        <label className="block mb-1">Body</label>
        <div className="flex gap-2 items-center">
          <TokenInput value={body} onChange={setBody} />
          <FieldPicker onSelect={(v) => setBody(p => p + "" + v)} />
        </div>
      </div>

      <button
        onClick={saveAction}
        className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Save Email Action
      </button>
    </div>
  );
}
