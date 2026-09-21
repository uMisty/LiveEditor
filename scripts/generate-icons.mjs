// Render the vector master with Electron's SVG engine; no extra image dependencies.
import {app,BrowserWindow} from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const output=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public')
app.commandLine.appendSwitch('force-device-scale-factor','1')
app.whenReady().then(async()=>{
try {
  const win=new BrowserWindow({show:false,width:1024,height:1024,frame:false,transparent:true,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,nodeIntegration:false,sandbox:true}})
  const svg=await fs.readFile(path.join(output,'app-icon.svg'),'utf8')
  const painted=new Promise(resolve=>win.webContents.once('paint',(_event,_rect,image)=>resolve(image)))
  await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${svg}`))
  const pngs=new Map(),shot=await painted
  for(const size of [16,24,32,48,64,128,256,512,1024]){
    const png=shot.resize({width:size,height:size,quality:'best'}).toPNG()
    pngs.set(size,png)
    await fs.writeFile(path.join(output,size===1024?'app-icon.png':`app-icon-${size}.png`),png)
  }
  const sizes=[16,24,32,48,64,128,256],header=Buffer.alloc(6+sizes.length*16)
  header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4)
  let offset=header.length
  sizes.forEach((size,index)=>{const pos=6+index*16,png=pngs.get(size);header[pos]=size===256?0:size;header[pos+1]=header[pos];header.writeUInt16LE(1,pos+4);header.writeUInt16LE(32,pos+6);header.writeUInt32LE(png.length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=png.length})
  await fs.writeFile(path.join(output,'app-icon.ico'),Buffer.concat([header,...sizes.map(size=>pngs.get(size))]))
  const chunks=[[128,'ic07'],[256,'ic08'],[512,'ic09'],[1024,'ic10']].map(([size,type])=>{const data=pngs.get(size),chunk=Buffer.alloc(8);chunk.write(type);chunk.writeUInt32BE(data.length+8,4);return Buffer.concat([chunk,data])})
  const icns=Buffer.alloc(8);icns.write('icns');icns.writeUInt32BE(8+chunks.reduce((sum,c)=>sum+c.length,0),4)
  await fs.writeFile(path.join(output,'app-icon.icns'),Buffer.concat([icns,...chunks]))
  win.destroy();console.log('Generated PNG, ICO and ICNS icons from public/app-icon.svg')
}catch(error){console.error(error);process.exitCode=1}finally{app.exit(process.exitCode||0)}
})
