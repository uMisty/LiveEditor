import {test,expect,_electron as electron} from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {createServer} from 'vite'

const mod=process.platform==='darwin'?'Meta':'Control'

for(const dev of [false,true])test(`Figma layouts, library preview and frameless window controls (${dev?'dev':'build'})`,async()=>{
  test.setTimeout(180000)
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'thus-figma-'))
  const project=path.join(root,'Thus.Live'),posts=path.join(project,'content/posts/2026/09/20')
  await fs.mkdir(posts,{recursive:true});await fs.mkdir(path.join(project,'.vitepress'),{recursive:true});await fs.mkdir(path.join(project,'src/styles'),{recursive:true})
  await fs.writeFile(path.join(project,'.vitepress/config.ts'),'// github-light github-dark')
  await fs.writeFile(path.join(project,'site.profile.json'),'{}')
  await fs.writeFile(path.join(project,'src/styles/theme.css'),':root{--accent:#2f6f61}')
  await fs.writeFile(path.join(project,'src/styles/markdown.css'),'.markdown-body{line-height:28px}.markdown-body pre{background:transparent}.markdown-body blockquote{margin:16px 0}.markdown-body code{font-family:"JetBrains Mono",monospace}')
  const titles=['让写作回归简单','博客编写与发布指南','Markdown 写作与代码展示','关于设计与留白']
  for(let i=0;i<titles.length;i++){
    await fs.writeFile(path.join(posts,`article-${i}.md`),`---\ntitle: ${titles[i]}\ndescription: 用熟悉的 Markdown，记录值得留下的想法。\ntags: [写作, 设计]\ndraft: ${i===0}\n---\n## 为想法留一处安静的地方\n\n打开熟悉的项目，让零散的想法慢慢成形。\n好的工具，让注意力停留在文字本身。\n\n> 写作，是与自己的想法认真相处。\n\n## 从一段文字开始\n\n在本地编辑，实时看到博客中的样子。\n\n~~~typescript\nconst writing = {\n  focus: true,\n  format: 'markdown'\n}\n~~~\n`)
    const time=new Date(Date.now()-i*86400000);await fs.utimes(path.join(posts,`article-${i}.md`),time,time)
  }
  const env:Record<string,string>=Object.fromEntries(Object.entries({...process.env,THUS_USER_DATA:path.join(root,'profile'),THUS_DISABLE_UPDATE_CHECK:'1'}).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));delete env.ELECTRON_RUN_AS_NODE;delete env.VITE_DEV_SERVER_URL
  const server=dev?await createServer({server:{port:0,strictPort:false}}):undefined
  if(server){await server.listen(0);const address=server.httpServer!.address();if(address&&typeof address!=='string')env.VITE_DEV_SERVER_URL=`http://127.0.0.1:${address.port}`}
  const app=await electron.launch({args:['.'],env});const page=await app.firstWindow();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())})
  const output=path.resolve('test-results/figma-verified',dev?'dev':'.');await fs.mkdir(output,{recursive:true})
  async function shot(name:string){await page.mouse.move(20,20);await page.evaluate(()=>document.fonts.ready);for(const frame of page.frames().slice(1))await frame.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,name+'.png')})}
  async function closeDialog(){await page.getByRole('button',{name:'关闭弹窗'}).click();await expect(page.getByRole('dialog')).toHaveCount(0)}
  try{
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:900}))
    await expect(page.locator('.topbar')).toHaveCSS('height','56px')
    const windowMetrics=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return {menu:w.isMenuBarVisible(),outer:w.getSize(),content:w.getContentSize()}})
    expect(windowMetrics.menu).toBe(process.platform==='darwin');expect(windowMetrics.outer[0]).toBe(1440);expect(windowMetrics.content[0]).toBe(1440);expect(windowMetrics.outer[1]).toBeGreaterThanOrEqual(650);expect(windowMetrics.content[1]).toBeGreaterThanOrEqual(650)
    await shot('S01-connect')
    await page.getByRole('button',{name:'也可以粘贴项目的绝对路径。'}).click();await page.getByLabel('项目目录',{exact:true}).fill(project)
    await page.getByLabel('项目目录',{exact:true}).fill(path.join(root,'missing'));await page.getByRole('button',{name:'连接目录',exact:true}).click();await expect(page.locator('.connect-card h1')).toHaveText('找不到这个项目目录');await shot('S03-missing-project');await page.getByLabel('项目目录',{exact:true}).fill(project)
    await page.getByRole('button',{name:'连接目录',exact:true}).click();await expect(page.getByRole('button',{name:'进入写作空间'})).toBeVisible();await shot('S02-connected')
    await page.getByRole('button',{name:'进入写作空间'}).click()
    await expect(page.locator('.article-row')).toHaveCount(4)
    await expect(page.frameLocator('iframe').locator('h1')).toHaveText(titles[0])
    expect(await page.frameLocator('iframe').locator('body').evaluate(()=>({origin:window.origin,bridge:typeof window.editor}))).toEqual({origin:'null',bridge:'undefined'})
    expect(await page.locator('.sidebar').evaluate(el=>el.getBoundingClientRect().width)).toBe(208)
    expect(await page.locator('.article-list').evaluate(el=>el.getBoundingClientRect().width)).toBe(444)
    expect(await page.locator('.article-row').first().evaluate(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,height:el.getBoundingClientRect().height}))).toEqual({x:232,y:308,height:112})
    await shot('S05-library')
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1920,height:1080}))
    await shot('wide-library-preview')
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:900}))
    await page.locator('.article-row').nth(1).click();await expect(page.frameLocator('iframe').locator('h1')).toHaveText(titles[1])
    // Single-click previews never open a document or change the edit buffer.
    await expect(page.locator('.cm-editor')).toHaveCount(0)
    await page.getByLabel('搜索文章').fill('博客');await expect(page.locator('.article-row')).toHaveCount(1);await shot('S06-search')
    await page.getByLabel('搜索文章').fill('not-present');await expect(page.locator('.article-row')).toHaveCount(0);await shot('S10-no-results')
    await page.getByLabel('搜索文章').fill('');await expect(page.locator('.article-row')).toHaveCount(4)
    await page.getByRole('button',{name:'全部年份',exact:true}).click();await shot('S37-date');await closeDialog()
    await expect(page.getByRole('button',{name:'归档',exact:true})).toHaveCount(0)
    await page.getByRole('button',{name:'选择标签',exact:true}).click();await shot('S38-tags');await closeDialog()
    await page.getByRole('button',{name:'博客信息',exact:true}).click();await expect(page.getByLabel('站点名称',{exact:true})).toHaveValue('Thus.Live')
    await page.getByLabel('站点名称',{exact:true}).fill('我的博客');await page.getByLabel('博客网址',{exact:true}).fill('https://blog.example.com');await page.getByRole('button',{name:'保存博客信息',exact:true}).click();await expect(page.getByText('博客信息已保存到项目。')).toBeVisible()
    expect(JSON.parse(await fs.readFile(path.join(project,'site.profile.json'),'utf8')).name).toBe('我的博客');await page.locator('.blog-settings').evaluate(el=>el.scrollTop=0);await shot('blog-information')
    await page.getByLabel('作者',{exact:true}).fill('未保存作者');await page.getByRole('button',{name:'全部文章',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('保存博客信息后再离开');await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.getByLabel('作者',{exact:true})).toHaveValue('未保存作者')
    await page.getByRole('button',{name:'全部文章',exact:true}).click();await page.getByRole('button',{name:'放弃修改',exact:true}).click();await page.getByRole('button',{name:'博客信息',exact:true}).click();await page.getByLabel('页脚文字',{exact:true}).fill('保持好奇');await page.keyboard.press(mod+'+s');await expect(page.getByText('博客信息已保存到项目。')).toBeVisible();expect(JSON.parse(await fs.readFile(path.join(project,'site.profile.json'),'utf8')).footer).toBe('保持好奇');await page.getByRole('button',{name:'全部文章',exact:true}).click()
    await page.getByRole('button',{name:'草稿',exact:true}).click();await expect(page.locator('.article-row')).toHaveCount(1);await shot('S09-drafts')
    await page.locator('.article-row').first().dblclick();await expect(page.locator('.cm-editor')).toBeVisible();await expect(page.frameLocator('iframe').locator('h1')).toHaveText(titles[0]);await shot('S11-split')
    await page.locator('.toolbar').getByRole('button',{name:'文章信息',exact:true}).click();await shot('S14-metadata');await closeDialog()
    await page.getByRole('button',{name:'写作',exact:true}).click();await shot('S12-write')
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1920,height:1080}))
    const wide=await page.evaluate(()=>{const bounds=(selector:string)=>document.querySelector(selector)!.getBoundingClientRect();const pane=bounds('.editor-pane'),editor=bounds('.codemirror'),toolbar=bounds('.toolbar'),actions=bounds('.article-actions'),button=bounds('.article-actions .more'),icon=bounds('.article-actions .more svg');return {editorInset:pane.width-editor.width,rightGap:toolbar.right-actions.right,iconInside:icon.left>=button.left&&icon.right<=button.right&&icon.top>=button.top&&icon.bottom<=button.bottom}})
    expect(wide.editorInset).toBeLessThanOrEqual(2);expect(wide.rightGap).toBe(16);expect(wide.iconInside).toBe(true)
    await page.getByRole('button',{name:'更多文章操作'}).hover();await shot('wide-writing')
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:900}))
    await page.getByRole('button',{name:'预览',exact:true}).click();await shot('S13-preview')
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1920,height:1080}))
    await expect.poll(()=>page.frameLocator('iframe').locator('article').evaluate(el=>Math.round(el.getBoundingClientRect().width))).toBeGreaterThan(1600)
    await shot('wide-preview');await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:900}))
    await page.getByRole('button',{name:'分栏',exact:true}).click()
    await page.getByRole('button',{name:'更多文章操作'}).click();await shot('S39-actions');await page.getByRole('button',{name:'编辑完整源文件',exact:true}).click();await shot('S41-source')
    await page.getByRole('button',{name:'返回正文',exact:true}).click()
    await page.keyboard.press(mod+'+p');await shot('S16-quick-open');await closeDialog()
    await page.getByRole('button',{name:'＋ 新建文章',exact:true}).click();await shot('S17-new');await closeDialog()
    await page.getByRole('button',{name:'＋ 新建文章',exact:true}).click();await page.getByLabel('标题',{exact:true}).fill('重复的文章');await page.getByLabel('文件名',{exact:true}).fill('article-0');await page.getByLabel('发布日期',{exact:true}).fill('2026-09-20');await page.getByRole('button',{name:'创建草稿',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('文件名已存在');await shot('S18-name-conflict');await closeDialog()
    await page.locator('.toolbar').getByRole('button',{name:'文章信息',exact:true}).click();await page.getByLabel('文章状态',{exact:true}).selectOption({label:'非草稿'});await page.getByRole('button',{name:'应用修改'}).click();await expect(page.getByRole('dialog')).toContainText('将文章设为非草稿');await shot('S33-draft-confirmation');await closeDialog()
    const imageFile=path.join(root,'picture.png');const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1sAAAAASUVORK5CYII=','base64');await fs.writeFile(imageFile,bytes)
    await fs.mkdir(path.join(posts,'assets'));await fs.writeFile(path.join(posts,'assets/picture.png'),bytes)
    await app.evaluate(({dialog},file)=>{(dialog as any).showOpenDialog=async()=>({canceled:false,filePaths:[file]})},imageFile)
    await page.getByRole('button',{name:'插入图片',exact:true}).click();await shot('S19-image');await page.getByRole('button',{name:'复制并插入'}).click();await expect(page.getByRole('dialog')).toContainText('图片文件同名');await shot('S20-image-conflict')
    expect(await fs.readdir(path.join(posts,'assets'))).toEqual(['picture.png'])
    await page.getByRole('button',{name:'保留两份',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);expect(await fs.readFile(path.join(posts,'assets/picture.png'))).toEqual(bytes);expect(await fs.readFile(path.join(posts,'assets/picture-1.png'))).toEqual(bytes)
    await page.getByRole('button',{name:'保存',exact:true}).click();await expect(page.locator('.statusbar')).toContainText('已保存到本地')
    await page.getByRole('button',{name:'更多文章操作'}).click();await page.getByRole('button',{name:'移动或重命名',exact:true}).click();await shot('S21-move');await page.getByLabel('文件名',{exact:true}).fill('renamed');await page.getByRole('button',{name:'检查移动影响'}).click();await shot('S42-move-confirmation');await closeDialog()
    await page.getByRole('button',{name:'更多文章操作'}).click();await page.getByRole('button',{name:'移入回收站',exact:true}).click();await shot('S36-trash');await closeDialog()
    await page.getByRole('button',{name:'项目设置',exact:true}).click();await shot('S26-settings')
    await page.getByRole('button',{name:'渲染兼容性',exact:true}).click();await shot('S27-render')
    await page.getByRole('button',{name:'外观与写作',exact:true}).click();await shot('S29-appearance')
    await page.getByRole('button',{name:'快捷键',exact:true}).click();await shot('S30-shortcuts')
    await page.getByRole('button',{name:'关于软件',exact:true}).click();await expect(page.locator('.about-hero')).toContainText('Thus.Live Editor');await expect(page.locator('.about-details')).toContainText('0.1.0');await expect(page.getByRole('button',{name:'查看此版本 Release'})).toBeEnabled();await shot('about-software')
    await page.getByRole('button',{name:'外观与写作',exact:true}).click();await page.getByRole('button',{name:'深色',exact:true}).click();await page.getByRole('button',{name:'返回写作',exact:true}).click();await shot('S31-dark-windows')
    await page.getByRole('button',{name:'项目设置',exact:true}).click();await expect(page.locator('.settings')).toBeVisible();await page.getByRole('button',{name:'外观与写作',exact:true}).click();await page.getByRole('button',{name:'浅色',exact:true}).click({timeout:5000});await page.getByRole('button',{name:'返回写作',exact:true}).click()
    await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1080,height:900}))
    await expect(page.locator('.preview-pane')).not.toBeVisible();await expect(page.locator('.editor-pane')).toBeVisible();await shot('S32-compact')
    await page.getByRole('button',{name:'预览',exact:true}).click();await expect(page.locator('.preview-pane')).toBeVisible();await shot('compact-preview')
    await page.getByRole('button',{name:'分栏',exact:true}).click();await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setBounds({width:1440,height:900}))
    if(process.platform==='win32'){
      await page.getByRole('button',{name:'最大化窗口'}).click();await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isMaximized())).toBe(true)
      await page.getByRole('button',{name:'还原窗口'}).click();await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isMaximized())).toBe(false)
      await page.getByRole('button',{name:'最小化窗口'}).click();await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isMinimized())).toBe(true)
      await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.restore();w.focus()})
      await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isMinimized())).toBe(false)
    }else{
      await expect(page.getByRole('button',{name:'最大化窗口'})).toBeVisible();await expect(page.getByRole('button',{name:'最小化窗口'})).toBeVisible()
    }
    await page.locator('.cm-content').click();await page.keyboard.press(mod+'+End');await page.keyboard.type('\nUnsaved close test');await expect(page.locator('.statusbar')).toContainText('有未保存修改')
    await page.getByRole('button',{name:'关闭窗口',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('保存修改后再离开');await shot('S22-close-unsaved')
    await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.locator('.cm-content')).toContainText('Unsaved close test');expect(await fs.readFile(path.join(posts,'article-0.md'),'utf8')).not.toContain('Unsaved close test')
    expect(errors).toEqual([])
  }finally{await app.evaluate(({app})=>app.exit());await server?.close();if(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('thus-figma-'))await fs.rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:200})}
})
