export interface AppType {
  id: string;
  name: string;
  imageUrl: string;
}

export interface Zap {
  id: string;
  name: string;
  time: Date;
  triggerId: string;
  userId: number;
  actions: {
    id: string;
    zapId: string;
    actionId: string;
    sortingOrder: number;
    type: AppType;
  }[];
  trigger: {
    id: string;
    zapId: string;
    type: AppType;
  };
}

export interface ZapRun {
  id: string;
  zapId: string;
  metadata: Record<string, unknown>;
  status: "success" | "running";
  zap: Pick<Zap, "id" | "name" | "time" | "trigger" | "actions">;
}

/** A single Zap plus its run history, as returned by GET /api/v1/zap/:id. */
export interface ZapDetail
  extends Pick<Zap, "id" | "name" | "time" | "trigger" | "actions"> {
  runs: {
    id: string;
    metadata: Record<string, unknown>;
    status: "success" | "running";
    failures: number;
  }[];
}
