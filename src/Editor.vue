<script setup lang="ts">
import { ref,onMounted,onBeforeUnmount,watch } from 'vue'
import { EditorView,keymap } from '@codemirror/view'
import { EditorState,Compartment } from '@codemirror/state'
import { basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle,syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
const props=defineProps<{modelValue:string;dark:boolean;fontSize:number;docKey:string}>()
const emit=defineEmits<{ 'update:modelValue':[string];scroll:[number];image:[File] }>()
const host=ref<HTMLElement>();let view:EditorView;const theme=new Compartment();let external=false,muted=false
const syntax=syntaxHighlighting(HighlightStyle.define([{tag:tags.heading,color:'var(--text)',fontWeight:'400'},{tag:[tags.link,tags.url],color:'var(--accent)',textDecoration:'underline'},{tag:[tags.keyword,tags.string,tags.number,tags.bool],color:'var(--accent)'},{tag:[tags.comment,tags.meta],color:'var(--muted)'},{tag:tags.strong,fontWeight:'600'},{tag:tags.emphasis,fontStyle:'italic'},{tag:tags.monospace,fontFamily:'var(--font-mono)'}]))
function appearance(){return EditorView.theme({'&':{height:'100%',backgroundColor:'transparent',color:'var(--text)'},'.cm-scroller':{fontFamily:'var(--font-mono)',fontSize:props.fontSize+'px',lineHeight:'26px',overflow:'auto'},'.cm-content':{padding:'16px 8px 100px',caretColor:'var(--accent)'},'.cm-gutters':{backgroundColor:'transparent',border:'none',color:'var(--muted)'},'.cm-activeLine,.cm-activeLineGutter':{backgroundColor:'var(--hover)'},'&.cm-focused':{outline:'none'},'.cm-selectionBackground':{background:'var(--selection) !important'}},{dark:props.dark})}
function extensions(){return [basicSetup,markdown(),syntax,EditorView.lineWrapping,theme.of(appearance()),keymap.of([{key:'Mod-s',run:()=>true},{key:'Mod-p',run:()=>true}]),EditorView.updateListener.of(update=>{if(update.docChanged&&!external)emit('update:modelValue',update.state.doc.toString())}),EditorView.domEventHandlers({scroll:()=>{if(muted)return;const block=view.lineBlockAtHeight(view.scrollDOM.scrollTop);emit('scroll',view.state.doc.lineAt(Math.min(block.from,view.state.doc.length)).number)},paste:e=>{const file=[...(e.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));if(file){e.preventDefault();emit('image',file);return true}return false},drop:e=>{const file=[...(e.dataTransfer?.files||[])].find(f=>f.type.startsWith('image/'));if(file){e.preventDefault();emit('image',file);return true}return false}})]}
onMounted(()=>{view=new EditorView({parent:host.value,state:EditorState.create({doc:props.modelValue,extensions:extensions()})})})
watch(()=>props.docKey,()=>{if(view)view.setState(EditorState.create({doc:props.modelValue,extensions:extensions()}))})
watch(()=>props.modelValue,value=>{if(view&&value!==view.state.doc.toString()){external=true;view.dispatch({changes:{from:0,to:view.state.doc.length,insert:value}});external=false}})
watch(()=>[props.dark,props.fontSize],()=>view?.dispatch({effects:theme.reconfigure(appearance())}))
onBeforeUnmount(()=>view?.destroy())
defineExpose({insert(text:string){view.dispatch(view.state.replaceSelection(text));view.focus()},scrollTo(line:number){muted=true;const pos=view.state.doc.line(Math.max(1,Math.min(line,view.state.doc.lines))).from;view.dispatch({effects:EditorView.scrollIntoView(pos,{y:'start'})});setTimeout(()=>muted=false,100)},focus(){view.focus()}})
</script>
<template><div ref="host" class="codemirror" aria-label="Markdown 编辑器"></div></template>
