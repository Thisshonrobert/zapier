import { Edge, Node } from "@xyflow/react";

export type Trigger = { id: string; name: string; imageUrl: string };
export type Action = { id: string; name: string; imageUrl: string };

export const getInitialNodes = (
  availableTriggers?: Trigger[],
  availableActions?: Action[]
): Node[] => [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: {
      label: "Trigger",
      availableTriggers: availableTriggers || [],
    },
    type:"trigger"
  },
  {
    id: "2",
    position: { x: 0, y: 200 },
    data: {
      label: "Action",
      availableActions: availableActions || [],
    },
    type:"action"
  },
];

export const initialEdges: Edge[] = [{ id: '1-2', source: '1', target: '2' }];

