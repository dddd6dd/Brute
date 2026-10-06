// No npm install or application build step: node --test tests/refactor.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const map = JSON.parse(read('tests/extraction-map.json'));
const original = cp.execFileSync('git', ['show', map.baseline + ':index.html'], { cwd: root, encoding: 'utf8' });
const oldJS = original.slice(original.indexOf('<script>') + 8, original.indexOf('</script>', original.indexOf('<script>')));
const html = read('index.html');
const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);

test('original HTML, CSS and every JavaScript source chunk are preserved exactly', () => {
  const reconstructed = map.chunks.map(n => read(n.file).slice(n.fileStart, n.fileEnd)).join('');
  assert.equal(reconstructed, oldJS);
  for (const n of map.chunks) assert.equal(read(n.file).slice(n.fileStart, n.fileEnd), oldJS.slice(n.originalStart, n.end));
  const restored = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>' + read('css/style.css') + '</style>')
    .replace(/<script src="js\/config.js"><\/script>[\s\S]*?<script src="js\/app.js"><\/script>/, () => '<script>' + reconstructed + '</script>');
  assert.equal(restored, original);
});

test('classic scripts parse together, entry point is last, shell contains all new files', () => {
  assert.equal(scripts.at(-1), 'js/app.js');
  new vm.Script(scripts.map(read).join('\n'));
  for (const p of scripts) { new vm.Script(read(p), { filename: p }); assert.ok(read('sw.js').includes("'./" + p + "'")); }
  assert.ok(read('sw.js').includes("'./css/style.css'"));
  const before = cp.execFileSync('git', ['show', map.baseline + ':sw.js'], {cwd: root, encoding:'utf8'});
  assert.equal(read('sw.js').slice(read('sw.js').indexOf("self.addEventListener")), before.slice(before.indexOf("self.addEventListener")));
  for (const p of ['manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png']) {
    const baseline = cp.execFileSync('git', ['show', map.baseline + ':' + p], {cwd: root});
    assert.deepEqual(fs.readFileSync(path.join(root,p)), baseline);
  }
});

function context(isOriginal) {
  const data = new Map();
  const ctx = vm.createContext({console, Headers, localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)},sessionStorage:{getItem:()=>null},window:{supabase:{createClient:()=>({})}}});
  if(isOriginal){
    const declarations = map.chunks.filter(n => n.type === 'FunctionDeclaration' || n.type === 'VariableDeclaration').map(n => oldJS.slice(n.start,n.end));
    vm.runInContext(declarations.join('\n'),ctx);
  } else for (const p of scripts.filter(p=>p!=='js/app.js')) vm.runInContext(read(p),ctx,{filename:p});
  return ctx;
}
const a=context(true), b=context(false);
const result=(ctx,code)=>vm.runInContext(code,ctx);
function same(code){ assert.deepEqual(result(b, 'JSON.stringify('+code+', (k,v) => typeof v === \"number\" && !Number.isFinite(v) ? String(v) : v)'), result(a, 'JSON.stringify('+code+', (k,v) => typeof v === \"number\" && !Number.isFinite(v) ? String(v) : v)'),code); }

test('every moved callable retains its original function body',()=>{
  for(const n of map.chunks) if(n.names.length && n.file !== 'js/app.js') for(const name of n.names){
    if(result(a, 'typeof '+name)==='function') assert.equal(result(b,name+'.toString()'),result(a,name+'.toString()'),name);
  }
});
test('Pace classifications, tolerances and null handling match original across seeded inputs',()=>{
  let seed=230107;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
  const cases=[[60,60,60],[50,60,61],[70,66,60],[60,null,61,60],[0,-1,null],[],[10],[10,10],[99,101,100],[0,null,60,62,59]];
  for(let k=0;k<400;k++) cases.push(Array.from({length:3+Math.floor(rnd()*8)},()=>rnd()<.15?null:Math.round(20+rnd()*180)));
  for(const values of cases) for(const hb of [false,true]){
    const s=JSON.stringify(values);same(`paceRates(${s},${hb})`);same(`pacePattern(${s},${hb})`);same(`paceStats(paceRates(${s},${hb}))`);
  }
  for(const t of [0,1,30,99.99,100,100.01,150,300]) for(const u of ['time','cal','reps']) same(`paceTol(${t},${JSON.stringify(u)})`);
  for(const [v,key] of [[[60,60,60],'even'],[[50,60,61],'allout'],[[70,66,60],'negative']]) assert.equal(result(b,`pacePattern(${JSON.stringify(v)},false).key`),key);
  assert.equal(result(b,"paceTol(60,'time')"),3);
  assert.equal(result(b,"paceTol(200,'time')"),6);
});
test('clock/rest/cap parsers, units, detail formats and plate calculations match original',()=>{
  for(const text of ['',null,'0:00','1:59','12:99','1:2','CAP','CAP +12','99:59']) same(`clockSec(${JSON.stringify(text)})`);
  for(const p of ['Rest 2:30','6 Sets: Rest 3 min','Time Cap 12:30','12 min Time Cap','']) {same(`parseRestSec(${JSON.stringify(p)})`);same(`parseCapSec(${JSON.stringify(p)})`);}
  for(const w of [0,.5,35,45,100,190,225,345]) for(const u of ['lb','kg']) {same(`toKg(${w},'${u}')`);same(`fromKg(${w},'${u}')`);same(`formatWeight(${w},'${u}')`);}
  assert.equal(result(b,"toKg(100,'lb')"),45.359237);
  for(const d of ['','legacy memo','§{"clock":90,"target":60,"igug":true}','§invalid']) same(`parsePersonalDetail({scale_detail:${JSON.stringify(d)}})`);
  for(const target of [15,20,45.359237,86.1825503,102.05828325]) same(`calcPlatesForWeight(${target},20)`);
  for(const p of ['6 Sets: 15 Cal Row\nRest 2:30','6 Sets: 15 Cal Ski\nRest 2:30','6 Sets: 10 Thruster 95lb\nRest 2:30']) same(`paceChanged({prescribed:${JSON.stringify(p)}},{prescribed:'6 Sets: 15 Cal Row\\nRest 2:30'})`);
});

test('program parsing and record prescription helpers retain accepted types and errors',()=>{
  for(const type of ['weight','for_time','amrap','emom_complete','reps','barbell_conditioning','amrap_by_round','weight_by_round','emom_by_round','distance','calories','note','check']){
    const x={section:'Metcon',name:'Test',type,prescribed:'3 Sets: 15 Cal Row\nRest 2:30',rounds:3,movements:['Clean']};
    const raw='```json\n'+JSON.stringify([x])+'\n```';
    same(`extractJsonArray(${JSON.stringify(raw)})`);
    same(`(()=>{try{validateProgramItems(${JSON.stringify([x])});return 'ok'}catch(e){return e.message}})()`);
    same(`repeatSetsCount(${JSON.stringify(x)})`);same(`igugMoves(${JSON.stringify(x)})`);same(`calMachines(${JSON.stringify(x)})`);
  }
  for(const input of [[],[{type:'invalid'}],[{section:'Metcon',name:'Test',type:'invalid',prescribed:'test'}]])same(`(()=>{try{validateProgramItems(${JSON.stringify(input)});return 'ok'}catch(e){return e.message}})()`);
  for(const s of ['Build to 3RM','6 Sets: 15 Cal Row\nRest 2:30','5 x 5 @ RPE 8','']){same(`parseRm(${JSON.stringify(s)})`);same(`parseSetRange({prescribed:${JSON.stringify(s)}})`);}
});
