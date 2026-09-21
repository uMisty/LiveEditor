import {test,expect,_electron as electron} from '@playwright/test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

test('homepage editing and filter dismissal leave the workspace interactive',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'thus-home-filters-'))
  const project=path.join(root,'project'),posts=path.join(project,'content/posts/2026/09/20')
  await fs.mkdir(posts,{recursive:true});await fs.mkdir(path.join(project,'.vitepress'),{recursive:true});await fs.mkdir(path.join(project,'src/styles'),{recursive:true})
  await fs.writeFile(path.join(project,'.vitepress/config.ts'),'// github-light github-dark')
  for(const style of ['theme','markdown'])await fs.writeFile(path.join(project,`src/styles/${style}.css`),'')
  for(let i=0;i<64;i++)await fs.writeFile(path.join(posts,`${i}.md`),`---\ntitle: Article ${i}\ntags: [${i===0?'unique':'writing'}]\n---\nBody ${i}`)
  await fs.writeFile(path.join(project,'site.profile.json'),'{}')
  const home='---\nlayout: home\n# Keep homepage metadata\ncustom: retained\n---\n\n<Avatar />\n\n# Welcome home\n\nHomepage introduction.\n'
  await fs.writeFile(path.join(project,'content/index.md'),home)
  await fs.mkdir(path.join(root,'profile'));await fs.writeFile(path.join(root,'profile/preferences.json'),JSON.stringify({project}))
  const env:Record<string,string>=Object.fromEntries(Object.entries({...process.env,THUS_USER_DATA:path.join(root,'profile')}).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));delete env.ELECTRON_RUN_AS_NODE;delete env.VITE_DEV_SERVER_URL
  const app=await electron.launch({args:['.'],env});const page=await app.firstWindow();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  try{
    await expect(page.getByLabel('搜索文章')).toBeVisible()
    for(let i=0;i<6;i++){
      await page.getByRole('button',{name:'全部年份',exact:true}).click()
      await page.getByRole('group',{name:'年份'}).getByRole('button',{name:'2026',exact:true}).click()
      await page.getByRole('button',{name:/^1 月/}).click()
      if(i%3===0)await page.keyboard.press('Escape')
      else if(i%3===1)await page.getByRole('button',{name:'关闭弹窗'}).click()
      else await page.getByRole('button',{name:'查看文章'}).click()
      await expect(page.locator('dialog:modal')).toHaveCount(0)
      if(i%3===2)await page.getByRole('button',{name:'清除筛选'}).click()
      else await expect(page.getByRole('button',{name:'清除筛选'})).toHaveCount(0)
      await page.getByRole('button',{name:'选择标签'}).click();await page.getByRole('checkbox',{name:/unique/}).check()
      await page.getByRole('button',{name:'查看文章'}).click();await expect(page.locator('.article-row')).toHaveCount(1)
      await page.getByRole('button',{name:'清除筛选'}).click()
      await page.getByLabel('搜索文章').fill('Article 2');await expect(page.locator('.article-row').first()).toBeVisible();await page.getByLabel('搜索文章').fill('')
    }
    await page.getByRole('button',{name:'首页信息',exact:true}).click()
    await expect(page.locator('.breadcrumb')).toContainText('index.md');await expect(page.locator('.cm-content')).toContainText('Homepage introduction.')
    const preview=page.frameLocator('iframe');await expect(preview.locator('h1')).toHaveText('Welcome home');await expect(preview.locator('.meta')).not.toContainText('非草稿')
    await page.getByRole('button',{name:'更多文章操作'}).click();await expect(page.getByRole('button',{name:'移入回收站',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'移动或重命名',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'关闭弹窗'}).click()
    await page.locator('.cm-content').click();await page.keyboard.press('Control+End');await page.keyboard.type('\nHome edited.');await expect(preview.locator('article')).toContainText('Home edited.')
    await page.getByRole('button',{name:'全部文章',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('保存修改后再离开');await page.getByRole('button',{name:'取消',exact:true}).click()
    await page.keyboard.press('Control+s');await expect(page.locator('.statusbar')).toContainText('已保存到本地')
    const saved=await fs.readFile(path.join(project,'content/index.md'),'utf8');expect(saved).toContain('Home edited.');expect(saved).toContain('layout: home\n# Keep homepage metadata\ncustom: retained');expect(saved).toContain('<Avatar />')
    await page.getByRole('button',{name:'完整源码',exact:true}).click();await expect(page.locator('.cm-content')).toContainText('layout: home');await page.getByRole('button',{name:'返回正文',exact:true}).click()
    await page.getByRole('button',{name:'预览',exact:true}).click();await expect(preview.locator('h1')).toHaveText('Welcome home');await page.screenshot({path:'test-results/homepage-preview.png'})
    await fs.writeFile(path.join(project,'content/index.md'),saved+'\nExternal home edit.');await expect(preview.locator('article')).toContainText('External home edit.')
    await page.getByRole('button',{name:'全部文章',exact:true}).click();await page.getByRole('button',{name:'全部月份',exact:true}).click();await page.getByRole('button',{name:/^1 月/}).click();await page.getByRole('button',{name:'查看文章'}).click();await expect(page.getByRole('button',{name:'清除筛选'})).toBeVisible();await page.getByRole('button',{name:'清除筛选'}).click()
    expect(errors).toEqual([])
  }finally{await app.evaluate(({app})=>app.exit());await fs.rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:200})}
})
