# mediator-runtime — Deno / Supabase Edge deploy compatibility

**Status: deploy via prebundled ESM (`esbuild`)**

## Deploy path

Source of truth for handler logic:

```
services/mediatorEngine/edge/*
```

Before deploy or `deno check`:

```bash
npm run build:mediator:edge
```

This writes:

```
supabase/functions/mediator-runtime/_generated/mediatorRuntime.bundle.ts
```

Deno entrypoint (`index.ts`) imports only:

1. `https://deno.land/std@0.168.0/http/server.ts`
2. `./_generated/mediatorRuntime.bundle.ts`

The bundle resolves all `@/services/...` and `@/types/mediator` imports at build time — **no import map required** for the runtime graph.

## Why prebundle (2G-fix-2 audit)

Unbundled source graph had **223 files** and **194 extensionless `@/` imports**. Deno does not auto-append `.ts` after import-map prefix substitution.

Prebundle eliminates extensionless aliases from the deploy graph.

## Verify locally

```bash
npm run build:mediator:edge
deno check --config supabase/functions/mediator-runtime/deno.json supabase/functions/mediator-runtime/index.ts
npm run test:mediator:edge
```

## Supabase deploy

```bash
npm run build:mediator:edge
supabase functions deploy mediator-runtime --project-ref <PROJECT_REF>
```

Set secrets:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

## Privacy

- No prompt/transcript logging in source edge files or generated bundle
- Production response excludes raw prompts and provider payloads
