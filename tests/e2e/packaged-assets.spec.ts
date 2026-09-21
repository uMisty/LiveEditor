import {test,expect,_electron as electron} from '@playwright/test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

test('trimmed package retains variable fonts, TeX extensions, accessible math and highlighting',async()=>{
  const executablePath=process.env.THUS_PACKAGED_EXECUTABLE
  test.skip(!executablePath,'Requires an actual packaged application')
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'thus-assets-'))
  const env:Record<string,string>=Object.fromEntries(Object.entries({...process.env,THUS_USER_DATA:profile,THUS_DISABLE_UPDATE_CHECK:'1'}).filter((entry):entry is [string,string]=>typeof entry[1]==='string'))
  delete env.ELECTRON_RUN_AS_NODE
  delete env.VITE_DEV_SERVER_URL
  const app=await electron.launch({executablePath,args:[],env})
  try{
    const page=await app.firstWindow()
    await page.waitForFunction(()=>Boolean(window.editor))
    const fonts=await page.evaluate(async()=>{
      const result=[]
      for(const family of ['Noto Sans SC','JetBrains Mono']) {
        for(const weight of [100,400,family==='Noto Sans SC'?900:800]) {
          const faces=await document.fonts.load(`${weight} 16px "${family}"`,family==='Noto Sans SC'?'中文繁體龘':'const x = 1')
          result.push({family,weight,loaded:faces.length>0&&faces.every(face=>face.status==='loaded')})
        }
      }
      return result
    })
    for(const font of fonts)expect(font.loaded,`${font.family} ${font.weight}`).toBe(true)
    const formulas=[String.raw`\frac{1}{2}+\sqrt{x}`,String.raw`\begin{pmatrix}a&b\\c&d\end{pmatrix}`,String.raw`\ce{H2O + CO2 -> H2CO3}`,String.raw`\cancel{x}+\boxed{y}`,String.raw`\newcommand{\RR}{\mathbb{R}}\RR^2`]
    const languages=['js','ts','python','rust','bash','sql','json','yaml']
    const raw=formulas.map(math=>`$$\n${math}\n$$`).join('\n\n')+'\n\n'+languages.map(lang=>`\`\`\`${lang}\nvalue = 42\n\`\`\``).join('\n\n')
    const result=await page.evaluate(raw=>window.editor.invoke('render',{raw,file:'posts/regression.md'}),raw)
    expect(result.html.match(/<mjx-container/g)).toHaveLength(formulas.length)
    expect(result.html.match(/<mjx-assistive-mml/g)).toHaveLength(formulas.length)
    expect(result.html).not.toMatch(/data-mjx-error|<merror/)
    expect(result.html).toContain('--shiki-dark')
    for(const language of languages)expect(result.html).toContain(`language-${language}`)
  }finally{
    const closed=app.waitForEvent('close')
    await app.evaluate(({app})=>app.exit())
    await closed
    await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200})
  }
})
