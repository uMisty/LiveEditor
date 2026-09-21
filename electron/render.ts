import { createMarkdownRenderer } from 'vitepress'
import footnote from 'markdown-it-footnote'
import taskLists from 'markdown-it-task-lists'
import deflist from 'markdown-it-deflist'
import abbr from 'markdown-it-abbr'
import mark from 'markdown-it-mark'
import sub from 'markdown-it-sub'
import sup from 'markdown-it-sup'
import { frontmatter } from '../shared/frontmatter'
import type { RenderResult } from '../shared/types'

let renderer: ReturnType<typeof createMarkdownRenderer> | undefined
function getRenderer() {
  renderer ??= createMarkdownRenderer(process.cwd(), {
    theme:{light:'github-light',dark:'github-dark'},lineNumbers:true,headers:{level:[2,3]},math:true,image:{lazyLoading:true},
    config(md:any) {
      // A preview must never read arbitrary files through VitePress's <<< rule.
      md.block.ruler.disable('snippet')
      md.use(footnote).use(taskLists).use(deflist).use(abbr).use(mark).use(sub).use(sup)
      md.core.ruler.after('inline','article-title',(state:any)=>{
        const [open,title]=state.tokens
        if(state.env.relativePath!=='index.md' && open?.type==='heading_open' && open.tag==='h1' && (!state.env.frontmatter?.title || state.env.frontmatter.title===title?.content))state.tokens.splice(0,3)
        for(const token of state.tokens) if(token.map && token.nesting>=0)token.attrSet('data-source-line',String(token.map[0]+(state.env.lineOffset||0)+1))
      })
      const fence=md.renderer.rules.fence
      md.renderer.rules.fence=(tokens:any[],index:number,options:any,env:any,self:any)=>{
        const token=tokens[index];const line=(token.map?.[0]||0)+(env.lineOffset||0)+1
        if(token.info.trim()==='mermaid')return `<figure class="mermaid-block" data-source-line="${line}"><pre class="mermaid-source">${md.utils.escapeHtml(token.content)}</pre></figure>`
        return fence(tokens,index,options,env,self).replace('<div ',`<div data-source-line="${line}" `)
      }
    }
  },undefined,undefined)
  return renderer
}
export async function renderMarkdown(raw:string,file:string):Promise<RenderResult> {
  const {data,body,offset}=frontmatter(raw)
  const md=await getRenderer(); const env:any={relativePath:file,frontmatter:data,lineOffset:offset}
  // YAML is already parsed above. Bypass VitePress's gray-matter wrapper so
  // alternate frontmatter engines cannot execute source text or parse it twice.
  const html=md.renderer.render(md.parse(body,env),md.options,env)
  return {html,title:data.title || body.match(/^#\s+(.+)$/m)?.[1] || '未命名文章',description:data.description || '',tags:data.tags || [],headers:env.headers || []}
}
