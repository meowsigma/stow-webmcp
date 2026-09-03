export {};

declare global {
  interface WebMcpTool {
    name: string;
    description: string;
    inputSchema?: unknown;
    annotations?: Record<string, unknown>;
    title?: string;
    execute?: (
      input: Record<string, unknown>,
      extra?: { signal?: AbortSignal },
    ) => unknown;
  }

  interface ModelContext extends EventTarget {
    registerTool(
      tool: WebMcpTool,
      options?: { signal?: AbortSignal; exposedTo?: string[] },
    ): Promise<void>;
    getTools(options?: { fromOrigins?: string[] }): Promise<WebMcpTool[]>;
    executeTool(
      tool: WebMcpTool,
      args: string | Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ): Promise<unknown>;
  }

  interface Document {
    modelContext?: ModelContext;
  }

  interface SubmitEvent {
    agentInvoked?: boolean;
    respondWith?: (value: unknown) => void;
  }
}
