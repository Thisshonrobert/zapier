"use client";

import { NodeProps, Node, Handle, Position, useReactFlow } from "@xyflow/react";
import { type Trigger } from "../Workflow.constants";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, X, Copy, Check } from "lucide-react";

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
      <div className="relative w-64">
    
        {/* Main node content */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Header section with icon, label and close button */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold text-gray-800 text-sm">
                Trigger
              </span>
            </div>

          
          </div>

          {/* Content section */}
          <div className="px-3 py-3 text-sm">
            {/* Show selected trigger or placeholder text */}
            {selectedTrigger ? (
              <div className="flex items-center gap-3 mb-3">
                {selectedTrigger.imageUrl && (
                  <img
                    src={selectedTrigger.imageUrl}
                    alt={selectedTrigger.name}
                    className="w-7 h-7 rounded"
                  />
                )}
                <span className="font-medium text-gray-700">
                  {selectedTrigger.name}
                </span>
              </div>
            ) : (
              <p className="text-gray-600 mb-3 text-sm">
                1. Select the event that starts your Zap
              </p>
            )}

            {/* Button to open dialog */}
            <Button
              onClick={() => setIsDialogOpen(true)}
              variant="outline"
              className="w-full text-sm"
            >
              {selectedTrigger ? "Change Trigger" : "+ Add Trigger"}
            </Button>
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
      </div>

      {/* Dialog to show available triggers */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select a Trigger</DialogTitle>
            <DialogDescription>
              Choose the event that will start your automation
            </DialogDescription>
          </DialogHeader>

          {/* List of available triggers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {data.availableTriggers.length > 0 ? (
              data.availableTriggers.map((trigger) => (
                <button
                  key={trigger.id}
                  onClick={() => {
                    handleSelectTrigger(trigger);
                    setIsTestDialogOpen(true)}
                  }
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
                >
                  {/* Trigger image */}
                  {trigger.imageUrl && (
                    <img
                      src={trigger.imageUrl}
                      alt={trigger.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  {/* Trigger name */}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{trigger.name}</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="col-span-2 text-center text-gray-500 py-8">
                No triggers available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>1. Select the event</DialogTitle>
            <DialogDescription>
              Test your trigger by sending data to the webhook URL
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Webhook URL Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Your webhook URL
              </label>
              <p className="text-sm text-gray-500">
                You'll need to configure your application with this Zap's webhook URL.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                />
                <Button
                  onClick={handleCopyUrl}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Find New Record Section */}
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                We found records in your Webhooks by Zapier account. We will load up to 3 most recent records, that have not appeared previously.
              </p>
              <Button
                onClick={handleFindNewRecord}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? "Loading..." : "Find new records"}
              </Button>
            </div>

            {/* Result Section */}
            {testResult && (
              <div className="space-y-2 border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Latest Record
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-auto max-h-64">
                    {JSON.stringify(testResult.payload, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {!testResult && !isLoading && (
              <div className="text-sm text-gray-500 text-center py-4">
                No records found. Send a request to the webhook URL to see test data here.
              </div>
            )}

            {/* Proceed Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleProceed}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Continue with selected record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
