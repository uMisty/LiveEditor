import { _electron as electron } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
const root=process.env.THUS_REFERENCE_ROOT
if(!root)throw new Error('Set THUS_REFERENCE_ROOT to the existing read-only project')
const profile=await fs.mkdtemp(path.join(os.tmpdir(),'thus-readonly-'))
const env={...process.env,THUS_USER_DATA:profile,THUS_READ_ONLY:'1'};delete env.ELECTRON_RUN_AS_NODE
const executablePath=process.env.THUS_PACKAGED_EXE
const app=await electron.launch({...(executablePath?{executablePath,args:[]}:{args:['.']}),env})
const page=await app.firstWindow()
const errors=[];page.on('pageerror',e=>errors.push(e.message))
try{
  await page.getByLabel('项目目录',{exact:true}).fill(root);await page.getByRole('button',{name:'连接目录',exact:true}).click();await page.getByRole('button',{name:'进入写作空间'}).click()
  await fs.mkdir('screenshots',{recursive:true});await page.screenshot({path:'screenshots/01-library.png',animations:'disabled'})
  const row=page.locator('.article-row').filter({has:page.locator('.row-title',{hasText:'Markdown 写作与代码展示'})});await row.dblclick()
  const preview=page.frameLocator('iframe');await preview.locator('article h2').first().waitFor();await page.screenshot({path:'screenshots/02-editor-light.png',animations:'disabled'})
  await page.getByRole('button',{name:'切换深色'}).click();await page.waitForFunction(()=>document.documentElement.classList.contains('dark'));await preview.locator('html.dark').waitFor();await page.screenshot({path:'screenshots/03-editor-dark.png',animations:'disabled'})
  const snapshot=await page.evaluate(async()=>({project:await window.editor.invoke('refresh'),render:await window.editor.invoke('render',{raw:'---\ntitle: Scratch\ndraft: true\n---\n## 未保存草稿\n\n```mermaid\ngraph LR\nA-->B\n```',file:'posts/2026/09/20/scratch.md'})}))
  const all=await page.evaluate(async()=>{const p=await window.editor.invoke('refresh');const checks=[];for(const post of p.posts){const doc=await window.editor.invoke('read',{file:post.file});const result=await window.editor.invoke('render',{raw:doc.raw,file:doc.file});checks.push({file:doc.file,title:result.title,headers:result.headers.length})}return checks})
  console.log('Guides:',JSON.stringify(all))
  console.log(JSON.stringify({posts:snapshot.project.posts.length,readOnly:snapshot.project.readOnly,warnings:snapshot.project.warnings,previewHTML:snapshot.render.html.length,errors}))
  if(!snapshot.project.readOnly||errors.length)throw new Error('Read-only capture failed')
}finally{const closed=app.waitForEvent('close');await app.evaluate(({app})=>app.exit());await closed;await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200})}
