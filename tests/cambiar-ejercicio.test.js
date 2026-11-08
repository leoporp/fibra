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
const sessIds=async p=>(await p.locator('.ex [data-toggle]').evaluateAll(els=>els.map(e=>e.dataset.toggle)));
server.listen(8802,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2,permissions:['clipboard-read','clipboard-write']}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-11-08T18:00:00-05:00')});
 await p.goto('http://localhost:8802/'); await p.waitForTimeout(300);
 let ids=await sessIds(p); ok(ids.includes('grip'),'la sesión A tiene el agarre con toalla');
 // 1) solo hoy, con una sugerida
 await p.locator('.thumb[data-detail="grip"]').click(); await p.waitForTimeout(300);
 await p.locator('[data-swap]').click(); await p.waitForTimeout(100);
 ok(await p.locator('.fwarn').count()===0,'el agarre con toalla no es de Santiago: sin aviso');
 ok(await p.locator('[data-swpick="dbhold"]').count()===1 && await p.locator('[data-swpick="platepinch"]').count()===1,'muestra las dos sugeridas de agarre');
 await p.screenshot({path:__dirname+'/shots/swap_lista.png'});
 await p.locator('[data-swpick="dbhold"]').click(); await p.waitForTimeout(100);
 await p.screenshot({path:__dirname+'/shots/swap_alcance.png'});
 await p.locator('[data-swapply="day"]').click(); await p.waitForTimeout(400);
 let st=await ST(p);
 ok(st.logs['2026-11-08'].swap.grip==='dbhold','solo hoy: queda el cambio en el día');
 ok(st.sessions.find(s=>s.id==='sA').items.includes('grip'),'la rutina no cambió');
 const nx=st.exercises.find(e=>e.id==='dbhold'); ok(nx && nx.confirmed===false && nx.src==='ai','la sugerida queda por confirmar');
 ok(/Agarre isométrico con mancuerna/.test(await p.locator('.sheet h3').innerText()),'abre el ejercicio nuevo');
 ok(await p.locator('#stage-svg').count()===1,'tiene dibujo');
 await p.locator('[data-close]').first().click(); await p.waitForTimeout(400);
 ids=await sessIds(p); ok(ids.includes('dbhold') && !ids.includes('grip'),'Hoy muestra el reemplazo');
 // al día siguiente vuelve el original
 await p.clock.setSystemTime(new Date('2026-11-09T18:00:00-05:00')); await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('fibra-state-v1')); s.logs['2026-11-09']={done:{},session:'sA'}; localStorage.setItem('fibra-state-v1',JSON.stringify(s));});
 await p.reload(); await p.waitForTimeout(300);
 ids=await sessIds(p); ok(ids.includes('grip') && !ids.includes('dbhold'),'al otro día vuelve el original');
 // 2) en la rutina, creando uno nuevo por nombre
 await p.locator('.thumb[data-detail="grip"]').click(); await p.waitForTimeout(300);
 await p.locator('[data-swap]').click(); await p.locator('#swq').fill('Apretar plastilina'); await p.waitForTimeout(80);
 ok(await p.locator('#swnew').isVisible(),'ofrece crear uno nuevo');
 await p.locator('#swnew').click(); await p.waitForTimeout(80);
 await p.locator('[data-swapply="routine"]').click(); await p.waitForTimeout(400);
 st=await ST(p); const ne=st.exercises.find(e=>e.name==='Apretar plastilina');
 ok(ne && ne.sets===2 && ne.reps===10 && ne.zone==='Agarre y dedos','el nuevo copia series, reps y zona');
 ok(!st.sessions.some(s=>s.items.includes('grip')) && st.sessions.filter(s=>s.items.includes(ne.id)).length===2,'reemplazado en las sesiones A y C');
 ok(st.exercises.some(e=>e.id==='grip'),'el original queda en la biblioteca');
 ok(/no tiene dibujo/.test(await p.locator('.sheet').innerText()),'avisa que no tiene dibujo');
 await p.locator('.sheet [data-fichas]').click(); await p.waitForTimeout(150);
 const clip=await p.evaluate(()=>navigator.clipboard.readText()); ok(/Apretar plastilina/.test(clip),'Pedir ficha copia la lista');
 await p.locator('[data-close]').first().click(); await p.waitForTimeout(400);
 // 3) uno de Santiago avisa antes
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('fibra-state-v1')); s.exercises.find(e=>e.id==='ecc_ext').src='s'; localStorage.setItem('fibra-state-v1',JSON.stringify(s));});
 await p.reload(); await p.waitForTimeout(300);
 await p.locator('.thumb[data-detail="ecc_ext"]').click(); await p.waitForTimeout(300);
 await p.locator('[data-swap]').click(); await p.waitForTimeout(100);
 ok(/te lo recomendó Santiago/.test(await p.locator('#swapbox').innerText()),'aviso si es de Santiago');
 ok(await p.locator('[data-swpick]').count()===0,'no muestra opciones hasta confirmar');
 await p.screenshot({path:__dirname+'/shots/swap_santiago.png'});
 await p.locator('[data-swlist]').click(); await p.waitForTimeout(100);
 ok(await p.locator('[data-swpick]').count()>0,'después de confirmar sí muestra opciones');
 await p.locator('[data-close]').first().click(); await p.waitForTimeout(400);
 await p.locator('[data-tab="rutina"]').click(); await p.waitForTimeout(300);
 ok(await p.locator('.notice [data-fichas]').count()===1,'Rutina ofrece Pedir fichas');
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
