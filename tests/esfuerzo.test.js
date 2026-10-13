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
const ST=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('fibra-state-v1')));
server.listen(8798,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-12T10:00:00-05:00')});
 await p.goto('http://localhost:8798/'); await p.waitForTimeout(300);
 // pick session B (has iso_ext)
 await p.locator('[data-pick="sB"]').click(); await p.waitForTimeout(100);
 await p.locator('.thumb[data-detail="iso_ext"]').click(); await p.waitForTimeout(200);
 ok(/Carga: Mancuerna sin discos o la otra mano/.test(await p.locator('.loadline').innerText()),'iso load line');
 await p.locator('[data-loadedit]').click(); await p.locator('#load-in').fill('Mancuerna 2 kg'); await p.locator('[data-loadsave]').click();
 await p.locator('[data-work]').click(); await p.clock.runFor(31000); await p.waitForTimeout(50);
 await p.locator('[data-done]').first().click(); await p.waitForTimeout(150);
 // done → back to iso via close & reopen
 await p.locator('[data-close]').first().click(); await p.waitForTimeout(50);
 await p.locator('.thumb[data-detail="iso_ext"]').click(); await p.waitForTimeout(200);
 ok(await p.locator('[data-effort]').count()===4,'effort options in done state');
 ok(/Mancuerna 2 kg/.test(await p.locator('.loadline').innerText()),'load line in done state');
 await p.locator('[data-effort="1"]').click(); await p.waitForTimeout(50);
 let st=await ST(p); ok(st.logs['2026-10-12'].effort.iso_ext===1 && st.logs['2026-10-12'].loads.iso_ext==='Mancuerna 2 kg','effort+load saved '+JSON.stringify([st.logs['2026-10-12'].effort, st.logs['2026-10-12'].loads]));
 await p.locator('#flow').scrollIntoViewIfNeeded(); await p.screenshot({path:__dirname+'/shots/L20_effort.png'});
 // load change after done updates today's log
 await p.locator('[data-loadedit]').click(); await p.locator('#load-in').fill('Mancuerna 3 kg'); await p.locator('[data-loadsave]').click();
 st=await ST(p); ok(st.logs['2026-10-12'].loads.iso_ext==='Mancuerna 3 kg','today load updated after done');
 await p.locator('[data-close]').first().click();
 // next day
 await p.clock.runFor(24*3600*1000); await p.reload(); await p.waitForTimeout(300);
 await p.locator('[data-tab="rutina"]').click(); await p.waitForTimeout(400);
 const msg=await p.locator('#msg').inputValue(); ok(/Isométrico de extensores de muñeca.*La última vez hice 30 · 30 · 30 · 30 · 30\/?.*s.*con Mancuerna 3 kg y se sintió muy fácil/.test(msg.replace(/\n/g,' ')) || /con Mancuerna 3 kg y se sintió muy fácil/.test(msg),'santiago msg effort: '+msg.split('\n').find(l=>/Isométrico/.test(l)));
 await p.locator('.sl .linkish', {hasText:'Isométrico'}).first().click(); await p.waitForTimeout(200);
 const fl=await p.locator('#flow').innerText().catch(()=>'(no flow)'); console.log('flow:', fl.replace(/\n/g,' | ').slice(0,300));
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
