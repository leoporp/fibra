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
const goal=p=>p.locator('.week-card .wk span').innerText();
// Pausar la meta por días (viaje o enfermedad): la meta de la semana baja en proporción; una semana toda en pausa no rompe la racha ni suma fondo.
server.listen(8813,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 // martes 10 de noviembre de 2026
 await p.clock.install({time:new Date('2026-11-10T19:00:00-05:00')});
 await p.goto('http://localhost:8813/'); await p.waitForTimeout(300);
 await p.locator('[data-pick]').first().click(); await p.waitForTimeout(100);
 // semana del 26 oct cumplida (4 días), semana del 2 nov sin entrenar, esta semana nada aún
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); const ss=s.sessions[0]; const done={}; ss.items.forEach(x=>done[x]=true);
   s.logs={}; ['2026-10-26','2026-10-27','2026-10-29','2026-10-31'].forEach(k=>s.logs[k]={done:Object.assign({},done),session:ss.id}); s.fundStart='2026-10-26';
   localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await p.reload(); await p.waitForTimeout(300);
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(200);
 ok((await p.locator('.stat').first().innerText()).startsWith('0'),'sin pausa la racha se rompió (0)');
 await p.locator('[data-tab="hoy"]').click(); await p.waitForTimeout(200);
 ok(/de 4 días/.test(await goal(p)),'meta normal 4');
 // pausar desde ayer (lunes 9), por viaje
 await p.locator('[data-pause]').click(); await p.waitForTimeout(400);
 await p.locator('[data-pwhy="viaje"]').click(); await p.locator('[data-pfrom="2026-11-09"]').click();
 await p.screenshot({path:__dirname+'/shots/pausa-hoja.png'});
 await p.locator('[data-pausego]').click(); await p.waitForTimeout(450);
 let st=await ST(p); ok(st.pauses && st.pauses.length===1 && st.pauses[0].from==='2026-11-09' && st.pauses[0].to===null && st.pauses[0].why==='viaje','pausa guardada '+JSON.stringify(st.pauses));
 ok(/de 3 días/.test(await goal(p)),'2 días en pausa: meta 3 ('+await goal(p)+')');
 ok(await p.locator('.strands .paused').count()===2,'lunes y martes se ven en pausa');
 ok(/En pausa/.test(await p.locator('.pauseline').innerText()) && /viaje/.test(await p.locator('.pauseline').innerText()),'línea de pausa con motivo');
 await p.locator('.week-card').scrollIntoViewIfNeeded(); await p.screenshot({path:__dirname+'/shots/pausa-hoy.png'});
 // la pausa avanza sola con los días
 await p.clock.setSystemTime(new Date('2026-11-12T19:00:00-05:00')); await p.reload(); await p.waitForTimeout(300);
 ok(/de 2 días/.test(await goal(p)),'4 días en pausa: meta 2 ('+await goal(p)+')');
 // Ya volví: la pausa termina ayer
 await p.locator('[data-unpause]').click(); await p.waitForTimeout(200);
 st=await ST(p); ok(st.pauses[0].to==='2026-11-11','Ya volví cierra la pausa en ayer');
 ok(/de 2 días/.test(await goal(p)),'3 días en pausa: meta 2, redondeado ('+await goal(p)+')');
 ok(await p.locator('[data-pause]').count()===1,'vuelve el botón de pausar');
 // semana toda en pausa: no rompe la racha ni suma fondo
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); s.pauses.push({id:'px',from:'2026-11-02',to:'2026-11-08',why:'enfermo'}); localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await p.reload(); await p.waitForTimeout(300);
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(200);
 ok((await p.locator('.stat').first().innerText()).startsWith('1'),'semana en pausa no rompe la racha (1)');
 await p.locator('[data-tab="hoy"]').click(); await p.waitForTimeout(200);
 ok(/\$30\.000/.test(await p.locator('.fundline').innerText()),'fondo: 4 días ($20.000) + 1 semana ($10.000), sin bono por la semana pausada: '+await p.locator('.fundline').innerText());
 // días pausados en Tus registros
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(200);
 ok(/En pausa/.test(await p.locator('[data-editday="2026-11-10"]').innerText()),'Tus registros marca los días en pausa');
 // pausar y volver el mismo día: no queda nada
 await p.locator('[data-tab="hoy"]').click(); await p.waitForTimeout(200);
 await p.locator('[data-pause]').click(); await p.waitForTimeout(400); await p.locator('[data-pausego]').click(); await p.waitForTimeout(450);
 await p.locator('[data-unpause]').click(); await p.waitForTimeout(200);
 st=await ST(p); ok(st.pauses.length===2,'pausa del mismo día se borra al volver');
 // borrar una pausa anterior
 await p.locator('[data-pause]').click(); await p.waitForTimeout(400);
 await p.locator('[data-pdel="px"]').click(); await p.locator('[data-pdel="px"]').click(); await p.waitForTimeout(500);
 st=await ST(p); ok(!st.pauses.some(x=>x.id==='px'),'borrar pausa anterior');
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
