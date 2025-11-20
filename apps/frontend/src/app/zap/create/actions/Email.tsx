"use client";

import { useState } from "react";
import { FieldPicker } from "@/mycomponents/fieldPicker";
import { useZapStore } from "@/app/store/zapStore";
import { toast } from "sonner";

export function Email({ nodeId }: { nodeId: string }) {
  const updateAction = useZapStore(s => s.updateAction);

  // simple local state
  const [to, setTo] = useState("");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // inserts variables like {{trigger.body}}
  const insertVariable = (field: "to" | "from" | "subject" | "body", value: string) => {
    if (field === "body") setBody(prev => prev + " " + value);
    if (field === "to") setTo(prev => prev + " " + value);
    if (field === "from") setFrom(prev => prev + " " + value);
    if (field === "subject") setSubject(prev => prev + " " + value);
  };

  const saveAction = () => {
    updateAction(nodeId, {
      metadata: { to, from, subject, body }
    });
    toast.success("action saved");
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Email Action</h2>

      {/* To */}
      <div>
        <div className="flex justify-between items-center">
          <label>To</label>
          <FieldPicker onSelect={v => insertVariable("to", v)} />
        </div>
        <input
          value={to}
          onChange={e => setTo(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      {/* From */}
      <div>
        <div className="flex justify-between items-center">
          <label>From</label>
          <FieldPicker onSelect={v => insertVariable("from", v)} />
        </div>
        <input
          value={from}
          onChange={e => setFrom(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      {/* Subject */}
      <div>
        <div className="flex justify-between items-center">
          <label>Subject</label>
          <FieldPicker onSelect={v => insertVariable("subject", v)} />
        </div>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      {/* Body */}
      <div>
        <div className="flex justify-between items-center">
          <label>Body</label>
          <FieldPicker onSelect={v => insertVariable("body", v)} />
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          className="w-full border p-2 rounded h-28"
        />
      </div>

      <button
        onClick={saveAction}
        className="px-4 py-2 w-full bg-purple-600 hover:bg-purple-700 text-white rounded"
      >
        Save Email Action
      </button>
    </div>
  );
}
