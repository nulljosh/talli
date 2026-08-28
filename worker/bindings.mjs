// Bindings on globalThis rather than threaded through src/api.js's 2,000 lines.
// Readers: src/_blob.js (BLOB) and serveAsset in src/api.js (ASSETS).
//
// The whole `env` proxy is stashed, not individual bindings: during module
// evaluation (which is when src/api.js runs) env.ASSETS reads as undefined,
// and only resolves once there is a request scope. So callers must go through
// globalThis.__cfEnv at call time, never destructure it here.
//
// Its own module because ES imports are hoisted and this has to evaluate
// before src/api.js.
import { env } from 'cloudflare:workers';

globalThis.__cfEnv = env;
