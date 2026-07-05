/**
 * Registers the `@/` path alias hook for architecture runtime tests.
 *
 *   node --import ./services/mediatorEngine/__tests__/path-alias-loader.mjs ...
 */

import { register } from 'node:module';

register('./path-alias-hook.mjs', import.meta.url);
