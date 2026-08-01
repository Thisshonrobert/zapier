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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Zap, Plus, X, ChevronRight } from "lucide-react";
import { DialogHeading, btnSecondary } from "@/mycomponents/app/FormKit";
import { Email } from "../actions/Email";
import { Telegram } from "../actions/Telegram";
import { useZapStore } from "@/app/store/zapStore";


type ActionNode = Node<{ availableActions: Action[] }, "action">;

export default function CustomAction({ data, id }: NodeProps<ActionNode>) {
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [isEditorDialogOpen,setIsEditorDialogOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const { setNodes, setEdges } = useReactFlow();
  const addAction = useZapStore(s => s.addAction);
  const removeAction = useZapStore(s => s.removeAction)
  
  const handleSelectAction = (action: Action) => {
    setSelectedAction(action);
    addAction(id,action.id) // when a action is seleted , metadata is updated in action child components
    setIsDialogOpen(false);
    setIsEditorDialogOpen(true);
  };

  const handleRemove = () => {
    removeAction(id)
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
      <div className="relative w-72">
        <Handle
          type="target"
          position={Position.Top}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-zinc-400"
        />

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.06),0_8px_24px_-12px_rgba(24,24,27,0.18)] transition hover:border-zinc-300">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 bg-violet-50/60 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-600" />
              <span className="text-[13px] font-semibold tracking-tight text-zinc-900">
                Action
              </span>
            </div>
            {id !== '2' && (
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded-md text-zinc-400 transition hover:bg-white hover:text-zinc-700"
                aria-label="Remove action"
                onClick={handleRemove}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="px-4 py-3.5 text-sm">
            {selectedAction ? (
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-100">
                {selectedAction.imageUrl && (
                  <img
                    src={selectedAction.imageUrl}
                    alt={selectedAction.name}
                    className="h-7 w-7 rounded object-contain"
                  />
                )}
                <span className="font-medium text-zinc-900">
                  {selectedAction.name}
                </span>
              </div>
            ) : (
              <p className="mb-3 text-sm leading-relaxed text-zinc-500">
                Select what your Zap should do next.
              </p>
            )}

            <button
              onClick={() => setIsDialogOpen(true)}
              className={`${btnSecondary} w-full`}
            >
              {selectedAction ? "Change action" : "Add action"}
            </button>
          </div>
        </div>

        {/* Handle for outgoing connections (bottom) */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-zinc-400"
        />

        {/* Plus button to add more actions (positioned after the node) */}
        <div className="absolute -bottom-9 left-1/2 z-10 -translate-x-1/2 transform">
          <button
            onClick={handleAddAction}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600"
            title="Add another action"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

    
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto rounded-2xl">
          <DialogHeading
            icon={Zap}
            title="Select an action"
            description="Choose what should happen when your trigger fires."
            tint="violet"
          />

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.availableActions.length > 0 ? (
              data.availableActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSelectAction(action)}
                  className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left transition hover:border-violet-300 hover:bg-violet-50/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
                >
                  {action.imageUrl && (
                    <img
                      src={action.imageUrl}
                      alt={action.name}
                      className="h-10 w-10 rounded-lg object-contain"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-zinc-900">
                      {action.name}
                    </p>
                    <p className="text-xs text-zinc-500">Runs after the trigger</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                </button>
              ))
            ) : (
              <p className="col-span-2 py-10 text-center text-sm text-zinc-500">
                No actions available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditorDialogOpen} onOpenChange={setIsEditorDialogOpen}>
        <DialogContent className="max-w-xl rounded-2xl">
          {selectedAction?.id === "email" && <Email nodeId={id} />}
          {selectedAction?.id === "telegram" && <Telegram nodeId={id} />}
          {selectedAction?.id !== "email" &&
            selectedAction?.id !== "telegram" && (
              <DialogHeading
                icon={Zap}
                title={selectedAction?.name ?? "Configure action"}
                description="This action has no settings to configure yet."
                tint="violet"
              />
            )}
        </DialogContent>
      </Dialog>

    </>
  );
}

