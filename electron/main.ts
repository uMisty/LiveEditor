import { app,BrowserWindow,dialog,ipcMain,protocol,net,session,shell,Menu,utilityProcess } from 'electron'
import type { UtilityProcess } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath,pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import chokidar from 'chokidar'
import { ProjectService,safePath,inside,hash,slash } from './project'
import { stableVersion,isNewerStableVersion } from '../shared/update'
import type { Preferences,Recovery,UpdateInfo } from '../shared/types'

const here=path.dirname(fileURLToPath(import.meta.url))
if(process.env.THUS_USER_DATA)app.setPath('userData',process.env.THUS_USER_DATA)
protocol.registerSchemesAsPrivileged([{scheme:'thus',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}},{scheme:'appasset',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}])
const project=new ProjectService();let win:BrowserWindow;let mayClose=false;let watcher:ReturnType<typeof chokidar.watch>|undefined;let worker:UtilityProcess|undefined
const pending=new Map<string,{resolve:Function;reject:Function;timer:ReturnType<typeof setTimeout>}>()
const configFile=()=>path.join(app.getPath('userData'),'preferences.json')
const recoveryDir=()=>path.join(app.getPath('userData'),'recovery')
async function readPreferences():Promise<Preferences>{try{return JSON.parse(await fs.readFile(configFile(),'utf8'))}catch{return {theme:'system',syncScroll:true}}}
async function writeJSON(file:string,value:unknown){await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.'+randomUUID()+'.tmp';try{await fs.writeFile(tmp,JSON.stringify(value),'utf8');await fs.rename(tmp,file)}finally{await fs.rm(tmp,{force:true})}}
const recoveryFile=(file:string)=>path.join(recoveryDir(),hash(project.root+'\0'+file)+'.json')
async function recoveries(){await fs.mkdir(recoveryDir(),{recursive:true});const items:Recovery[]=[];for(const name of await fs.readdir(recoveryDir())){try{const item=JSON.parse(await fs.readFile(path.join(recoveryDir(),name),'utf8'));if(item.project===project.root)items.push(item)}catch{}}return items.sort((a,b)=>b.time-a.time)}
function ensureWorker(){
  if(worker)return worker
  worker=utilityProcess.fork(path.join(here,'render-worker.mjs'))
  worker.on('message',(message:any)=>{const task=pending.get(message.id);if(!task)return;clearTimeout(task.timer);pending.delete(message.id);message.error?task.reject(new Error(message.error)):task.resolve(message.result)})
  worker.on('exit',()=>{worker=undefined;for(const p of pending.values()){clearTimeout(p.timer);p.reject(new Error('预览进程已退出，请重试'))}pending.clear()})
  return worker
}
function render(raw:string,file:string){return new Promise((resolve,reject)=>{const id=randomUUID();const timer=setTimeout(()=>{pending.delete(id);reject(new Error('预览超时，请减少复杂图表或重试'))},30000);pending.set(id,{resolve,reject,timer});ensureWorker().postMessage({id,raw,file})})}
async function checkForUpdate():Promise<UpdateInfo|null>{
  if(process.env.THUS_DISABLE_UPDATE_CHECK==='1')return null
  const response=await net.fetch('https://api.github.com/repos/uMisty/LiveEditor/releases/latest',{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(10_000)})
  if(!response.ok)throw new Error(`GitHub 更新检查失败（${response.status}）`)
  const release=await response.json() as {tag_name?:unknown;html_url?:unknown;name?:unknown;draft?:unknown;prerelease?:unknown}
  if(release.draft||release.prerelease||typeof release.tag_name!=='string')return null
  const latest=stableVersion(release.tag_name);if(!latest||!isNewerStableVersion(app.getVersion(),latest.tag))return null
  const expected=`https://github.com/uMisty/LiveEditor/releases/tag/${latest.tag}`
  const url=typeof release.html_url==='string'&&release.html_url.startsWith('https://github.com/uMisty/LiveEditor/releases/')?release.html_url:expected
  return {version:latest.version,tag:latest.tag,url,name:typeof release.name==='string'&&release.name.trim()?release.name.trim().slice(0,160):`Thus.Live Editor ${latest.tag}`}
}
async function connect(root:string){
  const result=await project.connect(root,process.env.THUS_READ_ONLY==='1');await watcher?.close();watcher=undefined
  if(process.env.THUS_DISABLE_WATCHER!=='1'){
    watcher=chokidar.watch([path.join(root,'content/posts'),path.join(root,'content/index.md'),path.join(root,'src/styles'),path.join(root,'.vitepress/config.ts')],{ignoreInitial:true,followSymlinks:false,usePolling:process.env.CI==='true',interval:100,awaitWriteFinish:{stabilityThreshold:250,pollInterval:100}})
    watcher.on('all',(_event,file)=>{if(file.includes('.thus-'))return;win?.webContents.send('project:change',{kind:file.endsWith('.css')?'styles':file.endsWith('config.ts')?'config':'content',file:slash(path.relative(project.content,file))})})
    await new Promise<void>((resolve,reject)=>{watcher!.once('ready',resolve);watcher!.once('error',reject)})
  }
  await writeJSON(configFile(),{...await readPreferences(),project:root});return result
}
async function handle(action:string,p:any){
  switch(action){
    case 'appInfo':{const version=app.getVersion();return {name:'Thus.Live Editor',version,releaseTag:`v${version}`,releaseUrl:`https://github.com/uMisty/LiveEditor/releases/tag/v${version}`}}
    case 'checkForUpdate':return checkForUpdate()
    case 'preferences':return readPreferences()
    case 'setPreferences':{const next:Preferences={...await readPreferences()};if(['system','light','dark'].includes(p.theme))next.theme=p.theme;if(typeof p.syncScroll==='boolean')next.syncScroll=p.syncScroll;if(typeof p.split==='number')next.split=Math.min(70,Math.max(30,p.split));if([14,16,18].includes(p.fontSize))next.fontSize=p.fontSize;if(typeof p.ignoredUpdateVersion==='string'&&/^\d+\.\d+\.\d+$/.test(p.ignoredUpdateVersion))next.ignoredUpdateVersion=p.ignoredUpdateVersion;if(p.library&&typeof p.library==='object'){const l=p.library;next.library={category:['all','drafts','tags','archive'].includes(l.category)?l.category:'all',query:String(l.query||'').slice(0,500),year:String(l.year||''),month:String(l.month||''),tags:Array.isArray(l.tags)?l.tags.filter((t:unknown)=>typeof t==='string'):[],sort:l.sort==='date'?'date':'modified',selected:typeof l.selected==='string'?l.selected:undefined,scroll:Math.max(0,Number(l.scroll)||0)}}await writeJSON(configFile(),next);return next}
    case 'chooseProject':{const result=await dialog.showOpenDialog(win,{properties:['openDirectory'],title:'选择 Thus.Live 项目目录'});return result.canceled?null:result.filePaths[0]}
    case 'connect':return connect(p.root)
    case 'refresh':return project.info()
    case 'blogProfile':return project.blogProfile()
    case 'saveBlogProfile':return project.saveBlogProfile(p.values,p.hash)
    case 'read':return project.read(p.file)
    case 'save':return project.save(p.file,p.raw,p.hash)
    case 'create':return project.create(p.date,p.slug,p.folder,p.raw)
    case 'render':{if(typeof p.raw!=='string'||p.raw.length>5_000_000)throw new Error('预览支持最多 5 MB 文本');return render(p.raw,p.file)}
    case 'recovery':{await safePath(project.content,p.file,true);await writeJSON(recoveryFile(p.file),{project:project.root,file:p.file,raw:p.raw,hash:p.hash,time:Date.now()});return true}
    case 'recoveries':return recoveries()
    case 'discardRecovery':{await fs.rm(recoveryFile(p.file),{force:true});return true}
    case 'chooseImage':{const result=await dialog.showOpenDialog(win,{properties:['openFile'],filters:[{name:'图片',extensions:['png','jpg','jpeg','gif','webp','avif','svg']}]});if(result.canceled)return null;const file=result.filePaths[0];const stat=await fs.stat(file);if(stat.size>25*1024*1024)throw new Error('图片不能超过 25 MB');return {name:path.basename(file),bytes:await fs.readFile(file)}}
    case 'importImage':return project.importImage(p.file,p.name,new Uint8Array(p.bytes),p.useExisting)
    case 'imagePlan':return project.imagePlan(p.file,p.name)
    case 'planMove':return project.planMove(p.file,p.to)
    case 'move':return project.move(p)
    case 'trash':{project.writable();if(p.file==='index.md')throw new Error('首页不能移入回收站');const original=await project.read(p.file);if(original.hash!==p.hash)throw new Error('文件已变化，请重新加载后删除');await shell.trashItem(await safePath(project.content,p.file));return true}
    case 'saveAs':{const result=await dialog.showSaveDialog(win,{defaultPath:path.basename(p.file),filters:[{name:'Markdown',extensions:['md']}]});if(result.canceled||!result.filePath)return null;if(project.readOnly&&inside(project.root,result.filePath))throw new Error('只读项目不允许写入，请选择项目外的位置');await fs.writeFile(result.filePath,p.raw,'utf8');return result.filePath}
    case 'external':{const url=new URL(p.url);if(!['https:','http:'].includes(url.protocol))throw new Error('不支持的链接');await shell.openExternal(url.href);return true}
    case 'windowState':return {maximized:win.isMaximized()}
    case 'minimize':win.minimize();return true
    case 'maximize':if(win.isMaximized())win.unmaximize();else win.maximize();return {maximized:win.isMaximized()}
    case 'requestClose':win.close();return true
    case 'close':mayClose=true;win.close();return true
    default:throw new Error('未知操作')
  }
}
async function createWindow(){
  const icon=path.join(here,app.isPackaged?'../dist/app-icon.png':'../public/app-icon.png')
  mayClose=false;win=new BrowserWindow({width:1440,height:900,minWidth:900,minHeight:650,frame:false,title:'Thus.Live Editor',icon,backgroundColor:'#ffffff',webPreferences:{preload:path.join(here,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}})
  if(process.platform==='darwin')app.dock?.setIcon(icon)
  win.setMenu(null)
  const sendWindowState=()=>win.webContents.send('window:state',{maximized:win.isMaximized()})
  win.on('maximize',sendWindowState);win.on('unmaximize',sendWindowState)
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault())
  win.on('close',e=>{if(!mayClose){e.preventDefault();win.webContents.send('app:close')}})
  const dev=process.env.VITE_DEV_SERVER_URL
  await win.loadURL(dev||'thus://app/index.html')
}
const primaryInstance=app.requestSingleInstanceLock()
if(!primaryInstance)app.quit()
else app.on('second-instance',()=>{if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.show();win.focus()}})
if(primaryInstance)app.whenReady().then(async()=>{
if(process.platform==='win32')app.setAppUserModelId('live.thus.editor')
session.defaultSession.setPermissionRequestHandler((_w,_p,cb)=>cb(false))
protocol.handle('thus',async req=>{const u=new URL(req.url);const file=path.resolve(here,'../dist','.'+decodeURIComponent(u.pathname));if(u.host!=='app'||!inside(path.resolve(here,'../dist'),file))return new Response('Forbidden',{status:403});const response=await net.fetch(pathToFileURL(file).href);response.headers.set('Access-Control-Allow-Origin','*');return response})
protocol.handle('appasset',async req=>{
  try{const u=new URL(req.url);if(u.host!=='project'||!project.root)throw new Error();const relative=decodeURIComponent(u.pathname.slice(1));if(!/\.(png|jpe?g|gif|webp|avif|svg|woff2?|ttf|otf)$/i.test(relative))throw new Error();const file=await safePath(project.content,relative);const response=await net.fetch(pathToFileURL(file).href);response.headers.set('Access-Control-Allow-Origin','*');response.headers.set('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'");return response}catch{return new Response('资源不存在',{status:404})}
})
ipcMain.handle('editor:request',async(event,action,payload)=>{
  if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)return {error:'访问被拒绝'}
  try{return {value:await handle(action,payload)}}catch(e:any){return {error:e.message||String(e)}}
})
Menu.setApplicationMenu(process.platform==='darwin'?Menu.buildFromTemplate([{label:'Thus.Live',submenu:[{role:'about'},{type:'separator'},{role:'quit'}]},{label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'视图',submenu:[{role:'zoomIn'},{role:'zoomOut'},{role:'resetZoom'},{role:'togglefullscreen'}]}]):null)
await createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)void createWindow()})
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()})
app.on('will-quit',()=>{void watcher?.close();worker?.kill()})
}).catch(error=>{console.error(error);app.exit(1)})
