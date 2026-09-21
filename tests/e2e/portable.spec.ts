import {test,expect,chromium,type Browser} from '@playwright/test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import {spawn,execFile} from 'node:child_process'
import {promisify} from 'node:util'

const exec=promisify(execFile)
const executable=process.env.THUS_PORTABLE_EXECUTABLE

test('single-file portable launches, preserves external settings and cleans up on close',async()=>{
  test.skip(process.platform!=='win32'||!executable,'Requires the Windows portable artifact')
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'thus-portable-test-'))
  await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({theme:'dark',syncScroll:false}))
  const server=net.createServer()
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  const port=(server.address() as net.AddressInfo).port
  await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))
  const env:NodeJS.ProcessEnv={...process.env,THUS_USER_DATA:profile,THUS_DISABLE_UPDATE_CHECK:'1'}
  delete env.ELECTRON_RUN_AS_NODE
  delete env.VITE_DEV_SERVER_URL
  const launcher=spawn(executable!,[`--remote-debugging-port=${port}`],{env,windowsHide:true,stdio:'ignore'})
  let browser:Browser|undefined
  let runtimeDirectory:string|undefined
  let pids:number[]=[]
  try{
    await expect.poll(async()=>{
      try{browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:1000});return true}catch{return false}
    },{timeout:60000}).toBe(true)
    const page=browser!.contexts()[0].pages()[0]
    await page.waitForFunction(()=>Boolean(window.editor))
    expect(await page.evaluate(()=>window.editor.invoke('preferences'))).toMatchObject({theme:'dark',syncScroll:false})
    const result=await page.evaluate(()=>window.editor.invoke('render',{raw:'## Portable\n\n$$\nx^2\n$$\n\n```js\nconst x = 1\n```',file:'posts/test.md'}))
    expect(result.html).toContain('mjx-container')
    expect(result.html).toContain('shiki')
    const session=await browser!.newBrowserCDPSession()
    const info=await session.send('SystemInfo.getProcessInfo')
    pids=info.processInfo.map(p=>p.id)
    const mainPid=info.processInfo.find(p=>p.type==='browser')!.id
    const {stdout}=await exec('powershell.exe',['-NoProfile','-Command',`(Get-Process -Id ${mainPid}).Path`])
    runtimeDirectory=path.dirname(stdout.trim())
    const relative=path.relative(os.tmpdir(),runtimeDirectory)
    expect(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)).toBeTruthy()
    await page.evaluate(()=>window.editor.invoke('setPreferences',{theme:'light'}))
    await page.getByRole('button',{name:'关闭窗口',exact:true}).click()
    await expect.poll(()=>launcher.exitCode,{timeout:20000}).toBe(0)
    expect(JSON.parse(await fs.readFile(path.join(profile,'preferences.json'),'utf8')).theme).toBe('light')
    await expect.poll(()=>fs.access(runtimeDirectory!).then(()=>true,()=>false)).toBe(false)
    await expect.poll(async()=>{
      const {stdout}=await exec('powershell.exe',['-NoProfile','-Command',`@(Get-Process -Id ${pids.join(',')} -ErrorAction SilentlyContinue).Count`])
      return Number(stdout.trim())
    }).toBe(0)
  }finally{
    await browser?.close().catch(()=>{})
    if(launcher.exitCode===null)await exec('taskkill',['/PID',String(launcher.pid),'/T','/F']).catch(()=>{})
    await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200})
  }
})
