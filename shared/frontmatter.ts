import { parseDocument, isMap } from 'yaml'
export function frontmatter(raw: string) {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw)
  if (/^(?:\uFEFF)?---\r?\n/.test(raw) && !match) throw new Error('YAML 缺少结束分隔符 ---')
  const doc = parseDocument(match?.[1] || '{}', { keepSourceTokens: true })
  if (doc.errors.length) throw new Error(doc.errors[0].message)
  if (!isMap(doc.contents)) throw new Error('文章信息必须是 YAML 对象')
  const data = doc.toJS() as Record<string, any>
  if (data.tags !== undefined && (!Array.isArray(data.tags) || data.tags.some((t: unknown) => typeof t !== 'string' || !t.trim()))) throw new Error('tags 必须是非空字符串数组')
  if (data.draft !== undefined && typeof data.draft !== 'boolean') throw new Error('draft 必须是 true 或 false')
  if (data.title !== undefined && typeof data.title !== 'string') throw new Error('title 必须是文字')
  return { data, doc, body: match ? raw.slice(match[0].length) : raw, prefix: match?.[0] || '', offset: match ? match[0].split('\n').length - 1 : 0 }
}
export function updateMetadata(raw: string, values: Record<string, unknown>) {
  const { doc, body } = frontmatter(raw)
  for (const [key, value] of Object.entries(values)) {
    if (!['title','description','tags','draft','updated'].includes(key)) continue
    if (value === '' || value === undefined) doc.delete(key); else doc.set(key, value)
  }
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  return `---${eol}${doc.toString().trimEnd().replace(/\r?\n/g,eol)}${eol}---${eol}${body}`
}
