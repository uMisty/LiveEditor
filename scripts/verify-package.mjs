import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

// Verify the actual ASAR, not just configuration: dependency collection and
// glob behavior can change between packager versions and operating systems.
async function findArchives(directory,depth=0) {
  const result=[]
  for(const entry of await fs.readdir(directory,{withFileTypes:true})) {
    const file=path.join(directory,entry.name)
    if(entry.isFile()&&entry.name==='app.asar')result.push(file)
    else if(entry.isDirectory()&&depth<5&&!entry.name.endsWith('.unpacked'))result.push(...await findArchives(file,depth+1))
  }
  return result
}

async function listArchive(file) {
  const handle=await fs.open(file,'r')
  try {
    const prefix=Buffer.alloc(16)
    await handle.read(prefix,0,prefix.length,0)
    const length=prefix.readUInt32LE(12)
    assert(length>0&&length<32*1024*1024,`Invalid ASAR header: ${file}`)
    const header=Buffer.alloc(length)
    const {bytesRead}=await handle.read(header,0,length,16)
    assert.equal(bytesRead,length,'Incomplete ASAR header')
    const paths=[]
    function visit(node,parent='') {
      for(const [name,entry] of Object.entries(node.files??{})) {
        const current=parent?`${parent}/${name}`:name
        if(entry.files)visit(entry,current)
        else paths.push(current)
      }
    }
    visit(JSON.parse(header.toString()))
    return paths
  }finally{await handle.close()}
}

const archives=await findArchives(path.resolve(process.argv[2]??'release'))
assert(archives.length>0,'No packaged app.asar found')
for(const archive of archives) {
  const paths=await listArchive(archive)
  const files=new Set(paths)
  for(const required of ['dist/fonts/NotoSansSC.woff2','dist/fonts/JetBrainsMono.woff2','dist/THIRD_PARTY_LICENSES.txt','node_modules/mathjax-full/js/mathjax.js','node_modules/@shikijs/themes/dist/github-light.mjs','node_modules/@shikijs/themes/dist/github-dark.mjs']) {
    assert(files.has(required),`Missing required resource: ${required}`)
  }
  const forbidden=paths.filter(file=>
    file.endsWith('.map')||
    /^dist\/fonts\/.*\.ttf$/.test(file)||
    /^node_modules\/(mermaid|codemirror|dompurify|@codemirror\/[^/]+)\//.test(file)||
    /^node_modules\/mathjax-full\/(es5|ts|components)\//.test(file)||
    /^node_modules\/@shikijs\/themes\/dist\/(?!(github-light|github-dark|index)\.mjs$).*\.mjs$/.test(file))
  assert.deepEqual(forbidden,[],`Untrimmed resources in ${archive}`)
  const locales=path.resolve(path.dirname(archive),'../locales')
  if(await fs.stat(locales).then(stat=>stat.isDirectory(),()=>false)) {
    const languages=(await fs.readdir(locales)).filter(file=>file.endsWith('.pak')).sort()
    assert.deepEqual(languages,['en-US.pak','zh-CN.pak','zh-TW.pak'],'Unexpected Chromium language packs')
  }
  console.log(`Verified trimmed package: ${archive} (${((await fs.stat(archive)).size/1048576).toFixed(1)} MiB ASAR)`)
}
