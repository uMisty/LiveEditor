<script setup lang="ts">
import { ref,onMounted,onBeforeUnmount,nextTick,useId } from 'vue'
defineProps<{title:string;kind?:string}>();const emit=defineEmits<{close:[]}>();const dialog=ref<HTMLDialogElement>();const titleId=useId();let previous:HTMLElement|null
onMounted(()=>{previous=document.activeElement as HTMLElement;dialog.value?.showModal()})
onBeforeUnmount(()=>{dialog.value?.close();void nextTick(()=>{if(previous?.isConnected&&!document.querySelector('dialog[open]'))previous.focus({preventScroll:true})})})
</script>
<template><dialog ref="dialog" :data-kind="kind" @cancel.prevent="emit('close')" :aria-labelledby="titleId"><div class="modal-heading"><h2 :id="titleId">{{ title }}</h2><button type="button" class="icon-button" aria-label="关闭弹窗" @click="emit('close')">×</button></div><slot /></dialog></template>
