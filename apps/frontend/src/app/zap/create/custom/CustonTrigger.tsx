"use client";

import { NodeProps, Node, Handle, Position, useReactFlow } from "@xyflow/react";
import { type Trigger } from "../Workflow.constants";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Zap, Copy, Check, ChevronRight, Webhook } from "lucide-react";
import {
  DialogHeading,
  Section,
  btnPrimary,
  btnSecondary,
} from "@/mycomponents/app/FormKit";

import { v4 as uuidv4 } from 'uuid';
import { HOOKS_URL, BACKEND_URL } from "@/config";
import axios from "axios";
import { tokenDecode } from "@/hooks/tokenDecode";
import { useZapStore } from "@/app/store/zapStore";



type TriggerNode = Node<{ availableTriggers: Trigger[] }, "trigger">;

export default function CustomTrigger({ data, id }: NodeProps<TriggerNode>) {
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);

  const tempZapId = useRef(uuidv4());
  
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const setTriggerData = useZapStore(s => s.setTriggerData);
  const setTriggerId = useZapStore(s => s.setTriggerId);
  const [userId, setUserId] = useState<string | null>(null);

useEffect(() => {
  const decoded = tokenDecode();
  if (decoded) setUserId(decoded.id);
}, []);

 
   
  const webhookUrl = `${HOOKS_URL}/hooks/catch/test/${userId}/${tempZapId.current}`;



  const handleSelectTrigger = (trigger: Trigger) => {
    setSelectedTrigger(trigger);
    setTriggerId(trigger.id)
    setIsDialogOpen(false);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleFindNewRecord = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/v1/trigger/test/result/${tempZapId.current}`
      );
      setTriggerData(response.data.testResult); 
      setTestResult(response.data.testResult);
    } catch (error) {
      console.error('Failed to fetch test result:', error);
      setTestResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceed = () => {
    setIsTestDialogOpen(false); 
  };



  return (
    <>
      <div className="relative w-72">

        {/* Main node content */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.06),0_8px_24px_-12px_rgba(24,24,27,0.18)] transition hover:border-zinc-300">
          {/* Header section with icon, label and close button */}
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 bg-orange-50/60 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#FF4F00]" />
              <span className="text-[13px] font-semibold tracking-tight text-zinc-900">
                Trigger
              </span>
            </div>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 ring-1 ring-zinc-200">
              Step 1
            </span>
          </div>

          {/* Content section */}
          <div className="px-4 py-3.5 text-sm">
            {/* Show selected trigger or placeholder text */}
            {selectedTrigger ? (
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-100">
                {selectedTrigger.imageUrl && (
                  <img
                    src={selectedTrigger.imageUrl}
                    alt={selectedTrigger.name}
                    className="h-7 w-7 rounded object-contain"
                  />
                )}
                <span className="font-medium text-zinc-900">
                  {selectedTrigger.name}
                </span>
              </div>
            ) : (
              <p className="mb-3 text-sm leading-relaxed text-zinc-500">
                Select the event that starts your Zap.
              </p>
            )}

            {/* Button to open dialog */}
            <button
              onClick={() => setIsDialogOpen(true)}
              className={`${btnSecondary} w-full`}
            >
              {selectedTrigger ? "Change trigger" : "Add trigger"}
            </button>
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-zinc-400"
        />
      </div>

      {/* Dialog to show available triggers */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeading
            icon={Zap}
            title="Select a trigger"
            description="Choose the event that will start your automation."
          />

          {/* List of available triggers */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.availableTriggers.length > 0 ? (
              data.availableTriggers.map((trigger) => (
                <button
                  key={trigger.id}
                  onClick={() => {
                    handleSelectTrigger(trigger);
                    setIsTestDialogOpen(true)}
                  }
                  className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-[#FF4F00]/40 hover:bg-orange-50/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F00]/30"
                >
                  {/* Trigger image */}
                  {trigger.imageUrl && (
                    <img
                      src={trigger.imageUrl}
                      alt={trigger.name}
                      className="h-10 w-10 rounded-lg object-contain"
                    />
                  )}
                  {/* Trigger name */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">
                      {trigger.name}
                    </p>
                    <p className="text-xs text-zinc-500">Starts the Zap</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-[#FF4F00]" />
                </button>
              ))
            ) : (
              <p className="col-span-2 py-10 text-center text-sm text-zinc-500">
                No triggers available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto rounded-2xl">
          <DialogHeading
            icon={Webhook}
            title="Test your trigger"
            description="Send a request to the webhook URL, then pull in the sample data."
          />

          <div className="mt-5 space-y-4">
            {/* Webhook URL Section */}
            <Section
              title="Your webhook URL"
              description="Configure your application to post to this address."
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="h-10 flex-1 rounded-lg border border-zinc-300 bg-white px-3 font-mono text-xs text-zinc-700 focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/20"
                />
                <button
                  onClick={handleCopyUrl}
                  className={`${btnSecondary} h-10 shrink-0 py-0`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </Section>

            {/* Find New Record Section */}
            <Section
              title="Sample record"
              description="We'll load the most recent payload received on this URL."
            >
              <button
                onClick={handleFindNewRecord}
                disabled={isLoading}
                className={`${btnSecondary} w-full`}
              >
                {isLoading ? "Loading…" : "Find new records"}
              </button>

              {/* Result Section */}
              {testResult && (
                <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                  <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold text-zinc-700">
                      Latest record
                    </span>
                  </div>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap px-3 py-3 font-mono text-xs leading-relaxed text-zinc-700">
                    {JSON.stringify(testResult.payload, null, 2)}
                  </pre>
                </div>
              )}

              {!testResult && !isLoading && (
                <p className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-white py-6 text-center text-xs text-zinc-500">
                  No records yet. Send a request to the webhook URL to see test
                  data here.
                </p>
              )}
            </Section>

            {/* Proceed Button */}
            <div className="flex justify-end border-t border-zinc-200 pt-4">
              <button onClick={handleProceed} className={btnPrimary}>
                Continue with selected record
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
