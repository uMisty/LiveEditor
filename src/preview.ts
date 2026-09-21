import previewBase from './preview-base.css?inline'
import DOMPurify from 'dompurify'
import mermaid from 'mermaid'
let version=0,scrollMute=false,lastFile=''
const root=document.getElementById('preview')!
const style=document.createElement('style');document.head.append(style)
const fallback=`:root{--bg:#fff;--text:#242628;--muted:#686d70;--accent:#2f6f61;--line:#e7e8e8;--code-bg:#f6f7f6;--font-mono:'JetBrains Mono',monospace}html.dark{--bg:#17191a;--text:#e6e8e7;--muted:#a1a7a4;--accent:#8fc3af;--line:#343837;--code-bg:#222525}body{margin:0;background:var(--bg);color:var(--text);font:16px/28px "Noto Sans SC","Microsoft YaHei",sans-serif}main{box-sizing:border-box;padding:32px 32px 80px;max-width:860px;margin:auto;overflow-wrap:anywhere;position:relative}html.single-preview main{max-width:none;width:100%}html.single-preview main>article{max-width:none}main>article{max-width:520px}main>h1{font-size:32px;line-height:46px;font-weight:500;margin:16px 0}main>.eyebrow,main>.meta{font-size:12px;line-height:20px;color:var(--muted)}main>.eyebrow{color:var(--accent);margin-bottom:16px}main>.description{color:var(--muted);font-size:16px;line-height:28px;margin:16px 0}main>.tags{color:var(--accent);font-size:14px;line-height:22px;margin:16px 0}.markdown-body>h2{font-size:24px;line-height:36px;font-weight:500;margin:16px 0}.markdown-body>p{margin:16px 0}.markdown-body pre{overflow:auto;font-family:var(--font-mono);font-size:14px;line-height:26px}.markdown-body img{max-width:100%}.preview-toc{position:absolute;right:32px;top:32px;font-size:12px;line-height:20px;color:var(--muted);background:var(--bg);z-index:1}.preview-toc summary{cursor:pointer}.preview-toc[open]{padding:12px;border:1px solid var(--line);border-radius:6px;max-width:240px}.preview-toc a{display:block;color:var(--muted);padding:4px}.missing-image{display:block;width:100%;border:1px dashed var(--line);border-radius:6px;padding:24px;background:var(--code-bg);color:var(--muted);text-align:left;font:14px/24px "Noto Sans SC",sans-serif}.mermaid-error{color:var(--danger,#a43b35)}`

function asset(href:string,file:string){
  if(/^(data:image\/|appasset:)/i.test(href))return href
  if(/^[a-z][a-z\d+.-]*:|^\/\//i.test(href))return ''
  const parts=(href.startsWith('/')?'public/'+href.slice(1):file.slice(0,file.lastIndexOf('/')+1)+href).split('/');const stack:string[]=[]
  for(const part of parts){if(part==='..')stack.pop();else if(part!=='.'&&part)stack.push(part)}
  try{return 'appasset://project/'+stack.map(p=>encodeURIComponent(decodeURIComponent(p))).join('/')}catch{return ''}
}
function appendText(tag:string,text:string,className=''){const el=document.createElement(tag);el.textContent=text;el.className=className;root.append(el);return el}
window.addEventListener('message',async event=>{
  if(event.source!==parent)return
  const data=event.data
  if(data.type==='scroll'){
    const nodes=[...document.querySelectorAll<HTMLElement>('[data-source-line]')];const node=nodes.filter(n=>Number(n.dataset.sourceLine)<=data.line).at(-1)||nodes[0]
    if(node){scrollMute=true;window.scrollTo({top:node.getBoundingClientRect().top+scrollY-20,behavior:'instant'});setTimeout(()=>scrollMute=false,80)}return
  }
  if(data.type!=='render')return
  const id=++version;document.documentElement.classList.toggle('dark',data.dark);document.documentElement.classList.toggle('single-preview',!!data.single)
  style.textContent=fallback+'\n'+previewBase+'\n'+String(data.styles||'').replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/g,(_m,_q,url)=>`url("${asset(url,data.file)}")`)+ '\n'+fallback.slice(fallback.indexOf('main{'))
  const previousY=lastFile===data.file?scrollY:0;lastFile=data.file;root.replaceChildren();appendText('div','实时预览　　　　　　　 ● '+(data.degraded?'基础样式':'项目样式'),'eyebrow');if(data.file!=='index.md'){appendText('div',data.date+'  ·  '+(data.draft?'草稿':'非草稿'),'meta');appendText('h1',data.result.title);appendText('div',data.result.tags.join(' / '),'tags');if(data.result.description)appendText('p',data.result.description,'description')}else appendText('div','首页正文预览 · Vue 组件请在博客中查看','meta')
  const body=document.createElement('article');body.className='markdown-body'
  body.innerHTML=DOMPurify.sanitize(data.result.html,{ADD_TAGS:['mjx-container','mjx-assistive-mml'],ADD_ATTR:['data-source-line','data-mml-node','xmlns:xlink'],FORBID_TAGS:['script','iframe','object','embed','form','style','link','base'],FORBID_ATTR:['srcdoc']}) as string
  style.textContent+='\nmjx-assistive-mml{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(1px,1px,1px,1px)}'
  root.append(body)
  body.querySelectorAll<HTMLImageElement>('img').forEach(img=>{
    const original=img.getAttribute('src')||'';img.removeAttribute('srcset');img.src=asset(original,data.file)
    img.onerror=()=>{const missing=document.createElement('button');missing.className='missing-image';missing.textContent=`图片不可用：${img.alt||original} · 点击重新选择`;if(data.readOnly){missing.textContent=`图片不可用：${img.alt||original} · 进入写作后可重新选择`;missing.disabled=true}else missing.onclick=()=>parent.postMessage({type:'replaceImage',src:original},'*');img.replaceWith(missing)}
  })
  body.querySelectorAll('input').forEach(input=>{if(input.type==='checkbox')input.disabled=true})
  if(data.result.headers.length){const nav=document.createElement('details');nav.className='preview-toc';nav.setAttribute('aria-label','文章目录');const summary=document.createElement('summary');summary.textContent='目录';nav.append(summary);for(const h of data.result.headers){const a=document.createElement('a');a.href='#'+h.slug;a.textContent=h.title;nav.append(a)}root.insertBefore(nav,body)}
  window.scrollTo(0,previousY)
  mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:data.dark?'dark':'default',htmlLabels:false,flowchart:{htmlLabels:false}})
  for(const source of body.querySelectorAll<HTMLElement>('.mermaid-source')){
    try{const {svg}=await mermaid.render('diagram-'+id+'-'+Math.random().toString(36).slice(2),source.textContent||'');if(version!==id)return;const div=document.createElement('div');div.className='mermaid-output';div.innerHTML=DOMPurify.sanitize(svg);source.replaceWith(div)}catch(e:any){if(version!==id)return;const err=document.createElement('div');err.className='mermaid-error';err.textContent='图表语法有误，请检查源代码';source.before(err)}
  }
  parent.postMessage({type:'rendered',id:data.id},'*')
})
document.addEventListener('click',event=>{
  const target=event.target as HTMLElement;const copy=target.closest<HTMLButtonElement>('button.copy')
  if(copy){const text=copy.parentElement?.querySelector('code')?.textContent||'';parent.postMessage({type:'copy',text},'*');copy.classList.add('copied');setTimeout(()=>copy.classList.remove('copied'),1500)}
  const a=target.closest<HTMLAnchorElement>('a');if(a){event.preventDefault();const href=a.getAttribute('href')||'';if(href.startsWith('#'))document.getElementById(decodeURIComponent(href.slice(1)))?.scrollIntoView();else parent.postMessage({type:'link',href},'*')}
})
document.addEventListener('change',event=>{const input=event.target as HTMLInputElement;const group=input.closest('.vp-code-group');if(group){const index=[...group.querySelectorAll('.tabs input')].indexOf(input);group.querySelectorAll('.blocks > div').forEach((el,i)=>el.classList.toggle('active',i===index))}})
let scrollTimer:ReturnType<typeof setTimeout>
window.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{if(scrollMute)return;const nodes=[...document.querySelectorAll<HTMLElement>('[data-source-line]')];const node=nodes.find(n=>n.getBoundingClientRect().bottom>10);if(node)parent.postMessage({type:'scroll',line:Number(node.dataset.sourceLine)},'*')},40)})
parent.postMessage({type:'ready'},'*')
