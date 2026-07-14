/**
 * Minimal Node built-in module typings for mediator test typecheck.
 * Prefer `@types/node` when available; these shims keep `typecheck:node` self-contained.
 */

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare global {
  var process: {
    env: NodeJS.ProcessEnv;
    exit(code?: number): never;
  };
}

declare module 'node:assert/strict' {
  export function equal(actual: unknown, expected: unknown, message?: string): void;
  export function strictEqual(actual: unknown, expected: unknown, message?: string): void;
  export function deepEqual(actual: unknown, expected: unknown, message?: string): void;
  export function ok(value: unknown, message?: string): void;
  export function match(value: string, regExp: RegExp, message?: string): void;
  export function doesNotMatch(value: string, regExp: RegExp, message?: string): void;
  export function rejects(
    block: () => Promise<unknown>,
    message?: string
  ): Promise<void>;
  export function throws(block: () => unknown, message?: string): void;
}

declare module 'node:test' {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
  export function pathToFileURL(path: string): URL;
}

declare module 'node:child_process' {
  export function spawnSync(
    command: string,
    args: readonly string[],
    options?: { stdio?: 'inherit' | 'pipe'; shell?: boolean }
  ): { status: number | null };
}

declare module 'node:async_hooks' {
  export function runInAsyncScope<T>(fn: () => T): T;
}

declare module 'node:module' {
  export function register(
    specifier: string,
    parentURL: string | URL,
    options?: unknown
  ): void;
}

export {};
