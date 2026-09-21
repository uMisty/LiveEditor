import { build } from 'esbuild'
// Preserve the worker's dynamic import boundary: renderer dependencies must not
// be hoisted ahead of its ELECTRON_RUN_AS_NODE initialization.
await build({ entryPoints: ['electron/main.ts', 'electron/render-worker.ts'], outdir: 'dist-electron', platform: 'node', format: 'esm', packages: 'external', bundle: true, splitting: true, outExtension: { '.js': '.mjs' }, sourcemap: true })
await build({ entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.cjs', platform: 'node', format: 'cjs', external: ['electron'], bundle: true })
