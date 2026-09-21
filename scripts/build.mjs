import { build } from 'esbuild'
await build({ entryPoints: ['electron/main.ts', 'electron/render-worker.ts'], outdir: 'dist-electron', platform: 'node', format: 'esm', packages: 'external', bundle: true, outExtension: { '.js': '.mjs' }, sourcemap: true })
await build({ entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.cjs', platform: 'node', format: 'cjs', external: ['electron'], bundle: true })
