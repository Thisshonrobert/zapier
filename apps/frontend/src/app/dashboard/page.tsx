"use client";
import Appbar from "@/mycomponents/Appbar";
import DarkButton from "@/mycomponents/buttons/DarkButton";

import { BACKEND_URL } from "@/config";
import React from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ZapTable } from "@/mycomponents/ZapTable";
import { LoaderOne } from "@/components/ui/loader";


export interface Zap {
  id: string;
  name:string,
  time:Date,
  triggerId: string;
  userId: number;
  actions: {
    id: string;
    zapId: string;
    actionId: string;
    sortingOrder: number;
    type: {
      id: string;
      name: string;
      image: string;
    };
  }[];
  trigger: {
    id: string;
    zapId: string;
    type: {
      id: string;
      name: string;
      image: string;
    };
  };
}

interface ZapsResponse {
  zaps: Zap[];
}

function useZaps(){
    const [loading,setLoading] = React.useState(true)
    const [zaps,setZaps] = React.useState<Zap[]>([]);
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

    React.useEffect(()=>{
        if(!token){
            setLoading(false);
            return;
          }
         axios.get<ZapsResponse>(`${BACKEND_URL}/api/v1/zap`,{
            headers:{
                Authorization: `Bearer ${token}`,
            }
        }).then((response)=>{
            setZaps(response.data.zaps)
            setLoading(false);
        })
    },[zaps])

    return {
        loading,
        zaps
    }
}

export default function(){
    const {loading,zaps} = useZaps();
    const router = useRouter();
return <div>
    <Appbar/>
    <div className="flex justify-center pt-8">
        <div className="w-full max-w-screen-lg">
          <div className="flex justify-between  pr-8">
            <div className="text-2xl font-bold">
              <div>My Zaps</div>
            </div>
            <DarkButton
              onClick={() => {
                router.push("/zap/create");
              }}
            >
              Create
            </DarkButton>
          </div>
        </div>
      </div>
      {loading ?<div className="flex justify-center"><LoaderOne/></div> :
      <div className='flex justify-center'> <ZapTable zaps={zaps}/></div>} 
</div>
}