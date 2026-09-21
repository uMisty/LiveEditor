import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { frontmatter } from '../shared/frontmatter'
import { blogDefaults, type BlogProfile } from '../shared/blog'
import type { DocumentFile, MovePlan, Post, Project } from '../shared/types'

export const hash = (raw: string) => createHash('sha256').update(raw).digest('hex')
export const slash = (value: string) => value.replaceAll('\\', '/')
export function inside(root: string, target: string) { const rel = path.relative(root, target); return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel)) }
export async function safePath(root: string, relative: string, allowMissing = false) {
  if (typeof relative !== 'string' || !relative || relative.includes('\0') || path.isAbsolute(relative)) throw new Error('路径无效')
  const target = path.resolve(root, relative)
  if (!inside(root, target)) throw new Error('路径必须位于项目内')
  let current = root
  for (const part of path.relative(root, target).split(path.sep)) {
    current = path.join(current, part)
    try { const stat = await fs.lstat(current); if (stat.isSymbolicLink()) throw new Error('不支持通过符号链接访问内容') }
    catch (e: any) { if (e.code === 'ENOENT' && allowMissing) break; throw e }
  }
  return target
}
export function postPath(date: string, slug: string, folder: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || +date.slice(0,4) < 1000 || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error('请输入有效日期')
  if (!/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(slug) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(slug)) throw new Error('文件名只能包含文字、数字、下划线和连字符，且不能是系统保留名称')
  return `posts/${date.replaceAll('-','/')}/${slug}${folder ? '/index' : ''}.md`
}
export const route = (file: string) => file.replace(/\.md$/i,'').replace(/\/index$/i,'').toLowerCase()
export async function walk(folder: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await fs.readdir(folder,{withFileTypes:true})) {
    if (entry.isSymbolicLink()) continue
    const absolute = path.join(folder,entry.name)
    if (entry.isDirectory()) files.push(...await walk(absolute))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(absolute)
  }
  return files
}
export class ProjectService {
  root = ''; content = ''; readOnly = false
  private cache = new Map<string,Post>()
  private queue: Promise<unknown> = Promise.resolve()
  private locked<T>(fn: () => Promise<T>): Promise<T> { const task = this.queue.then(fn); this.queue = task.catch(()=>{}); return task }
  writable() { if (!this.root) throw new Error('请先连接项目'); if (this.readOnly) throw new Error('当前项目以只读模式连接，请在项目副本中测试写入') }
  async connect(input: string, readOnly = false): Promise<Project> {
    if (!path.isAbsolute(input)) throw new Error('请输入项目绝对路径')
    const root = await fs.realpath(input)
    await safePath(root,'content/posts'); await safePath(root,'.vitepress/config.ts')
    const old = { root:this.root, content:this.content, cache:this.cache, readOnly:this.readOnly }
    this.root=root; this.content=path.join(root,'content'); this.cache=new Map(); this.readOnly=readOnly
    try { return await this.info() } catch(e) { Object.assign(this,old); throw e }
  }
  async info(): Promise<Project> {
    const warnings: string[]=[]; let styles=''
    for (const file of ['src/styles/theme.css','src/styles/markdown.css']) {
      try { styles += '\n' + await fs.readFile(await safePath(this.root,file),'utf8') } catch { warnings.push(`${file} 不可读，预览将使用可用样式`) }
    }
    const config=await fs.readFile(await safePath(this.root,'.vitepress/config.ts'),'utf8')
    const imports=[...config.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]).filter(s=>s.startsWith('markdown-it-'))
    const known=['footnote','task-lists','deflist','abbr','mark','sub','sup','mathjax3']
    for(const item of imports) if(!known.includes(item.replace('markdown-it-',''))) warnings.push(`未适配插件：${item}`)
    if(!config.includes("github-light") || !config.includes("github-dark")) warnings.push('代码主题与内置 Thus.Live 适配器不同，请核对预览')
    return {root:this.root,name:path.basename(this.root),posts:await this.index(),styles,warnings,configSignature:hash(config),readOnly:this.readOnly}
  }
  async index(): Promise<Post[]> {
    const files=await walk(await safePath(this.root,'content/posts')); const alive=new Set<string>()
    for(const file of files) {
      const rel=slash(path.relative(this.content,file)); alive.add(rel)
      const stat=await fs.stat(file); if(this.cache.get(rel)?.modified===stat.mtimeMs) continue
      const raw=await fs.readFile(file,'utf8'); let data: any={}, body=raw,error:string|undefined
      try { ({data,body}=frontmatter(raw)) } catch(e:any) {error=e.message}
      const date=rel.match(/^posts\/(\d{4})\/(\d{2})\/(\d{2})\//)?.slice(1).join('-') || ''
      this.cache.set(rel,{file:rel,title:data.title || body.match(/^#\s+(.+)$/m)?.[1] || path.basename(file),description:data.description || body.replace(/[#*`>\n]/g,' ').slice(0,120),tags:data.tags || [],draft:data.draft===true,date,updated:data.updated,modified:stat.mtimeMs,error})
    }
    for(const key of this.cache.keys()) if(!alive.has(key)) this.cache.delete(key)
    return [...this.cache.values()].sort((a,b)=>b.modified-a.modified || a.file.localeCompare(b.file))
  }
  async read(file: string): Promise<DocumentFile> {
    if(file!=='index.md'&&(!file.startsWith('posts/') || !file.endsWith('.md'))) throw new Error('只能打开首页或文章 Markdown 文件')
    const raw=await fs.readFile(await safePath(this.content,file),'utf8'); return {file,raw,hash:hash(raw)}
  }
  async blogProfile() {
    const raw=await fs.readFile(await safePath(this.root,'site.profile.json'),'utf8').catch((error:any)=>{if(error.code==='ENOENT')throw new Error('当前项目没有 site.profile.json，请先使用支持博客信息配置的项目。');throw error})
    const values=JSON.parse(raw)
    if(!values||typeof values!=='object'||Array.isArray(values))throw new Error('博客配置必须是 JSON 对象')
    return {values:{...blogDefaults,...values} as BlogProfile,hash:hash(raw)}
  }
  saveBlogProfile(values: BlogProfile, expected: string) { return this.locked(async()=>{
    this.writable()
    if(!values||typeof values!=='object')throw new Error('博客信息格式无效')
    for(const key of Object.keys(blogDefaults) as (keyof BlogProfile)[]){
      if(key==='pageSize'){if(!Number.isSafeInteger(values.pageSize)||values.pageSize<1)throw new Error('每页文章数必须是正整数')}
      else if(typeof values[key]!=='string')throw new Error('博客信息必须是文本')
    }
    for(const key of ['name','author','title','language'] as const)if(!values[key].trim())throw new Error('站点名称、作者、首页标题和语言不能为空')
    if(values.url){let url:URL;try{url=new URL(values.url)}catch{throw new Error('请输入有效的博客网址')};if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('博客网址须为 HTTP(S) 根域名，如 https://blog.example.com')}
    if(values.avatar&&!values.avatar.startsWith('/')){try{if(!['http:','https:'].includes(new URL(values.avatar).protocol))throw new Error()}catch{throw new Error('头像请填写 / 开头的站内路径或 HTTP(S) 地址')}}
    const target=await safePath(this.root,'site.profile.json');const raw=await fs.readFile(target,'utf8')
    if(hash(raw)!==expected)throw new Error('CONFLICT: 博客配置已被外部修改，请重新读取后保存')
    const current=JSON.parse(raw);if(!current||typeof current!=='object'||Array.isArray(current))throw new Error('博客配置必须是 JSON 对象')
    for(const key of Object.keys(blogDefaults))current[key]=values[key as keyof BlogProfile]
    const next=JSON.stringify(current,null,2)+'\n'
    const saved=await this.atomic('site.profile.json',next,expected,this.root)
    return {values:current as BlogProfile,hash:saved.hash}
  }) }
  async atomic(file: string, raw: string, expected: string, base = this.content) {
    const target=await safePath(base,file); const current=await fs.readFile(target,'utf8')
    if(hash(current)!==expected) throw new Error('CONFLICT: 文件已被其他程序修改，请比较后另存或重新加载')
    const temp=target+`.thus-${randomUUID()}.tmp`; let handle
    try {
      handle=await fs.open(temp,'wx',(await fs.stat(target)).mode); await handle.writeFile(raw,'utf8'); await handle.sync(); await handle.close(); handle=undefined
      if(hash(await fs.readFile(target,'utf8'))!==expected) throw new Error('CONFLICT: 保存期间文件被其他程序修改')
      await fs.rename(temp,target)
    } finally { await handle?.close(); await fs.rm(temp,{force:true}) }
    this.cache.delete(file); return {file,raw,hash:hash(raw)}
  }
  save(file: string, raw: string, expected: string) { return this.locked(async()=>{this.writable();await this.read(file); return this.atomic(file,raw,expected)}) }
  async checkDestination(file:string) {
    await safePath(this.content,file,true)
    const posts=await this.index(); if(posts.some(p=>route(p.file)===route(file))) throw new Error('文件名或文章地址已存在，请更换文件名')
  }
  create(date:string,slug:string,folder:boolean,raw:string) { return this.locked(async()=>{
    this.writable(); const file=postPath(date,slug,folder); await this.checkDestination(file)
    const target=await safePath(this.content,file,true); await fs.mkdir(path.dirname(target),{recursive:true}); await safePath(this.content,file,true)
    await fs.writeFile(target,raw,{encoding:'utf8',flag:'wx'}); return {file,raw,hash:hash(raw)}
  }) }
  async imagePlan(file:string,name:string) {
    await this.read(file)
    const ext=path.extname(name).toLowerCase()
    if(!['.png','.jpg','.jpeg','.webp','.gif','.avif','.svg'].includes(ext))throw new Error('请选择图片文件')
    const base=path.basename(name,ext).replace(/[^\p{L}\p{N}_-]/gu,'-').slice(0,80)||'image'
    const dir=slash(path.join(path.dirname(file),'assets'))
    let candidate=`${base}${ext}`,index=0,existing=false
    while(true){
      const target=await safePath(this.content,`${dir}/${candidate}`,true)
      try{await fs.access(target);existing=true;candidate=`${base}-${++index}${ext}`}
      catch(e:any){if(e.code!=='ENOENT')throw e;break}
    }
    return {existing,original:`./assets/${base}${ext}`,suggested:`./assets/${candidate}`}
  }
  async importImage(file:string,name:string,bytes:Uint8Array,useExisting=false) { return this.locked(async()=>{
    this.writable(); await this.read(file)
    const ext=path.extname(name).toLowerCase(); if(!['.png','.jpg','.jpeg','.webp','.gif','.avif','.svg'].includes(ext)) throw new Error('请选择图片文件')
    if(bytes.byteLength>25*1024*1024) throw new Error('图片不能超过 25 MB')
    const base=path.basename(name,ext).replace(/[^\p{L}\p{N}_-]/gu,'-').slice(0,80)||'image'
    const dir=slash(path.join(path.dirname(file),'assets')); let rel=`${dir}/${base}${ext}`, i=1
    await safePath(this.content,dir,true); await fs.mkdir(path.join(this.content,dir),{recursive:true})
    while(true) {
      const target=await safePath(this.content,rel,true)
      if(useExisting) {try{await fs.access(target); return {relative:`./assets/${path.basename(rel)}`,existing:true}}catch{}}
      try {await fs.writeFile(target,bytes,{flag:'wx'}); break} catch(e:any){if(e.code!=='EEXIST')throw e; rel=`${dir}/${base}-${i++}${ext}`}
    }
    return {relative:`./assets/${path.basename(rel)}`,existing:false}
  }) }
  async planMove(file:string,to:string): Promise<MovePlan> {
    if(file==='index.md')throw new Error('首页不能移动或重命名')
    const match=/^posts\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+?)(\/index)?\.md$/.exec(to)
    if(!match||postPath(`${match[1]}-${match[2]}-${match[3]}`,match[4],!!match[5])!==to)throw new Error('目标文章路径无效')
    const original=await this.read(file); await this.checkDestination(to)
    const refs:string[]=[]
    for(const post of await this.index()) { if(post.file===file)continue; const raw=(await this.read(post.file)).raw; if(rewriteLinks(raw,post.file,file,to)!==raw)refs.push(post.file) }
    return {from:file,to,hash:original.hash,references:refs,resources:[...original.raw.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m=>m[1]),warning:'保留原附件，更新可识别的 Markdown 相对链接；动态 Vue 引用与已上线地址需手动检查。'}
  }
  move(plan:MovePlan) { return this.locked(async()=>{
    this.writable(); const current=await this.read(plan.from); if(current.hash!==plan.hash)throw new Error('CONFLICT: 原文件已变化，请重新检查')
    const fresh=await this.planMove(plan.from,plan.to)
    if(fresh.references.join('\n')!==plan.references.join('\n')) throw new Error('引用已变化，请重新检查移动影响')
    const backups=await Promise.all(fresh.references.map(file=>this.read(file))); const written:DocumentFile[]=[]
    const target=await safePath(this.content,plan.to,true); let created=false
    try {
      await fs.mkdir(path.dirname(target),{recursive:true}); await safePath(this.content,plan.to,true)
      const movedRaw=rebaseLinks(current.raw,plan.from,plan.to)
      await fs.writeFile(target,movedRaw,{flag:'wx'}); created=true
      for(const backup of backups){ await this.atomic(backup.file,rewriteLinks(backup.raw,backup.file,plan.from,plan.to),backup.hash); written.push(backup) }
      if((await this.read(plan.from)).hash!==current.hash)throw new Error('CONFLICT: 移动期间原文件变化')
      await fs.unlink(await safePath(this.content,plan.from)); this.cache.delete(plan.from)
      return {file:plan.to,raw:movedRaw,hash:hash(movedRaw)}
    } catch(e) {
      for(const backup of written.reverse()) await this.atomic(backup.file,backup.raw,hash(rewriteLinks(backup.raw,backup.file,plan.from,plan.to)))
      if(created)await fs.rm(target,{force:true}); throw e
    }
  }) }
}
function linkTransform(raw:string,fn:(href:string)=>string) { return raw.replace(/(!?\[[^\]\n]*\]\()([^\s)]+)([^)]*\))/g,(_m,a,b,c)=>a+fn(b)+c) }
function local(href:string) {return !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)}
export function rebaseLinks(raw:string,from:string,to:string) {
  return linkTransform(raw,href=>{
    if(!local(href)||href.startsWith('/'))return href
    const [pathname,...suffix]=href.split(/(?=[?#])/); let decoded;try{decoded=decodeURIComponent(pathname)}catch{return href}
    const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(from),decoded))
    return './'+path.posix.relative(path.posix.dirname(to),resolved).split('/').map(encodeURIComponent).join('/')+suffix.join('')
  })
}
export function rewriteLinks(raw:string,source:string,from:string,to:string) {
  return linkTransform(raw,href=>{
    if(!local(href))return href
    const [pathname,...suffix]=href.split(/(?=[?#])/); let decoded;try{decoded=decodeURIComponent(pathname)}catch{return href}
    const resolved=decoded.startsWith('/')?decoded.slice(1):path.posix.normalize(path.posix.join(path.posix.dirname(source),decoded))
    if(route(resolved)!==route(from))return href
    const destination=pathname.endsWith('.md')?to:to.replace(/\.md$/,'').replace(/\/index$/,'/')
    return (decoded.startsWith('/')?'/'+destination:'./'+path.posix.relative(path.posix.dirname(source),destination)).split('/').map(encodeURIComponent).join('/')+suffix.join('')
  })
}
