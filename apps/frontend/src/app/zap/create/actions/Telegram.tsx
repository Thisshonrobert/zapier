"use client";

import { useState } from "react";
import { FieldPicker } from "@/mycomponents/fieldPicker";
import { useZapStore } from "@/app/store/zapStore";
import { toast } from "sonner";
import { TokenInput } from "@/mycomponents/TokenInput"; 

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
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Telegram Action</h2>

      {/* Channel Username */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label>Channel Username</label>
          <FieldPicker onSelect={v => insertVariable("channelUserName", v)} />
        </div>

        <TokenInput
          value={channelUserName}
          onChange={setChannelUserName}
        />
      </div>

      {/* Bot Token */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label>Bot Token</label>
          <FieldPicker onSelect={v => insertVariable("botToken", v)} />
        </div>

        <TokenInput
          value={botToken}
          onChange={setBotToken}
        />
      </div>

      {/* Message */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label>Message</label>
          <FieldPicker onSelect={v => insertVariable("message", v)} />
        </div>

        <TokenInput
          value={message}
          onChange={setMessage}
        />
      </div>

      <button
        onClick={saveAction}
        className="px-4 py-2 w-full bg-purple-600 hover:bg-purple-700 text-white rounded"
      >
        Save Telegram Action
      </button>
    </div>
  );
}
