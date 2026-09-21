<script setup lang="ts">
import { ref,onMounted,onBeforeUnmount } from 'vue'
defineProps<{path:string;readOnly?:boolean}>()
const maximized=ref(false)
const mac=window.editor?.platform==='darwin'
const controls=window.editor
let unsubscribe:(()=>void)|undefined
async function toggleMaximize(){const state=await window.editor.invoke('maximize');maximized.value=state.maximized}
onMounted(async()=>{
  if(!window.editor)return
  unsubscribe=window.editor.onWindowState(state=>maximized.value=state.maximized)
  maximized.value=(await window.editor.invoke('windowState')).maximized
})
onBeforeUnmount(()=>unsubscribe?.())
</script>
<template>
  <header class="topbar" :class="{'mac-titlebar':mac}">
    <span class="window-brand">Thus.Live&nbsp; / &nbsp;写作空间</span>
    <span class="breadcrumb">{{ path }}</span>
    <span v-if="readOnly" class="badge">只读连接</span>
    <div class="window-controls" :class="{'mac-controls':mac}">
      <button class="window-minimize" aria-label="最小化窗口" title="最小化" @click="controls.invoke('minimize')">—</button>
      <button class="window-maximize" :aria-label="maximized?'还原窗口':'最大化窗口'" :title="maximized?'还原':'最大化'" @click="toggleMaximize">{{ maximized?'❐':'□' }}</button>
      <button class="window-close" aria-label="关闭窗口" title="关闭" @click="controls.invoke('requestClose')">×</button>
    </div>
  </header>
</template>
