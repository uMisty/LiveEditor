// Rollup (loaded by VitePress) probes Windows via process.execPath -p.
// In Electron that path is our app, so its children must run as Node.
// Set this only inside the worker and BEFORE evaluating renderer dependencies.
process.env.ELECTRON_RUN_AS_NODE='1'
const renderer=import('./render')
const port=(process as any).parentPort
port.on('message',async({data}:any)=>{
  try {const {renderMarkdown}=await renderer;port.postMessage({id:data.id,result:await renderMarkdown(data.raw,data.file)})}
  catch(e:any){port.postMessage({id:data.id,error:e.message})}
})
// Initialization errors are returned to requests rather than left unhandled.
void renderer.catch(()=>{})
