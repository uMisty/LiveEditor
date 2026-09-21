import { renderMarkdown } from './render'
const port=(process as any).parentPort
port.on('message',async({data}:any)=>{
  try {port.postMessage({id:data.id,result:await renderMarkdown(data.raw,data.file)})}
  catch(e:any){port.postMessage({id:data.id,error:e.message})}
})
