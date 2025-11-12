"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HOOKS_URL } from "@/config";
import { IconFolderCode } from "@tabler/icons-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Zap } from "@/app/dashboard/page";
import { LinkButton } from "./buttons/LinkButton";
import {jwtDecode} from "jwt-decode";

type JwtPayload = {
  id: string;
  iat: number;
};

export const ZapTable = ({ zaps }: { zaps: Zap[] }) => {
  const router = useRouter();
 const userId  = getUserIdFromToken()
  // Helper to format date
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // 🟢 If no zaps found
  if (zaps.length === 0) {
    return (
      <div className="p-8 max-w-4xl w-full">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconFolderCode />
            </EmptyMedia>
            <EmptyTitle>No Zaps Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t created any zaps yet. Start by making your first one.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => router.push("/zap/create")}>
              Create Zap
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  // 🟢 If zaps exist
  return (
    <div className="p-8 max-w-6xl w-full">
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Apps</th>
              <th className="p-3">Created At</th>
              <th className="p-3">Webhook URL</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {zaps.map((zap) => (
              <tr key={zap.id} className="border-t hover:bg-gray-50">
              
                <td className="p-3 font-medium">
                  {zap.name} 
                </td>

               
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <Image
                      src={zap.trigger.type.image}
                      alt={zap.trigger.type.name}
                      width={30}
                      height={30}
                      className="rounded"
                    />
                    {zap.actions.map((action) => (
                      <Image
                        key={action.id}
                        src={action.type.image}
                        alt={action.type.name}
                        width={30}
                        height={30}
                        className="rounded"
                      />
                    ))}
                  </div>
                </td>

              
                <td className="p-3">{formatDate(zap.time)}</td>

              
                <td className="p-3 text-sm text-gray-600 truncate max-w-xs">
                  {`${HOOKS_URL}/hooks/catch/${userId}/${zap.id}`}
                </td>

                
                <td className="p-3 text-center">
                  <LinkButton onClick={() => router.push(`/zap/${zap.id}`)}>
                    Go
                  </LinkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const getUserIdFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
  
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded.id;
    } catch (err) {
      console.error("Invalid token", err);
      return null;
    }
  };