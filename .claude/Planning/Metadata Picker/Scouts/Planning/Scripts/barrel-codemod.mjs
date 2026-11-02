import fs from 'node:fs'; import path from 'node:path'
const map={}
const add=(mod,names)=>names.forEach(n=>map[n]=mod)
add('MenuRows',['MenuItem','MenuSeparator','MenuDesc','MenuTopRow','Menu','AccessoryButton','FootingCreate','RowRemove','FooterLockButton','FooterIconButton','MenuFooting','FootingItem','MenuScrollFrame','menuDropLine'])
add('MenuIndex',['MenuIndex','MenuRowView','steppedRow','pickerRow','PickerRowLook','MenuRow','MenuSection','Trailing'])
add('DisclosureRow',['DisclosureRow','DropOutline','useDisclosureSet'])
add('pickRuns',['pickRuns','PickRun'])
add('menu-row.css',['heading','itemEmphasized','titleInput'])
add('MenuSurface',['MenuSurface']);add('MenuDropdown',['MenuDropdown'])
const order=['DisclosureRow','MenuDropdown','MenuIndex','MenuRows','MenuSurface','menu-row.css','pickRuns']
const files=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name==='out')continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name))files.push(p)}}
for(const r of process.argv.slice(2))walk(r)
let changed=0;const pending=[]
for(const f of files){let s=fs.readFileSync(f,'utf8');if(!s.includes("from '@pommora/uix/Menus'"))continue
  s=s.replace(/import\s+(type\s+)?\{([^}]*)\}\s+from '@pommora\/uix\/Menus'\n/g,(m,ty,body)=>{
    const groups={}
    for(const raw of body.split(',').map(x=>x.trim()).filter(Boolean)){const n=raw.replace(/^type\s+/,'').split(/\s+as\s+/)[0];const mod=map[n];if(!mod)throw new Error(n+' '+f);(groups[mod]??=[]).push(raw)}
    let out=''
    for(const mod of order){if(!groups[mod])continue
      // merge into an existing named import of the same module
      const re=new RegExp(`import \\{([^}]*)\\} from '@pommora/uix/Menus/${mod.replace('.','\\.')}'\\n`)
      const ex=s.match(re)
      if(ex&&!ty){const names=[...ex[1].split(',').map(x=>x.trim()).filter(Boolean),...groups[mod]];pending.push([re,`import { ${names.join(', ')} } from '@pommora/uix/Menus/${mod}'\n`]);continue}
      out+=`import ${ty??''}{ ${groups[mod].join(', ')} } from '@pommora/uix/Menus/${mod}'\n`}
    return out})
  for(const [re,rep] of pending.splice(0))s=s.replace(re,rep);fs.writeFileSync(f,s);changed++}
console.log({changed})
