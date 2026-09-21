import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import electron from 'electron'
await import('./build.mjs')
const server = await createServer({ server: { strictPort: false } }); await server.listen()
const address = server.httpServer.address()
const env = { ...process.env, VITE_DEV_SERVER_URL: `http://127.0.0.1:${address.port}` }; delete env.ELECTRON_RUN_AS_NODE
server.printUrls()
const child = spawn(electron, ['.'], { env, stdio: 'inherit' })
child.on('exit', async () => { await server.close(); process.exit() })
