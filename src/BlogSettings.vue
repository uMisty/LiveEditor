<script setup lang="ts">
import {computed,onMounted,onBeforeUnmount,ref} from 'vue'
import Modal from './Modal.vue'
import {blogDefaults,type BlogDocument,type BlogProfile} from '../shared/blog'
const props=defineProps<{visible:boolean;readOnly:boolean}>()
const fields:{key:Exclude<keyof BlogProfile,'pageSize'>;label:string;placeholder?:string}[]=[{key:'name',label:'站点名称'},{key:'author',label:'作者'},{key:'title',label:'首页标题'},{key:'description',label:'博客简介'},{key:'language',label:'语言',placeholder:'zh-CN'},{key:'url',label:'博客网址',placeholder:'https://blog.example.com'},{key:'avatar',label:'头像地址',placeholder:'/avatar.png 或 https://…'},{key:'avatarText',label:'头像替代文字'},{key:'footer',label:'页脚文字'}]
const form=ref({...blogDefaults}),snapshot=ref(''),revision=ref(''),loading=ref(false),saving=ref(false),error=ref(''),message=ref(''),confirming=ref(false)
let resolveLeave:((result:boolean)=>void)|undefined
const dirty=computed(()=>!!snapshot.value&&JSON.stringify(form.value)!==snapshot.value)
async function load(){loading.value=true;error.value='';message.value='';try{const doc=await window.editor.invoke<BlogDocument>('blogProfile');form.value=doc.values;snapshot.value=JSON.stringify(doc.values);revision.value=doc.hash}catch(e:any){error.value=e.message}finally{loading.value=false}}
async function save(){saving.value=true;error.value='';message.value='';try{const doc=await window.editor.invoke<BlogDocument>('saveBlogProfile',{values:JSON.parse(JSON.stringify(form.value)),hash:revision.value});form.value=doc.values;snapshot.value=JSON.stringify(doc.values);revision.value=doc.hash;message.value='博客信息已保存到项目。';return true}catch(e:any){error.value=e.message;return false}finally{saving.value=false}}
function finish(value:boolean){confirming.value=false;resolveLeave?.(value);resolveLeave=undefined}
async function saveAndLeave(){if(await save())finish(true)}
function discard(){form.value=JSON.parse(snapshot.value);finish(true)}
defineExpose({save(){if(!props.readOnly&&!loading.value&&!saving.value&&dirty.value)return save()},confirmLeave(){if(!dirty.value)return Promise.resolve(true);confirming.value=true;return new Promise<boolean>(resolve=>resolveLeave=resolve)}})
onMounted(load);onBeforeUnmount(()=>resolveLeave?.(false))
</script>
<template>
  <section v-show="visible" class="blog-settings" aria-label="博客信息配置">
    <div class="blog-heading"><div><p class="eyebrow">BLOG PROFILE</p><h1>博客信息</h1><p class="intro">管理站点介绍与展示信息。</p></div><span v-if="dirty" class="badge">有未保存修改</span></div>
    <p v-if="loading" role="status">正在读取博客信息…</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <form v-if="snapshot" @submit.prevent="save">
      <fieldset :disabled="readOnly||loading||saving" class="blog-fields">
        <label v-for="field in fields" :key="field.key" :class="{'blog-wide':field.key==='description'||field.key==='footer'}">{{ field.label }}<textarea v-if="field.key==='description'" v-model="form[field.key]" rows="3"/><input v-else v-model="form[field.key]" :placeholder="field.placeholder" :required="['name','author','title','language'].includes(field.key)"></label>
        <label>每页文章数<input v-model.number="form.pageSize" type="number" min="1" step="1" required></label>
      </fieldset>
      <p class="help">保存至当前项目的 site.profile.json，重新构建并发布博客后，线上站点才会更新。</p>
      <p v-if="readOnly" class="help">当前项目以只读模式连接。</p>
      <p v-if="message" class="success" role="status">{{ message }}</p>
      <div class="actions"><button type="submit" class="primary" :disabled="!dirty||saving||loading||readOnly">{{ saving?'保存中…':'保存博客信息' }}</button><button type="button" :disabled="saving||loading" @click="load">{{ dirty?'放弃修改并重新读取':'重新读取' }}</button></div>
    </form>
    <button v-else-if="!loading" @click="load">重新读取</button>
  </section>
  <Modal v-if="confirming" title="保存博客信息后再离开？" @close="finish(false)"><p>博客信息有未保存的修改。</p><p v-if="error" class="error" role="alert">{{ error }}</p><div class="actions"><button class="primary" :disabled="saving" @click="saveAndLeave">保存并继续</button><button :disabled="saving" @click="discard">放弃修改</button><button :disabled="saving" @click="finish(false)">取消</button></div></Modal>
</template>
