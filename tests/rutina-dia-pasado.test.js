// Agregar la rutina de un día pasado (se le olvidó marcarla ese día)
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
server.listen(8802,async()=>{
 const b=await chromium.launch(); const errors=[];
 for (const scheme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2,colorScheme:scheme}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-28T08:00:00-05:00')});
 await p.goto('http://localhost:8802/'); await p.waitForTimeout(300);
 // registro de antier (26) sin ejercicios; el día 20 es el más viejo
 await p.locator('[data-toggle]').first().click(); await p.locator('[data-toggle]').first().click(); await p.waitForTimeout(100);
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); delete s.logs['2026-10-28']; s.logs['2026-10-26']={done:{},painL:2,painR:3,savedAt:1}; s.logs['2026-10-20']={done:{}}; localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await p.reload(); await p.waitForTimeout(300);
 let st=await ST(p); const s0=st.sessions[0], s1=st.sessions[1];
 const hoyChip=()=>p.locator('[data-pick].on').getAttribute('data-pick');
 ok(await hoyChip()===s0.id,'sin historial, hoy toca la primera sesión');
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(200);
 // ayer (27): sin registro
 await p.locator('.dayrow').nth(1).click(); await p.waitForTimeout(200);
 ok(await p.locator('#pastex [data-pex]').count()===s0.items.length,'muestra los ejercicios de la sesión que tocaba');
 ok(await p.locator('#e-save').isDisabled(),'guardar apagado al abrir');
 // cambia a la sesión B y marca 3 ejercicios
 await p.locator('[data-pexpick="'+s1.id+'"]').click();
 ok(await p.locator('#pastex [data-pex]').count()===s1.items.length,'cambia a la sesión B');
 for (let i=0;i<3;i++) await p.locator('#pastex [data-pex]').nth(i).click();
 const e0=s1.items[0];
 await p.locator('[data-pload="'+e0+'"]').fill('Mancuerna 3 kg');
 await p.locator('[data-peff="'+e0+':2"]').click();
 ok(/Marcaste 3 de/.test(await p.locator('#pastex').innerText()),'cuenta los marcados');
 ok(!(await p.locator('#e-save').isDisabled()),'guardar activo con cambios');
 await p.screenshot({path:__dirname+'/shots/'+scheme+'_rutina_pasada.png'});
 await p.locator('#e-save').click(); await p.waitForTimeout(300);
 const toast=await p.locator('#toast').innerText().catch(()=>'');
 console.log('toast:', toast);
 st=await ST(p); const l=st.logs['2026-10-27'];
 ok(l && l.session===s1.id && Object.keys(l.done).filter(k=>l.done[k]).length===3,'guardó sesión B con 3 hechos');
 ok(l.loads[e0]==='Mancuerna 3 kg' && l.effort[e0]===2,'guardó carga y esfuerzo');
 ok(!l.painL && !l.ice,'no inventó registro del día');
 ok(/cumplido|guardados|nivel|Meta/.test(toast),'avisa al guardar');
 const rows=await p.locator('.dayrow').allInnerTexts();
 ok(/3 de \d+ ejercicios/.test(rows[1]) && /Editar/.test(rows[1]),'la fila de ayer muestra los ejercicios');
 
 // reabrir: viene prellenado; desmarcar uno
 await p.locator('.dayrow').nth(1).click(); await p.waitForTimeout(200);
 ok(await p.locator('#pastex [data-pex].on').count()===3,'reabre con lo marcado');
 ok(await p.locator('[data-pload="'+e0+'"]').inputValue()==='Mancuerna 3 kg','reabre con la carga');
 await p.locator('[data-pex="'+e0+'"]').click(); await p.locator('#e-save').click(); await p.waitForTimeout(200);
 st=await ST(p); ok(!st.logs['2026-10-27'].done[e0] && !st.logs['2026-10-27'].loads[e0],'desmarcar borra hecho y carga');
 // antier tenía registro: lo conserva al agregar ejercicios
 await p.locator('.dayrow').nth(2).click(); await p.waitForTimeout(200);
 await p.locator('#pastex [data-pex]').first().click(); await p.locator('#e-save').click(); await p.waitForTimeout(200);
 st=await ST(p); ok(st.logs['2026-10-26'].painL===2 && Object.keys(st.logs['2026-10-26'].done).length===1,'conserva el dolor y agrega el ejercicio');
 await p.locator('[data-close]').first().click().catch(()=>{}); await p.locator('[data-tab="hoy"]').click(); await p.waitForTimeout(300);
 ok(await hoyChip()===st.sessions[2].id,'hoy toca la sesión siguiente a la agregada');
 await ctx.close();
 }
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
