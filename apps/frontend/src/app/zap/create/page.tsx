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
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,

  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import { initialEdges, getInitialNodes } from "./Workflow.constants";
import { BACKEND_URL } from "@/config";
import axios from "axios";
import CustomTrigger from "./custom/CustonTrigger";
import CustomAction from "./custom/CustomAction";
import { Input } from "@/mycomponents/Input";
import { Label } from "@/components/ui/label";
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
    <Card className="w-full h-screen flex flex-col">
    <CardHeader>
      <CardTitle>Create your Zap</CardTitle>
      <CardAction>
      <Dialog>
  <DialogTrigger asChild>
    <Button variant="link">Publish</Button>
  </DialogTrigger>

  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Save ZapName</DialogTitle>
    </DialogHeader>

    <div className="grid ">
      <Label>Name</Label>
      <Input 
      label=""
        placeholder="Zap1"
        onChange={(e) => setZapname(e.target.value)}
      />
    </div>

    <DialogFooter>
      <Button onClick={handleNameSubmit}>
        Save changes and Publish
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

      </CardAction>
    </CardHeader>
  
    <CardContent className="flex-1 p-0">
      <div className="w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          nodeTypes={nodeTypes}
        >
          <Background color="#ccc" variant={BackgroundVariant.Dots} />
          <Controls />
        </ReactFlow>
      </div>
    </CardContent>
  </Card>
  
  );
}

