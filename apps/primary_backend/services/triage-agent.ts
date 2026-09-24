export class AgentReadTimeout extends Error {}

export class TriageAgentClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs = 3_000,
  ) {}

  async read(path: string, scopeToken: string, correlationId: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(new URL(path, this.baseUrl), {
        headers: {
          authorization: `Bearer ${scopeToken}`,
          "x-correlation-id": correlationId,
        },
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
