"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { FieldPicker } from "@/mycomponents/fieldPicker";
import { useZapStore } from "@/app/store/zapStore";
import { toast } from "sonner";
import { TokenInput } from "@/mycomponents/TokenInput";
import { DialogHeading, Field, btnPrimary } from "@/mycomponents/app/FormKit";

export function Telegram({ nodeId }: { nodeId: string }) {
  const updateAction = useZapStore(s => s.updateAction);

  const [channelUserName, setChannelUserName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [message, setMessage] = useState("");

  const insertVariable = (
    field: "channelUserName" | "botToken" | "message",
    value: string
  ) => {
    if (field === "channelUserName")
      setChannelUserName(prev => prev + value);
    if (field === "botToken") setBotToken(prev => prev + value);
    if (field === "message") setMessage(prev => prev + value);
  };

  const saveAction = () => {
    updateAction(nodeId, {
      metadata: { channelUserName, botToken, message }
    });
    toast.success("action saved");
  };

  return (
    <div className="space-y-5">
      <DialogHeading
        icon={Send}
        title="Telegram action"
        description="Post a message to a channel when this step runs."
        tint="sky"
      />

      <div className="space-y-4">
        <Field
          label="Channel username"
          hint="For example @my_updates_channel"
          action={<FieldPicker onSelect={v => insertVariable("channelUserName", v)} />}
        >
          <TokenInput value={channelUserName} onChange={setChannelUserName} />
        </Field>

        <Field
          label="Bot token"
          action={<FieldPicker onSelect={v => insertVariable("botToken", v)} />}
        >
          <TokenInput value={botToken} onChange={setBotToken} />
        </Field>

        <Field
          label="Message"
          action={<FieldPicker onSelect={v => insertVariable("message", v)} />}
        >
          <TokenInput value={message} onChange={setMessage} />
        </Field>
      </div>

      <div className="border-t border-zinc-200 pt-4">
        <button onClick={saveAction} className={`${btnPrimary} w-full`}>
          Save Telegram action
        </button>
      </div>
    </div>
  );
}
