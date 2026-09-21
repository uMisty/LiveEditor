export interface Post { file: string; title: string; description: string; tags: string[]; draft: boolean; date: string; updated?: string; modified: number; error?: string }
export interface DocumentFile { file: string; raw: string; hash: string }
export interface Project { root: string; name: string; posts: Post[]; styles: string; warnings: string[]; configSignature: string; readOnly: boolean }
export interface Recovery { project: string; file: string; raw: string; hash: string; time: number }
export interface Preferences { project?: string; theme?: 'system' | 'light' | 'dark'; split?: number; syncScroll?: boolean; fontSize?: number; ignoredUpdateVersion?: string; library?: { category:string; query:string; year:string; month:string; tags:string[]; sort:string; selected?:string; scroll:number } }
export interface RenderResult { html: string; title: string; description: string; tags: string[]; headers: { title: string; slug: string; level: number }[]; error?: string }
export interface MovePlan { from: string; to: string; hash: string; references: string[]; resources: string[]; warning: string }
export interface AppInfo { name: string; version: string; releaseTag: string; releaseUrl: string }
export interface UpdateInfo { version: string; tag: string; url: string; name: string }
export interface EditorAPI {
  platform: string;
  onWindowState(callback: (state: { maximized: boolean }) => void): () => void;
  invoke<T = any>(action: string, payload?: any): Promise<T>;
  onChange(callback: (event: { kind: string; file?: string }) => void): () => void;
  onClose(callback: () => void): () => void;
}
declare global { interface Window { editor: EditorAPI } }
