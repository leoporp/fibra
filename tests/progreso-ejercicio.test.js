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
// Progreso por ejercicio: peso en kg (campo opcional) y repeticiones por serie, en gráficas separadas en la hoja del ejercicio.
server.listen(8812,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-10T18:00:00-05:00')});
 await p.goto('http://localhost:8812/'); await p.waitForTimeout(300);
 // ejercicio de repeticiones por brazo y otro sin datos
 await p.locator('[data-pick]').first().click(); await p.waitForTimeout(100);
 const ids=await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1'));
   const e=s.exercises.find(x=>x.id==='ecc_ext'); e.perArm=true; e.sets=3; e.reps=15; e.unit='reps'; e.load='Mancuerna sin discos';
   const ss=s.sessions.find(x=>x.items.includes('ecc_ext')); s.logs={};
   [['2026-09-28',[12,13,12,12,11,12],null,3],['2026-10-01',[14,14,13,14,13,13],2,2],['2026-10-05',[15,15,15,14,15,15],2,1],['2026-10-08',[15,15,15,15,15,15],2.5,2]].forEach(([k,r,kg,ef])=>{
     s.logs[k]={done:{ecc_ext:true},session:ss.id,reps:{ecc_ext:r},loads:{ecc_ext:'Mancuerna sin discos'},effort:{ecc_ext:ef}}; if(kg) s.logs[k].kgs={ecc_ext:kg}; });
   s.logs['2026-10-10']={done:{},session:ss.id};
   localStorage.setItem('fibra-state-v1',JSON.stringify(s)); return {sess:ss.id, other:ss.items.find(x=>x!=='ecc_ext')}; });
 await p.reload(); await p.waitForTimeout(300);
 await p.locator('.thumb[data-detail="ecc_ext"]').first().click(); await p.waitForTimeout(400);
 const prog=p.locator('#prog');
 ok(await prog.locator('.chart').count()===2,'dos gráficas separadas: peso y repeticiones');
 const t1=await prog.locator('.ctitle').first().innerText(); ok(/Peso/.test(t1) && /2,5 kg/.test(t1) && /empezaste con 2 kg/.test(t1),'título del peso: '+t1);
 const t2=await prog.locator('.ctitle').nth(1).innerText(); ok(/Repeticiones por serie/.test(t2) && /izq\. 15, der\. 15/.test(t2),'título de reps: '+t2);
 ok(await prog.locator('.chart').first().locator('circle').count()===3,'el peso solo grafica los días con kg (3 de 4)');
 ok(await prog.locator('.chart').nth(1).locator('svg[role=img] rect').count()===4 && await prog.locator('.chart').nth(1).locator('svg[role=img] circle').count()===4,'reps: der e izq, 4 días cada uno');
 ok(/meta 15/.test(await prog.locator('.chart').nth(1).innerText()),'línea de meta');
 ok(await prog.locator('.plist li').count()===4,'lista de las últimas veces');
 const li0=await prog.locator('.plist li').first().innerText(); ok(/Mancuerna sin discos · 2,5 kg/.test(li0) && /bien/.test(li0),'la última vez con carga y kg: '+li0.replace(/\n/g,' '));
 await prog.scrollIntoViewIfNeeded(); await p.screenshot({path:__dirname+'/shots/progreso-ejercicio.png'});
 await p.emulateMedia({colorScheme:'dark'}); await p.waitForTimeout(100); await p.screenshot({path:__dirname+'/shots/progreso-ejercicio-dark.png'}); await p.emulateMedia({colorScheme:'light'});
 await p.locator('#sheet [data-close]').click(); await p.waitForTimeout(450);
 // cambiar la carga con kg durante la sesión de hoy
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); s.exercises.find(x=>x.id==='ecc_ext').load='Mancuerna de 3 kg'; localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await p.reload(); await p.waitForTimeout(300);
 await p.locator('.thumb[data-detail="ecc_ext"]').first().click(); await p.waitForTimeout(400);
 if (await p.locator('#flow [data-loadedit]').count()===0){ ok(false,'el ejercicio no está en la sesión de hoy'); }
 await p.locator('#flow [data-loadedit]').click(); await p.waitForTimeout(100);
 ok(await p.locator('#kg-in').count()===1,'campo de kg al cambiar la carga');
 ok(await p.locator('#kg-in').inputValue()==='3','si el texto dice "3 kg", el campo se precarga');
 await p.locator('#load-in').fill('Mancuerna sin discos');
 await p.screenshot({path:__dirname+'/shots/carga-kg.png'});
 await p.locator('#kg-in').fill('3,5'); await p.locator('[data-loadsave]').click(); await p.waitForTimeout(150);
 let st=await ST(p), e=st.exercises.find(x=>x.id==='ecc_ext');
 ok(e.kg===3.5 && e.load==='Mancuerna sin discos','kg guardado aparte del texto');
 ok(e.loadHistory.slice(-1)[0].kg===3.5 && e.loadHistory.slice(-1)[0].d==='2026-10-10','historial de cargas con kg');
 ok(/Mancuerna sin discos · 3,5 kg/.test(await p.locator('#flow .loadline').innerText()),'la línea de carga muestra el kg');
 await p.locator('#flow [data-setdone]').click(); await p.waitForTimeout(150);
 st=await ST(p); ok(st.logs['2026-10-10'].kgs && st.logs['2026-10-10'].kgs.ecc_ext===3.5,'al hacer la serie se anota el kg del día');
 ok(await p.locator('#prog .chart').first().locator('circle').count()===4,'la gráfica de peso suma hoy');
 // editar un día pasado con kg
 await p.locator('#sheet [data-close]').click(); await p.waitForTimeout(450);
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(300);
 await p.locator('[data-editday="2026-10-08"]').click(); await p.waitForTimeout(400);
 ok(await p.locator('[data-pkg="ecc_ext"]').inputValue()==='2,5','el día pasado muestra su kg');
 await p.locator('[data-pkg="ecc_ext"]').fill('3'); await p.locator('#e-save').click(); await p.waitForTimeout(450);
 st=await ST(p); ok(st.logs['2026-10-08'].kgs && st.logs['2026-10-08'].kgs.ecc_ext===3,'kg al editar un día pasado');
 // ejercicio sin historial
 await p.locator('[data-tab="hoy"]').click(); await p.waitForTimeout(300);
 await p.locator('.thumb[data-detail="'+ids.other+'"]').first().click(); await p.waitForTimeout(400);
 ok(/Cuando lo hagas/.test(await p.locator('#prog').innerText()),'sin historial: mensaje');
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
