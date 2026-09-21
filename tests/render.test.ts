import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from '../electron/render'
test('renders configured extensions, removes duplicate title, maps source lines',async()=>{
 const result=await renderMarkdown('---\ntitle: Hello\ndraft: true\n---\n# Hello\n\n## Section\n\n::: tip Note\nText ==marked== H~2~O x^2^ :smile:\n:::\n\n- [x] Task\n\nFootnote[^1]\n\n[^1]: Footnote body\n\nTerm\n: Definition\n\n*[HTML]: Hyper Text\n\nHTML\n\n$$\nx^2\n$$\n\n```js {1}\nconst x = 1 // [!code ++]\n```\n\n```mermaid\ngraph LR\nA-->B\n```','posts/2026/09/20/test.md')
 assert.ok(!result.html.includes('<h1'));for(const snippet of ['custom-block','<mark>','<sub>','<sup>','task-list-item','footnote','<dl','<abbr','mjx-container','shiki','line-numbers','diff add','mermaid-source','data-source-line'])assert.ok(result.html.includes(snippet),snippet);assert.equal(result.title,'Hello');assert.ok(result.headers.some(h=>h.title==='Section'))
})
test('code groups, focus and invalid YAML',async()=>{const result=await renderMarkdown('::: code-group\n\n```js [one]\nconst a = 1 // [!code focus]\n```\n\n```ts [two]\nconst b: number = 2\n```\n\n:::','posts/2026/09/20/test.md');assert.match(result.html,/vp-code-group/);assert.match(result.html,/focused/);await assert.rejects(()=>renderMarkdown('---\ntitle: [bad\n---\ntext','posts/2026/09/20/test.md'))})
test('preview cannot execute alternate frontmatter engines or read snippet paths',async()=>{
 const result=await renderMarkdown('---js\n(() => { throw new Error("MUST NOT EXECUTE") })()\n---\n\n<<< /outside/project/secret.txt\n','posts/2026/09/20/test.md')
 assert.ok(result.html.includes('secret.txt'))
 const body=await renderMarkdown('---\ntitle: Heading\n---\n---\nThis remains article content\n---\n','posts/2026/09/20/test.md')
 assert.ok(body.html.includes('This remains article content'))
})
