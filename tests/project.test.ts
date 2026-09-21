import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { ProjectService,postPath,safePath,hash,rebaseLinks } from '../electron/project'
import { frontmatter,updateMetadata } from '../shared/frontmatter'
import { blogDefaults } from '../shared/blog'
import { renderMarkdown } from '../electron/render'
async function fixture(){const root=await fs.mkdtemp(path.join(os.tmpdir(),'thus-editor-'));await fs.mkdir(path.join(root,'content/posts'),{recursive:true});await fs.mkdir(path.join(root,'.vitepress'));await fs.mkdir(path.join(root,'src/styles'),{recursive:true});await fs.writeFile(path.join(root,'.vitepress/config.ts'),"// github-light github-dark\nthrow new Error('MUST NOT EXECUTE')");await fs.writeFile(path.join(root,'src/styles/theme.css'),':root{--accent:green}');await fs.writeFile(path.join(root,'src/styles/markdown.css'),'.markdown-body{line-height:1.8}');const service=new ProjectService();await service.connect(root);return {root,service,async clean(){await fs.rm(root,{recursive:true,force:true})}}}
test('directory detection never executes project config; indexes draft and saves with conflict checks',async()=>{const f=await fixture();try{const doc=await f.service.create('2026-09-20','中文文章',false,'---\ntitle: 中文标题\ndraft: true\n---\n正文');assert.equal((await f.service.index())[0].draft,true);await f.service.save(doc.file,doc.raw+' changed',doc.hash);await assert.rejects(()=>f.service.save(doc.file,'overwritten',doc.hash),/CONFLICT/);assert.match((await f.service.read(doc.file)).raw,/changed/);assert.equal(await fs.readFile(path.join(f.root,'.vitepress/config.ts'),'utf8'),"// github-light github-dark\nthrow new Error('MUST NOT EXECUTE')")}finally{await f.clean()}})

test('blog profile validates values, preserves unknown keys and rejects conflicts and readonly writes',async()=>{const f=await fixture();try{
  await assert.rejects(()=>f.service.blogProfile(),/site.profile.json/)
  const file=path.join(f.root,'site.profile.json');await fs.writeFile(file,JSON.stringify({name:'Before',custom:{keep:true}}))
  const original=await f.service.blogProfile();assert.equal(original.values.author,blogDefaults.author)
  await assert.rejects(()=>f.service.saveBlogProfile({...original.values,url:'javascript:alert(1)'},original.hash),/根域名/)
  await assert.rejects(()=>f.service.saveBlogProfile({...original.values,pageSize:0},original.hash),/正整数/)
  await assert.rejects(()=>f.service.saveBlogProfile({...original.values,name:''},original.hash),/不能为空/)
  const saved=await f.service.saveBlogProfile({...original.values,name:'After',url:'https://blog.example.com'},original.hash)
  assert.equal(JSON.parse(await fs.readFile(file,'utf8')).name,'After');assert.deepEqual(JSON.parse(await fs.readFile(file,'utf8')).custom,{keep:true})
  await assert.rejects(()=>f.service.saveBlogProfile(original.values,original.hash),/CONFLICT/)
  f.service.readOnly=true;await assert.rejects(()=>f.service.saveBlogProfile(original.values,saved.hash),/只读/)
  assert.equal(JSON.parse(await fs.readFile(file,'utf8')).name,'After')
}finally{await f.clean()}})
test('reject traversal, impossible dates, reserved names and both route collision forms',async()=>{const f=await fixture();try{await assert.rejects(()=>safePath(f.service.content,'../secret'),/项目内/);assert.throws(()=>postPath('2026-02-30','post',false));assert.throws(()=>postPath('2026-09-20','CON',false));assert.throws(()=>postPath('2026-09-20','../escape',false));await f.service.create('2026-09-20','hello',false,'# hello');await assert.rejects(()=>f.service.create('2026-09-20','Hello',true,'# another'),/已存在/)}finally{await f.clean()}})

test('homepage preserves metadata and heading, supports conflict checks, and cannot be moved',async()=>{const f=await fixture();try{
  const raw='---\nlayout: home\n# keep\ncustom: retained\n---\n# Welcome\n\nHome body'
  await fs.writeFile(path.join(f.service.content,'index.md'),raw)
  const doc=await f.service.read('index.md');assert.equal((await f.service.index()).length,0)
  assert.match((await renderMarkdown(raw,'index.md')).html,/<h1[^>]*>/)
  const saved=await f.service.save('index.md',raw+'\nEdited',doc.hash);assert.match(saved.raw,/layout: home\n# keep\ncustom: retained/)
  await assert.rejects(()=>f.service.save('index.md',raw,doc.hash),/CONFLICT/)
  await assert.rejects(()=>f.service.planMove('index.md','posts/2026/09/20/home.md'),/首页不能/)
  await assert.rejects(()=>f.service.read('about.md'),/首页或文章/)
  f.service.readOnly=true;await assert.rejects(()=>f.service.save('index.md',raw,saved.hash),/只读/)
}finally{await f.clean()}})
test('metadata edits preserve comments, unknown fields, CRLF and malformed source',()=>{const raw='---\r\n# editorial note\r\ntitle: Before\r\ncustom: keep\r\ndraft: true\r\n---\r\n正文';const next=updateMetadata(raw,{title:'After',draft:true,tags:['写作']});assert.match(next,/# editorial note/);assert.match(next,/custom: keep/);assert.match(next,/title: After/);assert.equal(frontmatter(next).body,'正文');assert.ok(next.includes('\r\n'));assert.throws(()=>updateMetadata('---\ntitle: [bad\n---\nbody',{title:'no'}));assert.throws(()=>frontmatter('---\ntitle: x'))})
test('image import preserves source and allocates unique names; readonly blocks writes',async()=>{const f=await fixture();try{const doc=await f.service.create('2026-09-20','hello',true,'# hello');const bytes=new Uint8Array([1,2,3]);assert.equal((await f.service.importImage(doc.file,'图.png',bytes)).relative,'./assets/图.png');assert.equal((await f.service.importImage(doc.file,'图.png',bytes)).relative,'./assets/图-1.png');f.service.readOnly=true;await assert.rejects(()=>f.service.save(doc.file,'new',doc.hash),/只读/);await assert.rejects(()=>f.service.importImage(doc.file,'x.png',bytes),/只读/)}finally{await f.clean()}})

test('image collision check never writes and import rechecks a raced filename',async()=>{const f=await fixture();try{
  const doc=await f.service.create('2026-09-20','images',false,'# images')
  const directory=path.join(f.service.content,path.dirname(doc.file),'assets')
  assert.deepEqual(await f.service.imagePlan(doc.file,'图.png'),{existing:false,original:'./assets/图.png',suggested:'./assets/图.png'})
  await assert.rejects(()=>fs.access(directory))
  await f.service.importImage(doc.file,'图.png',new Uint8Array([1]))
  assert.equal((await f.service.imagePlan(doc.file,'图.png')).suggested,'./assets/图-1.png')
  assert.deepEqual(await fs.readdir(directory),['图.png'])
  await fs.writeFile(path.join(directory,'图-1.png'),new Uint8Array([2]))
  assert.equal((await f.service.importImage(doc.file,'图.png',new Uint8Array([3]))).relative,'./assets/图-2.png')
  assert.deepEqual([...await fs.readFile(path.join(directory,'图.png'))],[1])
  assert.deepEqual([...await fs.readFile(path.join(directory,'图-1.png'))],[2])
}finally{await f.clean()}})
test('move rebases images and updates incoming Markdown links without deleting shared assets',async()=>{const f=await fixture();try{const a=await f.service.create('2026-09-20','one',false,'# One\n![image](./assets/test.png)');const b=await f.service.create('2026-09-20','two',false,'# Two\n[one](./one.md)');const plan=await f.service.planMove(a.file,'posts/2026/09/21/renamed/index.md');assert.deepEqual(plan.references,[b.file]);const moved=await f.service.move(plan);assert.match(moved.raw,/\.\.\/\.\.\/20\/assets\/test.png/);assert.match((await f.service.read(b.file)).raw,/21\/renamed\/index.md/);await assert.rejects(()=>f.service.read(a.file));assert.equal(moved.hash,hash(moved.raw));assert.equal(rebaseLinks('[external](https://example.com)','posts/a.md','posts/b.md'),'[external](https://example.com)')}finally{await f.clean()}})
test('thousand-article index returns deterministic results and refreshes changed files',async()=>{const f=await fixture();try{const dir=path.join(f.root,'content/posts/2026/09/20');await fs.mkdir(dir,{recursive:true});await Promise.all(Array.from({length:1000},(_,i)=>fs.writeFile(path.join(dir,`post-${i}.md`),`---\ntitle: Article ${i}\ntags: [test]\n---\ncontent`)));assert.equal((await f.service.index()).length,1000);await fs.writeFile(path.join(dir,'post-5.md'),'---\ntitle: Updated\n---\nnew');assert.equal((await f.service.index()).find(p=>p.file.endsWith('/post-5.md'))?.title,'Updated')}finally{await f.clean()}})
