import {test,expect,_electron as electron} from '@playwright/test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {spawn,execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {once} from 'node:events'
import {createRequire} from 'node:module'

const exec=promisify(execFile)
const executablePath=process.env.THUS_PACKAGED_EXECUTABLE
const developmentExecutable=createRequire(import.meta.url)('electron') as string

test('preview does not relaunch the app, second instances exit, and closing stops workers',async()=>{
  test.skip(process.platform!=='win32','Windows Rollup process-probe regression')
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'thus-lifecycle-'))
  const env:Record<string,string>=Object.fromEntries(Object.entries({...process.env,THUS_USER_DATA:profile,THUS_DISABLE_UPDATE_CHECK:'1'}).filter((entry):entry is [string,string]=>typeof entry[1]==='string'))
  delete env.ELECTRON_RUN_AS_NODE
  delete env.VITE_DEV_SERVER_URL
  const app=await electron.launch({...(executablePath?{executablePath,args:[]}:{args:['.']}),env})
  const main=app.process()
  const processPids:number[]=[]
  try{
    const page=await app.firstWindow()
    await app.evaluate(({app})=>{
      ;(globalThis as any).__secondInstances=0
      app.on('second-instance',()=>{(globalThis as any).__secondInstances++})
    })
    const html=await page.evaluate(async()=>{
      const result=await window.editor.invoke('render',{raw:'## Preview\n\n$$\nx^2\n$$\n\n```js\nconst x = 1\n```',file:'posts/test.md'})
      return result.html
    })
    expect(html).toContain('mjx-container')
    expect(html).toContain('shiki')
    // A single-instance lock must not merely hide the erroneous Node probe.
    expect(await app.evaluate(()=> (globalThis as any).__secondInstances)).toBe(0)
    expect(await app.evaluate(()=>process.env.ELECTRON_RUN_AS_NODE)).toBeUndefined()
    const metrics=await app.evaluate(({app})=>app.getAppMetrics().map(p=>({pid:p.pid,type:p.type})))
    expect(metrics.some(p=>p.type==='Utility')).toBe(true)
    processPids.push(await app.evaluate(()=>process.pid),...metrics.map(p=>p.pid))

    const second=spawn(executablePath||developmentExecutable,executablePath?[]:['.'],{env,windowsHide:true,stdio:'ignore'})
    try{
      const exited=once(second,'exit')
      await expect.poll(()=>second.exitCode,{timeout:10000}).toBe(0)
      await exited
      await expect.poll(()=>app.evaluate(()=>(globalThis as any).__secondInstances)).toBe(1)
    }finally{if(second.exitCode===null)second.kill()}

    const closed=app.waitForEvent('close')
    await page.getByRole('button',{name:'关闭窗口',exact:true}).click()
    await closed
    await expect.poll(async()=>{
      const {stdout}=await exec('powershell.exe',['-NoProfile','-Command',`@(Get-Process -Id ${[...new Set(processPids)].join(',')} -ErrorAction SilentlyContinue).Count`])
      return Number(stdout.trim())
    },{timeout:15000}).toBe(0)
  }finally{
    if(main.exitCode===null)await app.close().catch(()=>{})
    await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200})
  }
})
