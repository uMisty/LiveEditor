import {_electron as electron} from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'thus-docs-'))
const project=path.join(root,'Thus.Live'),posts=path.join(project,'content/posts/2026/09/20'),profile=path.join(root,'profile'),output=path.resolve('docs/images')
await fs.mkdir(posts,{recursive:true});await fs.mkdir(path.join(project,'.vitepress'),{recursive:true});await fs.mkdir(path.join(project,'src/styles'),{recursive:true});await fs.mkdir(profile);await fs.mkdir(output,{recursive:true})
await fs.writeFile(path.join(project,'.vitepress/config.ts'),'// github-light github-dark')
await fs.writeFile(path.join(project,'src/styles/theme.css'),':root{--accent:#2f6f61}')
await fs.writeFile(path.join(project,'src/styles/markdown.css'),'.markdown-body{line-height:28px}.markdown-body blockquote{margin:16px 0;color:var(--muted)}')
const titles=['让写作回归简单','博客编写与发布指南','Markdown 写作与代码展示','关于设计与留白']
for(let i=0;i<titles.length;i++){
  const file=path.join(posts,`article-${i}.md`)
  await fs.writeFile(file,`---\ntitle: ${titles[i]}\ndescription: 用熟悉的 Markdown，记录值得留下的想法。\ntags: [写作, 设计]\ndraft: ${i===0}\n---\n## 为想法留一处安静的地方\n\n打开熟悉的项目，让零散的想法慢慢成形。\n好的工具，让注意力停留在文字本身。\n\n> 写作，是与自己的想法认真相处。\n\n## 从一段文字开始\n\n在本地编辑，实时看到博客中的样子。\n\n~~~typescript\nconst writing = {\n  focus: true,\n  format: 'markdown'\n}\n~~~\n`)
  const time=new Date(Date.now()-i*86400000);await fs.utimes(file,time,time)
}
await fs.writeFile(path.join(project,'content/index.md'),'---\nlayout: home\n---\n\n# Thus.Live\n\n记录、思考与分享\n\n这里收集技术笔记、阅读记录和日常想法。\n\n把值得留下的想法，慢慢写成文字。\n\n[浏览博文 →](/blog)\n')
await fs.writeFile(path.join(project,'site.profile.json'),JSON.stringify({name:'Thus.Live',author:'uMisty',title:'Thus.Live · 记录与分享',description:'记录当下，持续思考。',url:'https://thus.live',footer:'记录与分享'}))
await fs.writeFile(path.join(profile,'preferences.json'),JSON.stringify({project,theme:'light',syncScroll:true}))
const env={...process.env,THUS_USER_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;delete env.VITE_DEV_SERVER_URL
let app
try{
  app=await electron.launch({args:['.'],env});const page=await app.firstWindow()
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:1000}))
  async function shot(name){await page.mouse.move(20,20);for(const frame of page.frames())await frame.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,name+'.png')})}
  await page.frameLocator('iframe').getByRole('heading',{name:titles[0],exact:true}).waitFor();await shot('article-library')
  await page.locator('.article-row').first().dblclick();await page.locator('.cm-editor').waitFor();await page.frameLocator('iframe').getByRole('heading',{name:titles[0],exact:true}).waitFor();await shot('split-editor')
  await page.getByRole('button',{name:'首页信息',exact:true}).click();await page.frameLocator('iframe').locator('article h1').waitFor();await shot('homepage-editor')
  await page.getByRole('button',{name:'博客信息',exact:true}).click();await page.getByLabel('站点名称',{exact:true}).waitFor();await shot('blog-settings')
  await page.getByRole('button',{name:'项目设置',exact:true}).click();await page.getByRole('button',{name:'外观与写作',exact:true}).click();await page.getByRole('button',{name:'深色',exact:true}).click();await page.getByRole('button',{name:'全部文章',exact:true}).click();await page.locator('.article-row').first().dblclick();await page.frameLocator('iframe').getByRole('heading',{name:titles[0],exact:true}).waitFor();await shot('dark-editor')
  console.log('Saved five application screenshots to docs/images')
}finally{if(app)await app.evaluate(({app})=>app.exit());if(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('thus-docs-'))await fs.rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:200})}
