"use client";

import {
  NodeProps,
  Node,
  Handle,
  Position,
  useReactFlow,
} from "@xyflow/react";
import { type Action } from "../Workflow.constants";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Plus, X } from "lucide-react";

type ActionNode = Node<{ availableActions: Action[] }, "action">;

export default function CustomAction({ data, id }: NodeProps<ActionNode>) {
  // State to control dialog open/close
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // State to track selected action
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const { setNodes, setEdges } = useReactFlow();

  // Function to handle action selection
  const handleSelectAction = (action: Action) => {
    setSelectedAction(action);
    setIsDialogOpen(false);
  };

  const handleRemove = () => {
    setNodes((prevNodes) => prevNodes.filter((node) => node.id !== id));
    setEdges((prevEdges) =>
      prevEdges.filter((edge) => edge.source !== id && edge.target !== id)
    );
  };


  const handleAddAction = () => {
    //using date instead of global id variable
    const newNodeId = `action-${Date.now()}`;
    setNodes((prevNodes) => {
      const currentNode = prevNodes.find((node) => node.id === id);
      const x = currentNode?.position.x ?? 0;
      const y = currentNode
        ? currentNode.position.y + 200
        : (prevNodes[prevNodes.length - 1]?.position.y ?? 0) + 200;

      const newNode: Node = {
        id: newNodeId,
        position: { x, y },
        data: {
          availableActions: data.availableActions,
        },
        type: "action",
      };

      return [...prevNodes, newNode];
    });

    setEdges((prevEdges) => [
      ...prevEdges,
      {
        id: `${id}-${newNodeId}`,
        source: id,
        target: newNodeId,
      },
    ]);
  };

  return (
    <>
      <div className="relative w-64">
        <Handle type="target" position={Position.Top} className="w-2 h-2" />

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="font-semibold text-gray-800 text-sm">Action</span>
            </div>
            {id !== '2' &&   <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-500 hover:text-gray-700"
              aria-label="Remove action"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>}
          
          </div>

          <div className="px-3 py-3 text-sm">
            {selectedAction ? (
              <div className="flex items-center gap-3 mb-3">
                {selectedAction.imageUrl && (
                  <img
                    src={selectedAction.imageUrl}
                    alt={selectedAction.name}
                    className="w-7 h-7 rounded"
                  />
                )}
                <span className="font-medium text-gray-700">
                  {selectedAction.name}
                </span>
              </div>
            ) : (
              <p className="text-gray-600 mb-3">
                2. Select the event for your Zap to run
              </p>
            )}

            <Button
              onClick={() => setIsDialogOpen(true)}
              variant="outline"
              className="w-full text-sm"
            >
              {selectedAction ? "Change Action" : "+ Add Action"}
            </Button>
          </div>
        </div>

        {/* Handle for outgoing connections (bottom) */}
        <Handle type="source" position={Position.Bottom} className="w-2 h-2" />

        {/* Plus button to add more actions (positioned after the node) */}
        <div className="absolute -bottom-9 left-1/2 transform -translate-x-1/2 z-10">
          <button
            onClick={handleAddAction}
            className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center shadow-md transition-colors cursor-pointer"
            title="Add another action"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

    
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select an Action</DialogTitle>
            <DialogDescription>
              Choose the action that will run when your trigger fires
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {data.availableActions.length > 0 ? (
              data.availableActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSelectAction(action)}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
                >
                  {action.imageUrl && (
                    <img
                      src={action.imageUrl}
                      alt={action.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{action.name}</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="col-span-2 text-center text-gray-500 py-8">
                No actions available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

