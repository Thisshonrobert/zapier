//HTTP client used by the primary backend to talk to the AI service.
export class AgentReadTimeout extends Error {}

export class TriageAgentClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 3_000,
  ) {}

  async read(path: string, scopeToken: string, correlationId: string, method: "GET" | "POST" = "GET", timeoutMs = this.timeoutMs, body: unknown = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(new URL(path, this.baseUrl), {
        method,
        headers: {
          authorization: `Bearer ${scopeToken}`,
          "x-correlation-id": correlationId,
          ...(method === "POST" ? { "content-type": "application/json" } : {}),
        },
        ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      const text = await response.text();
      if (text.length > 32_768) throw new Error("agent response too large");
      if (!response.ok) throw new Error(`agent request failed: ${response.status}`);
      return JSON.parse(text);
    } catch (error) {
      if (controller.signal.aborted) throw new AgentReadTimeout("agent read timed out", { cause: error });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**correlationId = C123 is a tracking id

It follows the request:

Frontend
 ↓
Primary Backend
 ↓
AI Agent
 ↓
Primary Backend internal endpoint

So logs from all components can be connected to the same investigation. */
