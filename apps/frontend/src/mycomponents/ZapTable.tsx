"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { Check, Copy, MoreHorizontal } from "lucide-react";
import { IconFolderCode } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HOOKS_URL } from "@/config";
import type { Zap } from "@/types/zap";
import { MvpAction } from "./app/MvpDialog";
import { ZapFlow, ZapMonogram, stepsOf } from "./app/AppFlow";

type JwtPayload = {
  id: string;
  iat: number;
};

const getUserIdFromToken = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return null;

  try {
    return jwtDecode<JwtPayload>(token).id;
  } catch (err) {
    console.error("Invalid token", err);
    return null;
  }
};

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const CopyWebhook = ({ url }: { url: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-zinc-700"
      onClick={() => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy webhook"}
    </Button>
  );
};

export const ZapTable = ({ zaps }: { zaps: Zap[] }) => {
  const router = useRouter();
  const userId = getUserIdFromToken();

  if (zaps.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconFolderCode />
            </EmptyMedia>
            <EmptyTitle>No Zaps Yet</EmptyTitle>
            <EmptyDescription>
              You haven&apos;t created any zaps yet. Start by making your first
              one.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              className="bg-[#FF4F00] text-white hover:bg-[#e64700]"
              onClick={() => router.push("/zap/create")}
            >
              Create Zap
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 hover:bg-zinc-50">
              <TableHead className="py-3 font-semibold text-zinc-700">Name</TableHead>
              <TableHead className="font-semibold text-zinc-700">Workflow</TableHead>
              <TableHead className="font-semibold text-zinc-700">Status</TableHead>
              <TableHead className="font-semibold text-zinc-700">Created</TableHead>
              <TableHead className="font-semibold text-zinc-700">Webhook URL</TableHead>
              <TableHead className="text-right font-semibold text-zinc-700">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zaps.map((zap) => {
              const steps = stepsOf(zap);
              return (
                <TableRow key={zap.id} className="hover:bg-zinc-50/70">
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <ZapMonogram name={zap.name} />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-zinc-900">
                          {zap.name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {steps.length} {steps.length === 1 ? "step" : "steps"} ·
                          Webhook trigger
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ZapFlow steps={steps} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-sm text-zinc-700">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Live
                      </span>
                      <MvpAction title="Run test">
                        <span className="cursor-pointer rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-400">
                          Run test
                        </span>
                      </MvpAction>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">
                    {formatDate(zap.time)}
                  </TableCell>
                  <TableCell>
                    <CopyWebhook
                      url={`${HOOKS_URL}/hooks/catch/${userId}/${zap.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/zap/${zap.id}`)}
                        className="cursor-pointer rounded-lg bg-[#FF4F00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e64700]"
                      >
                        Go
                      </button>
                      <MvpAction className="inline-block" title="Zap options">
                        <MoreHorizontal className="h-4 w-4 cursor-pointer text-zinc-500 hover:text-zinc-800" />
                      </MvpAction>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
        <span>
          1–{zaps.length} of {zaps.length}
        </span>
        <MvpAction title="Page size">
          <span className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-1.5">
            25 per page
          </span>
        </MvpAction>
      </div>
    </>
  );
};
