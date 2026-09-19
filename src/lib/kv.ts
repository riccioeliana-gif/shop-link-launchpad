// Minimal subset of the Cloudflare KV namespace API we rely on.
// Declared locally so we don't need @cloudflare/workers-types as a dependency.
export interface KvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: { prefix?: string; cursor?: string }): Promise<{
    keys: Array<{ name: string }>;
    list_complete: boolean;
    cursor?: string;
  }>;
  delete(key: string): Promise<void>;
}
