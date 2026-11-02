import fs from 'node:fs'; import path from 'node:path'
const root = process.argv[2] || 'UIX'
const files=[]; const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules')continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name))files.push(p)}};walk(root)
const set=new Set(files)
const res=(from,s)=>{if(!s.startsWith('.'))return null;const b=path.normalize(path.join(path.dirname(from),s));for(const c of [b,b+'.ts',b+'.tsx',b+'.css.ts',path.join(b,'index.ts'),path.join(b,'index.tsx')])if(set.has(c))return c;return null}
const edges=new Map()
for(const f of files){const src=fs.readFileSync(f,'utf8');const out=new Set();for(const m of src.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)){const t=res(f,m[1]);if(t)out.add(t)}edges.set(f,[...out])}
const isTest=f=>/\.test\.tsx?$/.test(f)
const folder=f=>f.split('/')[1]
// folder edges (non test)
const fe={}
for(const [f,o] of edges){if(isTest(f))continue;for(const t of o){const a=folder(f),b=folder(t);if(a===b)continue;(fe[a]??={});(fe[a][b]??=[]).push(`${path.relative(root,f)}->${path.relative(root,t)}`)}}
for(const a of Object.keys(fe).sort())console.log(a,'->',Object.keys(fe[a]).sort().map(b=>`${b}(${fe[a][b].length})`).join(' '))
// Tarjan folder SCC
const nodes=new Set([...Object.keys(fe),...Object.values(fe).flatMap(o=>Object.keys(o))]);let idx=0;const st=[],on=new Set(),I={},L={},sccs=[]
const sc=v=>{I[v]=L[v]=idx++;st.push(v);on.add(v);for(const w of Object.keys(fe[v]||{})){if(I[w]===undefined){sc(w);L[v]=Math.min(L[v],L[w])}else if(on.has(w))L[v]=Math.min(L[v],I[w])}if(L[v]===I[v]){const c=[];let w;do{w=st.pop();on.delete(w);c.push(w)}while(w!==v);if(c.length>1)sccs.push(c)}}
for(const n of nodes)if(I[n]===undefined)sc(n)
console.log('FOLDER SCCs',JSON.stringify(sccs))
// reachability Menus->Pickers (file-level, non-test)
const reach=(startPred,goalPred)=>{const seen=new Map();const q=[];for(const f of edges.keys())if(startPred(f)&&!isTest(f)){seen.set(f,null);q.push(f)}const hits=[];while(q.length){const f=q.shift();for(const t of edges.get(f)){if(seen.has(t))continue;seen.set(t,f);if(goalPred(t)){const c=[t];let p=f;while(p){c.push(p);p=seen.get(p)}hits.push(c.reverse().map(x=>path.relative(root,x)).join(' -> '))}else q.push(t)}}return hits}
console.log('MENUS ~> PICKERS');for(const h of reach(f=>folder(f)==='Menus',f=>folder(f)==='Pickers'))console.log('  ',h)
// file-level SCC
idx=0;const I2=new Map(),L2=new Map(),st2=[],on2=new Set(),s2=[]
const sc2=v=>{I2.set(v,idx);L2.set(v,idx);idx++;st2.push(v);on2.add(v);for(const w of edges.get(v)){if(isTest(w))continue;if(!I2.has(w)){sc2(w);L2.set(v,Math.min(L2.get(v),L2.get(w)))}else if(on2.has(w))L2.set(v,Math.min(L2.get(v),I2.get(w)))}if(L2.get(v)===I2.get(v)){const c=[];let w;do{w=st2.pop();on2.delete(w);c.push(w)}while(w!==v);if(c.length>1)s2.push(c)}}
for(const n of edges.keys())if(!isTest(n)&&!I2.has(n))sc2(n)
console.log('FILE SCCs',JSON.stringify(s2.map(c=>c.map(x=>path.relative(root,x)))))
