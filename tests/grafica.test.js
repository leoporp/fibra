const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http=require('http'),fs=require('fs'),path=require('path');
fs.mkdirSync(__dirname+'/shots',{recursive:true});
const DIR=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('window.FIBRA_CONFIG={url:"",key:""};');}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
server.listen(8789,async()=>{
 const b=await chromium.launch(); const errors=[];
 for (const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2,colorScheme:scheme}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
  await p.clock.install({time:new Date('2026-10-10T21:00:00-05:00')});
  await p.goto('http://localhost:8789/'); await p.waitForTimeout(200);
  // empty state first
  await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(100);
  if (scheme==='light') ok(/Cuando registres el dolor/.test(await p.locator('.chart').innerText()),'empty chart message');
  await p.locator('[data-toggle]').count();
  await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')||'null'); });
  await p.locator('[data-tab="hoy"]').click(); await p.locator('[data-toggle]').first().click();
  await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); const sid=s.sessions[0].id, items=s.sessions[0].items;
    const pad=n=>String(n).padStart(2,'0'); const base=new Date(2026,9,10);
    for(let i=0;i<28;i++){ if([5,6,12,13,20].includes(i)) continue; const d=new Date(base); d.setDate(base.getDate()-i); const k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
      const L=Math.max(0,Math.min(10,Math.round(4+2*Math.sin(i/3)))), R=Math.max(0,Math.min(10,Math.round(5+2*Math.cos(i/4))));
      const done={}; items.slice(0, i%3===0?5:i%3===1?3:1).forEach(x=>done[x]=true);
      s.logs[k]={done,session:sid,painL:L,painR: i===2? undefined : R, ice:i%2===0, heat:i%5===0, breaks:1+(i%5)}; }
    localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(200);
  await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(150);
  const h2=p.locator('h2',{hasText:'Dolor y constancia'}); await h2.scrollIntoViewIfNeeded();
  await p.evaluate(()=>{ const h=[...document.querySelectorAll('h2')].find(x=>x.textContent.startsWith('Dolor')); window.scrollTo(0, h.getBoundingClientRect().top+window.scrollY-10); });
  const ylabels=await p.locator('.chart svg text').evaluateAll(els=>els.map(e=>e.textContent)); console.log(scheme,'svg texts',JSON.stringify(ylabels));
  ok(ylabels.includes('0')&&ylabels.includes('10')&&ylabels.includes('hoy'),'y axis labels present');
  await p.screenshot({path:__dirname+'/shots/'+scheme+'_pain_max.png'});
  // tap a day
  await p.locator('[data-pday="25"]').click({force:true}); await p.waitForTimeout(80);
  const rd=await p.locator('#pday').innerText(); console.log('readout', rd); ok(/izquierdo \d+, derecho/.test(rd),'tap readout');
  await p.locator('[data-painview="arms"]').click(); await p.waitForTimeout(100);
  ok(await p.locator('[data-painview="arms"]').getAttribute('aria-pressed')==='true','arms toggled');
  const t2=await p.locator('.chart svg text').evaluateAll(els=>els.map(e=>e.textContent)); ok(t2.includes('Izq')&&t2.includes('Der'),'direct labels');
  await p.evaluate(()=>{ const h=[...document.querySelectorAll('h2')].find(x=>x.textContent.startsWith('Dolor')); window.scrollTo(0, h.getBoundingClientRect().top+window.scrollY-10); });
  await p.locator('[data-pday="27"]').click({force:true}); await p.waitForTimeout(60);
  await p.screenshot({path:__dirname+'/shots/'+scheme+'_pain_arms.png'});
  const st=await p.evaluate(()=>JSON.parse(localStorage.getItem('fibra-state-v1')).painView); ok(st==='arms','view saved');
  await p.evaluate(()=>{ const h=[...document.querySelectorAll('h2')].find(x=>x.textContent.startsWith('Tus registros')); window.scrollTo(0, h.getBoundingClientRect().top+window.scrollY-10); });
  await p.screenshot({path:__dirname+'/shots/'+scheme+'_habits2.png'});
  await ctx.close(); }
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
