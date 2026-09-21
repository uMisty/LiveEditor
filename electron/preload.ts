import { contextBridge, ipcRenderer } from 'electron'
const actions=new Set(['blogProfile','saveBlogProfile','preferences','setPreferences','chooseProject','connect','refresh','read','save','create','render','recovery','recoveries','discardRecovery','chooseImage','importImage','imagePlan','planMove','move','trash','saveAs','close','external','windowState','minimize','maximize','requestClose'])
contextBridge.exposeInMainWorld('editor',{
  platform:process.platform,
  onWindowState(callback:Function){const fn=(_:unknown,state:unknown)=>callback(state);ipcRenderer.on('window:state',fn);return()=>ipcRenderer.removeListener('window:state',fn)},
  async invoke(action:string,payload:unknown){
    if(!actions.has(action))throw new Error('不支持的操作')
    const response=await ipcRenderer.invoke('editor:request',action,payload)
    if(response.error)throw new Error(response.error)
    return response.value
  },
  onChange(callback:Function){const fn=(_:unknown,event:unknown)=>callback(event);ipcRenderer.on('project:change',fn);return()=>ipcRenderer.removeListener('project:change',fn)},
  onClose(callback:Function){const fn=()=>callback();ipcRenderer.on('app:close',fn);return()=>ipcRenderer.removeListener('app:close',fn)}
})
