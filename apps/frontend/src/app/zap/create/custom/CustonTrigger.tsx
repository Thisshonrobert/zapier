"use client";

import { NodeProps, Node, Handle, Position, useReactFlow } from "@xyflow/react";
import { type Trigger } from "../Workflow.constants";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, X } from "lucide-react";

// Define the node type for TypeScript
type TriggerNode = Node<{ availableTriggers: Trigger[] }, "trigger">;

export default function CustomTrigger({ data, id }: NodeProps<TriggerNode>) {
  // State to control dialog open/close
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // State to track selected trigger
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);
  

  // Function to handle trigger selection
  const handleSelectTrigger = (trigger: Trigger) => {
    setSelectedTrigger(trigger);
    setIsDialogOpen(false);
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
                  onClick={() => handleSelectTrigger(trigger)}
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
    </>
  );
}
