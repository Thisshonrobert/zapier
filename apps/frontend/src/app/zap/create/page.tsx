"use client";
import { useState, useCallback, useEffect } from "react";

import {
  ReactFlow,
  addEdge,

  type Node,
  type Edge,
  Background,
  type OnConnect,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Rocket } from "lucide-react";
import {
  DialogHeading,
  Field,
  btnPrimary,
  btnSecondary,
} from "@/mycomponents/app/FormKit";
import { initialEdges, getInitialNodes } from "./Workflow.constants";
import { BACKEND_URL } from "@/config";
import axios from "axios";
import CustomTrigger from "./custom/CustonTrigger";
import CustomAction from "./custom/CustomAction";
import { useZapStore } from "@/app/store/zapStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ActionItem = {
  id: string;
  name: string;
  imageUrl: string;
};

type TriggerItem = {
  id: string;
  name: string;
  imageUrl: string;
};

type TriggerResponse = {
  available_triggers: TriggerItem[]
}
type ActionResponse = {
  available_actions: ActionItem[]
}

// Register custom node types for ReactFlow
const nodeTypes = {
  trigger: CustomTrigger,
  action: CustomAction,
};

function useAvailableActionsAndTriggers() {
  const [availableActions, setAvailableActions] = useState<ActionItem[]>([]);
  const [availableTriggers, setAvailableTriggers] = useState<TriggerItem[]>([]);
  useEffect(() => {
    axios
      .get<TriggerResponse>(`${BACKEND_URL}/api/v1/trigger/available`)
      .then((x) => setAvailableTriggers(x.data.available_triggers));
    axios
      .get<ActionResponse>(`${BACKEND_URL}/api/v1/action/available`)
      .then((x) => setAvailableActions(x.data.available_actions));
  }, []);

  return {
    availableActions,
    availableTriggers,
  };
}

export default function App() {
  const { availableTriggers, availableActions } =
    useAvailableActionsAndTriggers();
  const [nodes, setNodes, onNodesChange] = useNodesState(
    getInitialNodes(availableTriggers, availableActions)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [zapname,setZapname] = useState("");
  const setZapName = useZapStore(s=>s.setZapName)

  const router = useRouter();

  // Update nodes when triggers/actions are loaded
  useEffect(() => {
    if (availableTriggers || availableActions) {
      setNodes(getInitialNodes(availableTriggers, availableActions));
    }
    console.log("available actions", availableActions)
    console.log("available triggers",availableTriggers)
  }, [availableTriggers, availableActions, setNodes]);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((edgesSnapshot) => {
        const edge: Edge = {
          ...connection,
          animated: true,
          id: `${edgesSnapshot.length + 1}`,
        };
        return addEdge(edge, edgesSnapshot);
      });
    },
    [setEdges]
  );

  
const handleNameSubmit = async()=>{
  setZapName(zapname)
  const { zapName, triggerId, actions } = useZapStore.getState();

  const finalJson = {
    name: zapName,
    availableTriggerId: triggerId,
    actions: actions.map((a, index) => ({
      availableActionId: a.actionId,
      actionMetadata: a.metadata,
      sortingOrder: index
    }))
  };

  const res = await axios.post(
    `${BACKEND_URL}/api/v1/zap/create`,
    finalJson,
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
  );
toast.success(res.data.zapId)
  
  useZapStore.getState().resetZap();
  setTimeout(() => {
    router.push('/dashboard')
  }, 3000);
};



  return (
    <div className="flex h-screen w-full flex-col bg-[#fffdf9]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Create your Zap
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Pick a trigger, add the steps that follow, then publish.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button className={btnPrimary}>
              <Rocket className="h-4 w-4" />
              Publish
            </button>
          </DialogTrigger>

          <DialogContent className="rounded-2xl sm:max-w-[440px]">
            <DialogHeading
              icon={Rocket}
              title="Publish your Zap"
              description="Give it a name so you can find it on your dashboard."
            />

            <div className="mt-5">
              <Field label="Zap name">
                <input
                  className="h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-[#FF4F00] focus:outline-none focus:ring-2 focus:ring-[#FF4F00]/20"
                  placeholder="e.g. Notify me about new signups"
                  onChange={(e) => setZapname(e.target.value)}
                />
              </Field>
            </div>

            <DialogFooter className="mt-5 gap-2 border-t border-zinc-200 pt-4 sm:justify-end">
              <DialogClose asChild>
                <button className={btnSecondary}>Cancel</button>
              </DialogClose>
              <button onClick={handleNameSubmit} className={btnPrimary}>
                Save and publish
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          nodeTypes={nodeTypes}
        >
          <Background color="#e4e4e7" gap={18} size={2} variant={BackgroundVariant.Dots} />
          <Controls className="!rounded-lg !border !border-zinc-200 !shadow-sm" />
        </ReactFlow>
      </div>
    </div>

  );
}

