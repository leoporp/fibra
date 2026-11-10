const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http=require('http'),fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('window.FIBRA_CONFIG={url:"",key:""};');}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
const ST=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('fibra-state-v1')));
const pain=(p,px,f,v)=>p.locator('#'+px+'-'+f+' [data-painv="'+f+':'+v+'"]').click();
const wake=async p=>{ await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(300); };
// Si cambia el día con un registro sin guardar, Hoy pregunta Guardar / Revisar / Descartar (antes se perdía).
server.listen(8811,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-10T21:00:00-05:00')});
 await p.goto('http://localhost:8811/'); await p.waitForTimeout(300);
 // botones: tocar el mismo número otra vez lo deja sin registrar
 await pain(p,'p','painL',4); ok(await p.locator('#p-painL .pb.on').innerText()==='4','botón 4 marcado');
 await pain(p,'p','painL',4); ok(await p.locator('#p-painL .pb.on').count()===0 && /Sin registrar/.test(await p.locator('#o-painL').innerText()),'tocar otra vez lo quita');
 ok(await p.locator('#p-painL .pb').count()===11,'11 botones del 0 al 10');
 const box0=await p.locator('#p-painL [data-painv="painL:0"]').boundingBox(), box6=await p.locator('#p-painL [data-painv="painL:6"]').boundingBox();
 ok(box6.y > box0.y + 20 && box0.width >= 44,'dos filas y botones de al menos 44 px ('+Math.round(box0.width)+')');
 await pain(p,'p','painL',3); await pain(p,'p','painR',2); await p.locator('[data-med="ice"]').click();
 ok(await p.locator('.notice.rescue').count()===0,'sin aviso el mismo día');
 // pasa la medianoche (y las 4 a. m.) con la app abierta
 await p.clock.setSystemTime(new Date('2026-10-11T09:00:00-05:00')); await wake(p);
 const n=p.locator('.notice.rescue');
 ok(await n.count()===1,'aparece el aviso al cambiar el día');
 const txt=await n.innerText(); ok(/de ayer/.test(txt) && /Dolor izq\. 3, der\. 2/.test(txt) && /hielo/.test(txt),'el aviso dice qué quedó: '+txt.replace(/\n/g,' | '));
 ok(await p.locator('#p-painL .pb.on').count()===0,'el registro de hoy arranca vacío');
 await p.evaluate(()=>scrollTo(0,0)); await p.screenshot({path:__dirname+'/shots/rescate.png'});
 // tocar el registro de hoy no borra el rescatado
 await pain(p,'p','painL',1); await p.reload(); await p.waitForTimeout(300);
 ok(await p.locator('.notice.rescue').count()===1,'sigue después de tocar el registro de hoy y recargar');
 await p.locator('[data-orph="save"]').click(); await p.waitForTimeout(150);
 let st=await ST(p), y=st.logs['2026-10-10'];
 ok(y && y.painL===3 && y.painR===2 && y.ice===true && y.savedAt,'Guardar lo deja en su día '+JSON.stringify(y));
 ok(await p.locator('.notice.rescue').count()===0,'el aviso se va');
 ok(await p.locator('#p-painL .pb.on').innerText()==='1','el borrador de hoy sigue');
 // Revisar: abre el día con lo que quedó y se guarda desde ahí
 await p.clock.setSystemTime(new Date('2026-10-12T10:00:00-05:00')); await p.reload(); await p.waitForTimeout(300);
 ok(await p.locator('.notice.rescue').count()===1,'aviso para el 11');
 await p.locator('[data-orph="review"]').click(); await p.waitForTimeout(400);
 ok(await p.locator('#e-painL .pb.on').innerText()==='1','Revisar abre el día con lo que quedó');
 await pain(p,'e','painR',2); await p.locator('#e-save').click(); await p.waitForTimeout(450);
 st=await ST(p); ok(st.logs['2026-10-11'] && st.logs['2026-10-11'].painL===1 && st.logs['2026-10-11'].painR===2,'guardado desde Revisar');
 ok(await p.locator('.notice.rescue').count()===0,'aviso resuelto');
 // Revisar y cerrar sin guardar: no se pierde
 await pain(p,'p','painL',5);
 await p.clock.setSystemTime(new Date('2026-10-13T10:00:00-05:00')); await p.reload(); await p.waitForTimeout(300);
 await p.locator('[data-orph="review"]').click(); await p.waitForTimeout(400); await p.locator('#sheet [data-close]').click(); await p.waitForTimeout(450);
 ok(await p.locator('.notice.rescue').count()===1,'cerrar sin guardar no lo pierde');
 // Descartar
 await p.locator('[data-orph="drop"]').click(); await p.waitForTimeout(150);
 st=await ST(p); ok(!st.logs['2026-10-12'] || st.logs['2026-10-12'].painL===undefined,'Descartar no guarda nada');
 ok(await p.locator('.notice.rescue').count()===0,'aviso descartado');
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
