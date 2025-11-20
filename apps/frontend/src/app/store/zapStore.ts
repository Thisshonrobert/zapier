import { create } from "zustand";
import { metadata } from "../layout";

type TriggerTestResult = any

type action = {
    id:string,
    actionId:string,
    metadata:any
}

interface zapData{
    tempZapData : TriggerTestResult ,
    setTriggerData: (data: TriggerTestResult) => void;

    zapName:string,
    setZapName:(name:string) => void;

    triggerId :string | null,
    setTriggerId:(id:string) => void;

    actions:action[],

    updateAction:(nodeId:string,data:Partial<Omit<action, 'id'>>) => void;

    addAction:(nodeId:string,actionId:string) => void;

    removeAction:(nodeId:string) => void;

    resetZap:() => void;



}

export const useZapStore = create<zapData>((set)=>({
    tempZapData: null,
    setTriggerData:(data)=>set({tempZapData:data}),

    zapName: "Untitled Zap",
    setZapName : (name)=>set({zapName:name}),

    triggerId:null,
    setTriggerId :(id) => set({triggerId:id}),

    actions:[],

    updateAction:(nodeId,data)=>
        set((state)=>({
            actions:state.actions.map(x=> x.id === nodeId ? {...x,...data}: x)
        })),

    addAction:(nodeId,actionId) =>
        set((state) =>({
            actions:[...state.actions,{id:nodeId,actionId:actionId,metadata:{}}]
        })),    
   
    removeAction:(nodeId) =>
        set((state) =>({
            actions:state.actions.filter(x=> x.id !== nodeId)
        })),

    resetZap:() =>
        set({
            tempZapData:null,
            zapName:"Untitled Zap",
            triggerId:null,
            actions:[]
        }),    

})
)

