import fs from 'node:fs'
import path from 'node:path'

// Frontend dependencies are bundled rather than shipped as node_modules.
// Preserve their license/notice files in one small distributable asset.
export function frontendLicenses() {
  return {
    name: 'frontend-licenses',
    generateBundle() {
      const packages=new Map()
      for(const id of this.getModuleIds()) {
        if(!id.includes('/node_modules/')&&!id.includes('\\node_modules\\'))continue
        let dir=path.dirname(id.split('?')[0].replace(/^\/(?=[A-Za-z]:\/)/,''))
        while(dir.includes('node_modules')) {
          const manifest=path.join(dir,'package.json')
          if(fs.existsSync(manifest)) {
            const pkg=JSON.parse(fs.readFileSync(manifest,'utf8'))
            if(pkg.name) {packages.set(dir,pkg);break}
          }
          const parent=path.dirname(dir)
          if(parent===dir)break
          dir=parent
        }
      }
      const sections=[]
      for(const [dir,pkg] of [...packages].sort((a,b)=>a[1].name.localeCompare(b[1].name))) {
        const files=fs.readdirSync(dir,{withFileTypes:true}).filter(entry=>entry.isFile()&&/^(licen[cs]e|copying|notice)([.-]|$)/i.test(entry.name))
        const notices=files.map(entry=>`${entry.name}\n${fs.readFileSync(path.join(dir,entry.name),'utf8')}`)
        if(!notices.length) {
          const readme=fs.readdirSync(dir).find(name=>/^readme([.-]|$)/i.test(name))
          if(readme)notices.push(fs.readFileSync(path.join(dir,readme),'utf8'))
        }
        sections.push(`${pkg.name}@${pkg.version}\nLicense: ${typeof pkg.license==='string'?pkg.license:JSON.stringify(pkg.license??'See upstream package')}\n\n${notices.join('\n\n')}`)
      }
      this.emitFile({type:'asset',fileName:'THIRD_PARTY_LICENSES.txt',source:sections.join('\n\n'+'='.repeat(72)+'\n\n')})
    }
  }
}
