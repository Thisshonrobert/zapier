"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { FieldPicker } from "@/mycomponents/fieldPicker";
import { TokenInput } from "@/mycomponents/TokenInput";
import { useZapStore } from "@/app/store/zapStore";
import { toast } from "sonner";
import { DialogHeading, Field, btnPrimary } from "@/mycomponents/app/FormKit";

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
    <div className="space-y-5">
      <DialogHeading
        icon={Mail}
        title="Email action"
        description="Compose the message this step will send when the Zap runs."
        tint="sky"
      />

      <div className="space-y-4">
        <Field label="To" action={<FieldPicker onSelect={(v) => setTo(p => p + "" + v)} />}>
          <TokenInput value={to} onChange={setTo} />
        </Field>

        <Field label="From" action={<FieldPicker onSelect={(v) => setFrom(p => p + "" + v)} />}>
          <TokenInput value={from} onChange={setFrom} />
        </Field>

        <Field label="Subject" action={<FieldPicker onSelect={(v) => setSubject(p => p + "" + v)} />}>
          <TokenInput value={subject} onChange={setSubject} />
        </Field>

        <Field label="Body" action={<FieldPicker onSelect={(v) => setBody(p => p + "" + v)} />}>
          <TokenInput value={body} onChange={setBody} />
        </Field>
      </div>

      <div className="border-t border-zinc-200 pt-4">
        <button onClick={saveAction} className={`${btnPrimary} w-full`}>
          Save email action
        </button>
      </div>
    </div>
  );
}
