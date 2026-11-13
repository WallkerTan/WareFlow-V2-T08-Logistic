// Refresh the generated endpoint section while preserving manually maintained feature notes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const backend=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]); }
function paths(annotation) { return [...annotation.matchAll(/"(\/[^"\n]*)"/g)].map(m=>m[1]); }
function expand(route) {
    const dynamic=/\{\w+:([^{}]+)\}/.exec(route);
    if(!dynamic)return [route];
    return dynamic[1].split('|').flatMap(action=>expand(route.replace(dynamic[0],action)));
}
const rows=[];
for(const service of ['core','inventory','finance','delivery']) {
    const dir=path.join(backend,`${service}-service`,'src','main','java');
    for(const file of files(dir).filter(f=>f.endsWith('Controller.java'))) {
        const source=fs.readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
        const classAt=source.search(/public\s+class\s/);if(classAt<0)continue;
        const before=source.slice(0,classAt);const prefix=/@RequestMapping\s*(\([^)]*\))?/.exec(before);
        const bases=prefix?paths(prefix[0]):[];if(!bases.length)bases.push('');
        const after=source.slice(classAt);
        for(const match of after.matchAll(/@(Get|Post|Put|Patch|Delete)Mapping\s*(\([^)]*\))?/g)) {
            const suffixes=paths(match[0]);if(!suffixes.length)suffixes.push('');
            const tail=after.slice(match.index+match[0].length);
            const signature=/public\s+(?:[\w.<>,?\[\]]+\s+)+([\w]+)\s*\(/.exec(tail);
            const handler=signature?.[1]||'—';
            const relative=path.relative(backend,file).replaceAll('\\','/');
            for(const base of bases)for(const suffix of suffixes)for(const route of expand(`/api/${service}${base}${suffix}`))
                rows.push({service,method:match[1].toUpperCase(),route,handler,file:relative});
        }
    }
}
rows.sort((a,b)=>a.service.localeCompare(b.service)||a.route.localeCompare(b.route)||a.method.localeCompare(b.method));
const duplicates=rows.filter((r,i)=>rows.findIndex(x=>x.method===r.method&&x.route===r.route)!==i);
if(duplicates.length)throw Error('Duplicate routes: '+JSON.stringify(duplicates));
const table=`\nTổng: **${rows.length} endpoint** (đã mở rộng các action động).\n\n| Method | URL qua gateway | Handler / source |\n| --- | --- | --- |\n`+
    rows.map(r=>`| ${r.method} | \`${r.route}\` | [${path.basename(r.file,'.java')}.${r.handler}](${r.file}) |`).join('\n')+'\n';
const file=path.join(backend,'CHUC-NANG-VA-API.md');const current=fs.readFileSync(file,'utf8');
if(!current.includes('<!-- API-CATALOG:START -->'))throw Error('Missing API catalog markers');
fs.writeFileSync(file,current.replace(/<!-- API-CATALOG:START -->[\s\S]*?<!-- API-CATALOG:END -->/,'<!-- API-CATALOG:START -->\n'+table+'\n<!-- API-CATALOG:END -->'));
console.log(`Updated ${rows.length} endpoints in ${path.basename(file)}`);
