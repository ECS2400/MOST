/**
 * Mediator Engine v2.3 — Supabase Edge runtime entrypoint.
 *
 * Deploy handler is prebundled — run `npm run build:mediator:edge` before deploy.
 * See ./DENO_COMPAT.md
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleMediatorRuntimeHttpRequest } from './_generated/mediatorRuntime.bundle.ts';

serve((req) => handleMediatorRuntimeHttpRequest(req));
