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
server.listen(8788,async()=>{
 const b=await chromium.launch(); const errors=[];
 // migration from v7 with seeded rewards + one custom
 let ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2}); let p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-10T17:00:00-05:00')});
 await p.goto('http://localhost:8788/'); await p.waitForTimeout(300);
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')||'null'); });
 // build a v7-like state from fresh one
 await p.locator('[data-toggle]').first().click(); // force save
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); s.v=7; delete s.fundV8; delete s.fundStart; delete s.spends;
   s.rewards=[{id:'a',type:'weeks',n:1,text:'Noche de anime o película de horror, sin culpa'},{id:'b',type:'level',n:9,text:'El bajo que tienes en la mira',claimed:'2026-10-09'},{id:'c',type:'weeks',n:3,text:'Mi premio propio'}];
   s.logs={}; localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await p.reload(); await p.waitForTimeout(300);
 const fl=await p.locator('.next.fundline').innerText(); console.log(fl); ok(/Tu fondo: \$0\. Hoy sumas \$5\.000/.test(fl),'fund line on Hoy');
 ok(await p.locator('.next', {hasText:'Próxima recompensa'}).count()===1,'custom reward still shows as next');
 // start toast
 await p.locator('[data-start]').click(); await p.waitForTimeout(80); if (await p.locator('[data-gostart]').count()) await p.locator('[data-gostart]').click(); await p.waitForTimeout(80);
 ok(/Dale play a tu audiolibro/.test(await p.locator('.pill.play').innerText()),'start note default');
 await p.locator('[data-close]').first().click();
 // complete 3 of 5 → counts
 for (let i=0;i<3;i++){ await p.locator('[data-toggle]').nth(i).click(); await p.waitForTimeout(60); }
 const tmsg=await p.locator('#toast').innerText(); console.log('toast after 3:', tmsg); ok(/Día cumplido: \+\$5\.000 a tu fondo/.test(tmsg),'day counts toast');
 ok(/Hoy ya sumaste \$5\.000/.test(await p.locator('.next.fundline').innerText()),'fund line updated');
 const st=await p.evaluate(()=>JSON.parse(localStorage.getItem('fibra-state-v1')));
 ok(st.v===8 && st.fundStart==='2026-10-10' && st.rewards.length===1 && st.rewards[0].text==='Mi premio propio','migration removed seeded rewards '+JSON.stringify(st.rewards.map(r=>r.text)));
 // simulate earlier days this week (Mon-Thu) counting and week met, but fundStart today so they shouldn't count as days; week counts when met
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); const sid=s.sessions[0].id; const all=Object.fromEntries(s.sessions[0].items.map(i=>[i,true]));
   ['2026-10-06','2026-10-07','2026-10-08'].forEach(k=>s.logs[k]={done:all,session:sid}); localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await p.reload(); await p.waitForTimeout(300);
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(150);
 const ft=await p.locator('.fund').innerText(); console.log(ft.split('\n').slice(0,3).join(' | '));
 ok(/\$15\.000/.test(ft) && /1 día y 1 semana cumplida/.test(ft),'fund = 1 day + 1 week = 15.000');
 // spend
 await p.locator('[data-spend]').click(); await p.locator('#sp-what').fill('Sushi'); await p.locator('#sp-amt').fill('40000'); await p.locator('[data-savespend]').click(); await p.waitForTimeout(80);
 ok(/Te pasaste por \$25\.000/.test(await p.locator('#toast').innerText()),'overspend toast: '+await p.locator('#toast').innerText());
 ok(/−\$25\.000/.test(await p.locator('.fundtop').innerText()) && /te pasaste/.test(await p.locator('.fundtop').innerText()),'negative balance shown');
 await p.locator('.fund').scrollIntoViewIfNeeded(); await p.screenshot({path:__dirname+'/shots/L13_fund.png'});
 await p.locator('[data-delspend]').click(); await p.locator('[data-delspend]').click(); await p.waitForTimeout(80);
 ok(/\$15\.000/.test(await p.locator('.fundtop').innerText()),'spend removed');
 await p.locator('[data-spend]').click(); await p.locator('#sp-what').fill('Libro'); await p.locator('#sp-amt').fill('10000'); await p.locator('[data-savespend]').click(); await p.waitForTimeout(80);
 ok(/Te quedan \$5\.000/.test(await p.locator('#toast').innerText()),'spend ok toast');
 await p.locator('.fund').scrollIntoViewIfNeeded(); await p.screenshot({path:__dirname+'/shots/L14_fund_spent.png'});
 // bundle name
 await p.locator('[data-tab="rutina"]').click(); await p.locator('#bundle').fill('Aniquilación'); await p.locator('#bundle').press('Enter'); await p.locator('#bundle').blur(); await p.waitForTimeout(80);
 await p.locator('[data-tab="hoy"]').click(); await p.waitForTimeout(100);
 await p.locator('[data-start]').click(); await p.waitForTimeout(80); if (await p.locator('[data-gostart]').count()) await p.locator('[data-gostart]').click(); await p.waitForTimeout(80);
 ok(/Dale play a Aniquilación/.test(await p.locator('.pill.play').innerText()),'named bundle note');
 await p.screenshot({path:__dirname+'/shots/L15_start_toast.png'});
 await ctx.close();
 // dark fresh
 ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2,colorScheme:'dark'}); p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8788/'); await p.waitForTimeout(300);
 const fresh=await p.evaluate(()=>1); await p.screenshot({path:__dirname+'/shots/D04_hoy_fund.png'});
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(150); await p.locator('.fund').scrollIntoViewIfNeeded(); await p.screenshot({path:__dirname+'/shots/D05_fund.png'});
 ok(await p.locator('.rw').count()===0,'fresh user: no seeded rewards');
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
