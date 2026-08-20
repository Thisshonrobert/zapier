"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { BACKEND_URL } from "@/config";
import type { Zap, ZapDetail, ZapRun } from "@/types/zap";

const authHeaders = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : null;
};

export function useZaps() {
  const [loading, setLoading] = useState(true);
  const [zaps, setZaps] = useState<Zap[]>([]);

  useEffect(() => {
    const headers = authHeaders();
    if (!headers) {
      setLoading(false);
      return;
    }
    axios
      .get<{ zaps: Zap[] }>(`${BACKEND_URL}/api/v1/zap`, { headers })
      .then((res) => setZaps(res.data?.zaps ?? []))
      .catch(() => setZaps([]))
      .finally(() => setLoading(false));
  }, []);

  return { loading, zaps };
}

export function useZapRuns() {
  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState<ZapRun[]>([]);

  useEffect(() => {
    const headers = authHeaders();
    if (!headers) {
      setLoading(false);
      return;
    }
    axios
      .get<{ runs: ZapRun[] }>(`${BACKEND_URL}/api/v1/zap/runs`, { headers })
      // An older backend without the /runs route falls through to /:id and
      // answers { zap: null }, so never trust the payload shape here.
      .then((res) => setRuns(Array.isArray(res.data?.runs) ? res.data.runs : []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, []);

  return { loading, runs };
}

export function useZap(id: string) {
  const [loading, setLoading] = useState(true);
  const [zap, setZap] = useState<ZapDetail | null>(null);

  useEffect(() => {
    const headers = authHeaders();
    if (!headers || !id) {
      setLoading(false);
      return;
    }
    axios
      .get<{ zap: ZapDetail }>(`${BACKEND_URL}/api/v1/zap/${id}`, { headers })
      .then((res) => setZap(res.data?.zap ?? null))
      .catch(() => setZap(null))
      .finally(() => setLoading(false));
  }, [id]);

  return { loading, zap };
}
