export const blogDefaults = {
  name: 'Thus.Live', author: 'Thus.Live', title: 'Thus.Live · 记录与分享',
  description: '记录当下，持续思考。', language: 'zh-CN', url: '', avatar: '',
  avatarText: '', footer: '记录与分享', pageSize: 10
}
export type BlogProfile = typeof blogDefaults
export interface BlogDocument { values: BlogProfile; hash: string }
