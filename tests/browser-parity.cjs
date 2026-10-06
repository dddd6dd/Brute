/* Optional browser verification. No production API requests are sent.
   PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_EXECUTABLE=/path/to/chromium
   SUPABASE_TEST_BUNDLE=/path/to/supabase.js CHART_TEST_BUNDLE=/path/to/chart.js
   node tests/browser-parity.cjs
   Bundles must match the app's CDN libraries. Browser/tooling is not an app dependency. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'extraction-map.json'))).baseline;
const vendor={supabase:fs.readFileSync(process.env.SUPABASE_TEST_BUNDLE),chart:fs.readFileSync(process.env.CHART_TEST_BUNDLE)};
const date='2026-10-07';
const item=(name,type,prescribed,section='Strength',extra={})=>({name,type,prescribed,section,subsection:'',...extra});
const items=[item('Back Squat','weight','Build to 3RM'),item('Sprint','for_time','12 min Time Cap','Sprint'),item('Reps','reps','30 reps','Capacity'),item('Jump','distance','Max distance','Jump'),item('Row calories','calories','3 Sets: Cal Row','Metcon'),item('Status','emom_complete','EMOM 3','Skill'),item('Intervals','for_time','3 Sets:\n15 Cal Row\n10 Burpee\nRest 2:30','Metcon'),item('Rounds','amrap_by_round','3 Sets: 15 Cal Row','Metcon',{rounds:3}),item('Round weights','weight_by_round','3 Sets: Clean','Lifts',{rounds:3}),item('EMOM rounds','emom_by_round','EMOM 3','EMOM',{rounds:3}),item('Part one','for_time','15 Cal Ski\nRest 5:00','Parts'),item('Part two','for_time','15 Cal Row\n12 min Time Cap','Parts')];
function fixtures(){
 const dates=['2026-09-09','2026-09-16','2026-09-23','2026-09-30',date];let id=1;const records=[];
 const rec=(d,n,t,v,detail={},section='Metcon')=>records.push({id:id++,date:d,name:'Tester',item_name:n,type:t,value:String(v),section,scale_detail:'§'+JSON.stringify(detail),scaled:false,skipped:false});
 dates.forEach((d,i)=>{
  rec(d,'Back Squat','weight',80+i*5,{rm:3},'Strength');rec(d,'Intervals','for_time','8:00',{target:60,hits:3,lim:'Burpee'});
  [60,60,60].forEach((v,j)=>rec(d,'Intervals - '+(j+1)+'R','for_time','1:00',{clock:60+j*210}));
  rec(d,'Row calories','calories',45+i,{cals:[[15],[15],[15+i]],machines:['Row'],lim:'Burpee'});
  rec(d,'Jump','distance',i%2?'1 m':'100 cm',{},'Jump');
 });
 return {programs:dates.map(d=>({date:d,items,raw_text:'fixture'})),records,profile_settings:[{name:'Private',is_private:true}],key_lifts:[{name:'Tester',lift_name:'Back Squat',value_kg:100,updated_at:'2026-10-07'}],key_lift_history:[{name:'Tester',lift_name:'Back Squat',value_kg:90,recorded_date:'2026-09-30'},{name:'Tester',lift_name:'Back Squat',value_kg:100,recorded_date:date}],movement_videos:[]};
}
let upgradeCurrent=false;
const server=http.createServer((req,res)=>{
 let p=new URL(req.url,'http://local').pathname;
 if(p.startsWith('/vendor/')){res.setHeader('Content-Type','text/javascript');res.end(vendor[p.includes('supabase')?'supabase':'chart']);return;}
 const mode=p.split('/')[1];p=p.split('/').slice(2).join('/')||'index.html';
 try{let data=(mode==='baseline'||(mode==='upgrade'&&!upgradeCurrent))?cp.execFileSync('git',['show',baseline+':'+p],{cwd:root}):fs.readFileSync(path.join(root,p));
  if(p.endsWith('.html')) data=data.toString().replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2','/vendor/supabase.js').replace('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js','/vendor/chart.js').replace(/<link rel="stylesheet" as="style"[^>]+>/,'');
  res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':p.endsWith('.json')?'application/json':'text/html');res.end(data);
 }catch(e){res.statusCode=404;res.end('missing');}
});
async function run(browser,origin,mode,width){
 const db=fixtures(),calls=[],errors=[],snapshots={},screens={};let nextId=1000;
 const ctx=await browser.newContext({viewport:{width,height:900},timezoneId:'Asia/Seoul',serviceWorkers:'block'});
 await ctx.addInitScript(()=>{const D=Date;globalThis.Date=class extends D{constructor(...a){super(...(a.length?a:['2026-10-07T03:00:00Z']));}static now(){return D.now();}};});
 await ctx.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===origin) return route.continue();
  if(!url.hostname.endsWith('.supabase.co')) return route.fulfill({status:200,body:''});
  const table=url.pathname.split('/').at(-1),body=req.postData()?JSON.parse(req.postData()):null;
  const headers=await req.allHeaders();calls.push({method:req.method(),path:url.pathname,query:url.search,body,tokens:headers['x-brute-tokens']||''});
  let out;
  if(url.pathname.includes('/rpc/')){
   if(table==='admin_login')out=body.p_password==='fixture-admin'?{ok:true,token:'admin-token'}:{ok:false,error:'WRONG_PASSWORD'};
   else if(table==='profile_unlock')out=body.p_pin==='2468'?{ok:true,token:'private-token'}:{ok:false,error:'WRONG_PIN',left:4};
   else if(table==='can_access')out=(headers['x-brute-tokens']||'').includes('private-token')||(headers['x-brute-tokens']||'').includes('admin-token');
   else out={ok:true};
  }else{
   let rows=db[table]||[];
   const match=r=>[...url.searchParams].every(([k,v])=>{
    if(['select','order','limit','on_conflict'].includes(k))return true;
    if(v.startsWith('eq.'))return String(r[k])===v.slice(3);
    if(v.startsWith('lt.'))return r[k]<v.slice(3);
    if(v.startsWith('in.'))return v.slice(3).replace(/^\(|\)$/g,'').split(',').map(s=>s.replace(/^"|"$/g,'')).includes(String(r[k]));
    return true;
   });
   if(req.method()==='POST'){out=(Array.isArray(body)?body:[body]).map(r=>({...r,id:nextId++}));rows.push(...out);}
   else if(req.method()==='PATCH'){rows.filter(match).forEach(r=>Object.assign(r,body));out=rows.filter(match);}
   else if(req.method()==='DELETE'){db[table]=rows.filter(r=>!match(r));out=[];}
   else{
    out=rows.filter(match).map(r=>({...r}));
    const order=url.searchParams.get('order');if(order)out.sort((a,b)=>{for(const o of order.split(',')){const [k,d]=o.split('.');if(a[k]!==b[k])return (a[k]<b[k]?-1:1)*(d==='desc'?-1:1);}return 0;});
    const limit=url.searchParams.get('limit');if(limit)out=out.slice(0,+limit);
    const select=url.searchParams.get('select');if(select&&select!=='*'){const cols=select.split(',');out=out.map(r=>Object.fromEntries(cols.map(k=>[k,r[k]])));}
    if((headers.accept||'').includes('vnd.pgrst.object'))out=out[0]||null;
   }
  }
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(out)});
 });
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('dialog',d=>d.accept());
 await page.goto(origin+'/'+mode+'/index.html');await page.waitForSelector('.who-input');
 await page.locator('.who-input').fill('Tester');await page.locator('.who-ok').click();
 await page.waitForFunction(()=>LOG_CTX.name==='Tester' && document.querySelectorAll('.rs-row').length===3 && document.querySelector('[data-idx="0"] .rec-input').value!=='');
 await page.waitForTimeout(200);
 const shot=async()=>{await page.mouse.move(0,0);await page.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(350);return page.screenshot({animations:'disabled',timeout:30000});};
 const snap=async(name,selector='body')=>{await page.waitForTimeout(500);await page.evaluate(()=>{for(const a of document.getAnimations())if(Number.isFinite(a.effect.getComputedTiming().endTime))a.finish();});await page.waitForTimeout(50);snapshots[name]=await page.locator(selector).innerHTML();snapshots[name+'-layout']=await page.locator(selector).evaluate(el=>[...el.querySelectorAll('.card,input,button,select')].map(n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {tag:n.tagName,x:r.x,y:r.y,w:r.width,h:r.height,color:s.color,background:s.backgroundColor,font:s.fontSize,display:s.display}}));if(process.env.DEBUG_PARITY)console.log(mode,width,name);};
 await snap('initial','#log-form');if(width<1000)screens.initial=await shot();
 snapshots.target=await page.evaluate(async()=>{const c=document.createElement('div');c.innerHTML='<input class="rs-tmin"><input class="rs-tsec"><span class="rs-treason"></span>';document.body.appendChild(c);await suggestTargetPace(c,{name:'Intervals',type:'for_time',prescribed:'3 Sets:\n15 Cal Row\n10 Burpee\nRest 2:30'},3,150,()=>null,()=>{});const r={min:c.querySelector('.rs-tmin').value,sec:c.querySelector('.rs-tsec').value,reason:c.querySelector('.rs-treason').textContent};c.remove();return r;});assert.equal(snapshots.target.sec,'59','1.5% target progression');

 // Real DOM input, calculations, autosave requests and restoration.
 await page.locator('[data-idx="0"] .rec-input').fill('225');await page.waitForTimeout(2700);assert.ok(calls.some(c=>c.method==='POST'&&c.path.endsWith('/records')),'timer autosave');
 await page.locator('[data-idx="1"] .rec-min').fill('5');await page.locator('[data-idx="1"] .rec-sec').fill('42');
 await page.locator('[data-idx="2"] .rec-input').fill('30');
 await page.locator('[data-idx="3"] .rec-input').fill('2');await page.locator('[data-idx="3"] .dist-unit').selectOption('m');
 await page.locator('[data-idx="5"] .rec-input').selectOption('전체 완료');
 await page.locator('.rs-min').nth(0).fill('1');await page.locator('.rs-min').nth(1).fill('4');await page.locator('.rs-sec').nth(1).fill('30');await page.locator('.rs-min').nth(2).fill('8');
 await page.locator('[data-idx="7"] .round-input').nth(0).fill('12');await page.locator('[data-idx="8"] .round-input').nth(0).fill('135');await page.locator('[data-idx="9"] .round-input').nth(0).selectOption('언브로큰');
 await page.locator('[data-idx="2"] .skip-check').check();await page.locator('[data-idx="2"] .skip-reason').fill('fixture skip');
 await page.evaluate(()=>flushLogSaves());
 snapshots.records=structuredClone(db.records.filter(r=>r.date===date));await snap('finish','#log-form');
 await page.evaluate(()=>renderLogForm('2026-10-07'));await page.waitForFunction(()=>document.querySelector('[data-idx="0"] .rec-input')?.value==='225');await snap('restored','#log-form');
 // Multipart collection and rest calculations, including skipped/unfinished part.
 snapshots.multipart=await page.evaluate(()=>{const c=[...document.querySelectorAll('.multi-part-card')].find(c=>c.querySelector('.mp-min'));c.querySelectorAll('.mp-min')[0].value='2';c.querySelectorAll('.mp-min')[1].value='9';c.querySelectorAll('.mp-min')[1].dispatchEvent(new Event('input',{bubbles:true}));return c._collect('2026-10-07','Tester');});
 await page.evaluate(()=>flushLogSaves());
 // I GO U GO collects the existing special detail format.
 await page.locator('.rs-mode[data-m="igug"]').click();await page.locator('.ig-stop').nth(0).selectOption('all');await page.locator('.ig-stop').nth(1).selectOption('0');await page.locator('.ig-extra').nth(1).fill('5');await page.evaluate(()=>flushLogSaves());
 snapshots.igug=structuredClone(db.records.filter(r=>r.date===date&&r.item_name.startsWith('Intervals')));
 await page.locator('#tab-board').click();await page.waitForFunction(()=>document.querySelector('#board-content')?.textContent.includes('페이스'));await snap('progress','#board-content');if(width<1000)screens.progress=await shot();
 await page.locator('[data-r="all"]').click();await page.waitForTimeout(200);await snap('progress-all','#board-content');
 await page.evaluate(()=>{const row=document.querySelector('.pace-detail')?.parentElement;row?.click()});await snap('pace-detail','#board-content');
 await page.locator('#tab-profile').click();await page.waitForSelector('.name-chip');await page.evaluate(()=>showProfileDetail('Tester'));await page.waitForSelector('#profile-items-container');await snap('public-profile','#profile-detail');if(width<1000)screens.profile=await shot();await page.locator('#profile-unit-select').selectOption('kg');await snap('profile-kg','#profile-detail');
 snapshots.chart=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=300;canvas.height=100;document.body.appendChild(canvas);const c=buildGlassLineChart(canvas,{labels:['a','b'],data:[90,100],label:'test',suffix:'kg'});const out={labels:c.data.labels,data:c.data.datasets[0].data};c.destroy();canvas.remove();return out;});
 // A fixture-only edit and delete through original handlers.
 await page.evaluate(async()=>{const line=document.createElement('div');line.id='test-edit';document.body.appendChild(line);const rec={id:1,name:'Tester',item_name:'Back Squat',type:'weight',value:'80',scale_detail:'§{"rm":3}'};await startEditRecord(rec,line,document.createElement('span'),'kg',()=>{},()=>{});});
 await page.locator('#test-edit input[type="number"]').fill('82.5');await page.locator('#test-edit button').filter({hasText:'저장'}).click();await page.waitForTimeout(100);
 await page.locator('#test-edit button[aria-label="삭제"]').click();await page.waitForTimeout(100);
 await page.evaluate(()=>showProfileDetail('Private'));await page.waitForSelector('#profile-detail input[type="password"]');await snap('locked','#profile-detail');
 await page.locator('#profile-detail input[type="password"]').fill('1111');await page.locator('#profile-detail button').filter({hasText:'열기'}).click();await page.waitForTimeout(100);await snap('wrong-pin','#profile-detail');
 await page.locator('#profile-detail input[type="password"]').fill('2468');await page.locator('#profile-detail button').filter({hasText:'열기'}).click();await page.waitForTimeout(200);await snap('unlocked','#profile-detail');
 await page.evaluate(()=>switchTab('admin'));await page.locator('#admin-pw').fill('wrong');await page.locator('#admin-unlock-btn').click();await page.waitForTimeout(100);
 await page.locator('#admin-pw').fill('fixture-admin');await page.locator('#admin-unlock-btn').click();await page.waitForSelector('#admin-panel:not(.hidden)');await snap('admin','#admin-panel');
 await page.evaluate(()=>showAdminSection('pin'));await page.waitForTimeout(100);await snap('admin-pin','#admin-panel');
 await page.evaluate(()=>switchTab('board'));await page.waitForFunction(()=>document.querySelector('#board-content')?.textContent.includes('페이스'));await page.evaluate(()=>renderBoard());await page.waitForSelector('#board-date-select');await page.locator('#board-date-select').fill(date);await page.locator('#board-date-select').dispatchEvent('change');await page.waitForTimeout(200);await snap('leaderboard','#board-content');
 await page.evaluate(()=>switchTab('log'));await page.waitForTimeout(200);await page.locator('#floating-calc button[aria-label="무게 계산기 열기"]').click();await page.waitForFunction(()=>document.querySelector('#floating-calc > div').style.maxHeight==='none');await page.locator('#calc-base-value').fill('225');await page.locator('#calc-custom-percent').fill('80');await page.locator('#calc-custom-percent-btn').click();await page.evaluate(()=>{document.activeElement?.blur();document.querySelector('#floating-calc > div > div').scrollTop=0;});await snap('calculator','#floating-calc');if(width<1000)screens.calculator=await shot();
 snapshots.storage=await page.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));
 await page.evaluate(()=>flushLogSaves());await ctx.close();
 assert.ok(calls.some(c=>c.tokens.includes('private-token')),'PIN token forwarded');assert.ok(calls.some(c=>c.tokens.includes('admin-token')),'admin token forwarded');
 assert.deepEqual(errors,[],mode+' browser errors');
 return {snapshots,screens,calls};
}
async function pwa(browser,origin){
 const ctx=await browser.newContext({serviceWorkers:'allow'});
 await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.fulfill({status:200,contentType:'application/json',body:'[]'}));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/upgrade/index.html');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
 assert.ok(await page.evaluate(async()=>(await caches.keys()).includes('jogym-shell-v45')));
 await page.evaluate(()=>{localStorage.setItem('bruteLogName','Existing');localStorage.setItem('bruteProfileTokens','{"Existing":"existing-token"}');localStorage.setItem('weightUnit','kg');sessionStorage.setItem('bruteAdminToken','existing-admin');});
 upgradeCurrent=true;
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
 await page.waitForFunction(async()=>{const k=await caches.keys();return k.includes('jogym-shell-v47')&&!k.includes('jogym-shell-v45');});
 await page.reload();await page.waitForSelector('#floating-calc');
 const keys=await page.evaluate(async()=>{const c=await caches.open('jogym-shell-v47');return (await c.keys()).map(r=>new URL(r.url).pathname)});
 const assets=['css/style.css',...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="(js\/[^"]+)/g)].map(x=>typeof x==='string'?x:x[1]);
 for(const asset of assets)assert.ok(keys.includes('/upgrade/'+asset),asset+' precached');
 await page.evaluate(async()=>{const c=await caches.open('jogym-shell-v47');for(const url of ['/vendor/supabase.js','/vendor/chart.js'])await c.add(url);});
 await ctx.setOffline(true);await page.reload();await page.waitForSelector('#floating-calc');
 assert.deepEqual(await page.evaluate(()=>({name:localStorage.getItem('bruteLogName'),tokens:localStorage.getItem('bruteProfileTokens'),unit:localStorage.getItem('weightUnit'),admin:sessionStorage.getItem('bruteAdminToken')})),{name:'Existing',tokens:'{"Existing":"existing-token"}',unit:'kg',admin:'existing-admin'});
 assert.deepEqual(errors,[],'PWA errors');
 console.log('PASS PWA: v45 -> v47 upgrade; all CSS/JS precached; cached CDN offline reload; storage preserved; no page errors');
 await ctx.close();
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--no-zygote'],headless:true});
 try{
  for(const width of JSON.parse(process.env.PARITY_WIDTHS||'[390,1440]')){
   const a=await run(browser,origin,'baseline',width),b=await run(browser,origin,'refactored',width);
   for(const k of Object.keys(a.snapshots))assert.deepEqual(b.snapshots[k],a.snapshots[k],width+' '+k);
   const mutations=x=>x.calls.filter(c=>c.method!=='GET');assert.deepEqual(mutations(b),mutations(a),width+' mutation/RPC trace');
   const reads=x=>x.calls.filter(c=>c.method==='GET').map(c=>JSON.stringify(c)).sort();assert.deepEqual(reads(b),reads(a),width+' query trace');
   for(const k of Object.keys(a.screens)){if(!a.screens[k].equals(b.screens[k])){if(process.env.PARITY_OUTPUT_DIR){fs.mkdirSync(process.env.PARITY_OUTPUT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.PARITY_OUTPUT_DIR,width+'-'+k+'-before.png'),a.screens[k]);fs.writeFileSync(path.join(process.env.PARITY_OUTPUT_DIR,width+'-'+k+'-after.png'),b.screens[k]);}throw new Error(width+' screenshot '+k+' differs');}}
   console.log('PASS',width,'px:',Object.keys(a.snapshots).length,'DOM/data comparisons;',Object.keys(a.screens).length,'identical screenshots; query/RPC/write traces; no console errors');
  }
  await pwa(browser,origin);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
