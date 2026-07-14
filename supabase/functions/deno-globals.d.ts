/**
 * Minimal Deno + remote-import shims for `tsc -p tsconfig.edge.json`.
 * Runtime validation for Edge Functions remains `deno check` per function.
 */

declare namespace NodeJS {
  interface Timeout {}
  interface ReadableStream {}
}

declare class Buffer {
  static from(input: string | ArrayBuffer, encoding?: string): Buffer;
}

declare namespace Deno {
  type EnvObject = Record<string, string> & {
    keys(): string[];
  };

  namespace env {
    function get(key: string): string | undefined;
    function toObject(): EnvObject;
  }

  function test(name: string, fn: () => void | Promise<void>): void;
}

interface ImportMeta {
  readonly main?: boolean;
}

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}

declare module 'https://deno.land/std@0.168.0/testing/asserts.ts' {
  export function assertEquals<T>(actual: T, expected: T, msg?: string): void;
  export function assertExists<T>(
    value: T,
    msg?: string
  ): asserts value is NonNullable<T>;
  export function assertThrows(fn: () => unknown, error?: unknown, msg?: string): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.49.1' {
  export * from '@supabase/supabase-js';
}
