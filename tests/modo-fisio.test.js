// Modo fisio: Santiago revisa la rutina en el celular de Leo y el resumen "desde la última cita"
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
const shot=(p,n)=>p.screenshot({path:__dirname+'/shots/'+n+'.png',fullPage:false});
server.listen(8801,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-14T19:00:00-05:00')});
 await p.goto('http://localhost:8801/'); await p.waitForTimeout(300);
 await p.locator('[data-toggle]').first().click(); await p.locator('[data-toggle]').first().click(); await p.waitForTimeout(100);
 // historial de 3 semanas: esfuerzo, series incompletas, notas y una carga subida
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); const pad=n=>String(n).padStart(2,'0'); const base=new Date(2026,9,14);
   const k=i=>{const d=new Date(base); d.setDate(base.getDate()-i); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
   for(let i=1;i<=18;i++){ if(i%3===0) continue; const ss=s.sessions[i%4]; const done={}; ss.items.forEach(x=>done[x]=true);
     s.logs[k(i)]={done,session:ss.id,painL:2+(i%2),painR:3,ice:i%2===0,breaks:3,note:i===2?'mucho teclado':'',savedAt:1,
       effort:i===4?{ecc_ext:3}:{}, reps:i===5?{flex:[15,12,15,15]}:{}}; }
   const e=s.exercises.find(x=>x.id==='ecc_ext'); e.loadHistory=[{d:k(25),load:'Mancuerna sin discos'},{d:k(6),load:'Mancuerna 2 kg'}]; e.load='Mancuerna 2 kg';
   localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await p.reload(); await p.waitForTimeout(300);
 await p.locator('[data-tab="rutina"]').click(); await p.waitForTimeout(400);
 ok(await p.locator('[data-fisio]').count()===1,'botón de modo fisio en Rutina');
 await p.locator('#cita-notes').fill('Odié el de halar peso con la toalla');
 let st=await ST(p); ok(st.citaNotes==='Odié el de halar peso con la toalla','notas para la cita guardadas');
 await p.locator('[data-fisio]').click(); await p.waitForTimeout(400);
 const sheet=p.locator('#sheet');
 ok(/Hola, Santiago/.test(await sheet.innerText()),'saludo a Santiago');
 ok(/IA \(Claude\)/.test(await sheet.innerText()),'dice que parte se armó con IA');
 ok(/Odié el de halar peso/.test(await sheet.innerText()),'muestra lo que Leo quiere hablar');
 const sum=await p.locator('.cita-sum').first().innerText();
 ok(/Últimas 3 semanas/.test(sum),'sin citas: últimas 3 semanas');
 ok(/Mancuerna sin discos → Mancuerna 2 kg/.test(sum),'carga subida en el resumen: '+sum.replace(/\n/g,' | ').slice(0,400));
 ok(/difícil 1/.test(sum) && /Series incompletas/.test(sum) && /mucho teclado/.test(sum),'difícil, incompletas y notas en el resumen');
 await shot(p,'F01_fisio_top');
 // iso: de Santiago y va así
 await p.locator('[data-fsrc="iso_ext:s"]').click(); await p.locator('[data-fdec="iso_ext:ok"]').click();
 ok(await p.locator('#fc-iso_ext.ok').count()===1,'tarjeta marcada va así');
 // excéntrico: ajustar
 await p.locator('[data-fdec="ecc_ext:adj"]').click(); await p.waitForTimeout(100);
 await p.locator('[data-fs="x:ecc_ext:sets:-1"]').click();
 await p.locator('[data-fi="x:ecc_ext:load"]').fill('Mancuerna 1 kg');
 await p.locator('[data-fi="x:ecc_ext:note"]').fill('Baja en 4 segundos');
 await p.locator('#fc-ecc_ext').scrollIntoViewIfNeeded(); await shot(p,'F02_fisio_ajuste');
 // agarre con toalla: quitar
 await p.locator('[data-fdec="grip:rm"]').click();
 // agregar enrollador
 await p.locator('[data-fadd="roll"]').click(); await p.waitForTimeout(200);
 const tid=await p.locator('[id^="fa-"]').first().getAttribute('id');
 const T=tid.slice(3);
 await p.locator(`[data-fs="a:${T}:sets:1"]`).click(); await p.locator(`[data-fs="a:${T}:sets:1"]`).click();
 for(let i=0;i<3;i++) await p.locator(`[data-fs="a:${T}:reps:1"]`).click();
 await shot(p,'F03_fisio_nuevo');
 await p.locator('[data-fs="g::goal:-1"]').click();
 await p.locator('[data-fi="g::loadRule"]').fill('Cuando todo salga con dolor de 3 o menos dos semanas');
 ok(/3 de 12/.test(await p.locator('#fbar').innerText()),'barra: 3 de 12 revisados ('+(await p.locator('#fbar').innerText())+')');
 // salir y volver: no se pierde nada
 await p.locator('.sheet [data-close]').first().click(); await p.waitForTimeout(400);
 ok(/Seguir la revisión/.test(await p.locator('[data-fisio]').innerText()),'Rutina ofrece seguir la revisión');
 await p.reload(); await p.waitForTimeout(300); await p.locator('[data-tab="rutina"]').click(); await p.waitForTimeout(300);
 await p.locator('[data-fisio]').click(); await p.waitForTimeout(400);
 ok(await p.locator('#fc-iso_ext.ok').count()===1 && await p.locator('#fc-grip.rm').count()===1,'la revisión sobrevive a recargar');
 // resumen y botón atrás
 await p.locator('[data-fsum]').click(); await p.waitForTimeout(400);
 const s2=await sheet.innerText();
 ok(/Antes de guardar/.test(s2),'pantalla de resumen');
 ok(/Va así: Isométrico de extensores de muñeca \(de Santiago\)/.test(s2),'resumen: va así');
 ok(/Ajuste en Excéntrico de extensores de muñeca: 3 × 15, Mancuerna 2 kg → 2 × 15, Mancuerna 1 kg; indicación: Baja en 4 segundos/.test(s2),'resumen: ajuste');
 ok(/Se quita: Agarre con toalla/.test(s2),'resumen: quitar');
 ok(/Nuevo: Enrollador de muñeca \(2 × 3, Palo con una cuerda y un disco colgando\) en Sesión/.test(s2),'resumen: nuevo');
 ok(/Días por semana: 4 → 3/.test(s2),'resumen: días por semana');
 ok(/Quedan 9 ejercicios sin revisar/.test(s2),'avisa los que quedan sin revisar');
 await shot(p,'F04_fisio_resumen');
 await p.goBack(); await p.waitForTimeout(400);
 ok(/Modo fisio/.test(await sheet.innerText()) && await p.locator('#fc-iso_ext.ok').count()===1,'atrás vuelve a la lista sin perder nada');
 await p.locator('[data-fsum]').click(); await p.waitForTimeout(300);
 await p.locator('[data-fsave]').click(); await p.waitForTimeout(400);
 st=await ST(p);
 const ex=id=>st.exercises.find(e=>e.id===id);
 ok(ex('iso_ext').confirmed && ex('iso_ext').src==='s','iso confirmado y de Santiago');
 ok(ex('ecc_ext').sets===2 && ex('ecc_ext').load==='Mancuerna 1 kg' && ex('ecc_ext').pNote==='Baja en 4 segundos' && ex('ecc_ext').loadHistory.slice(-1)[0].load==='Mancuerna 1 kg','excéntrico ajustado');
 ok(ex('grip').retired==='2026-10-14' && !st.sessions.some(s=>s.items.includes('grip')),'agarre quitado de las sesiones');
 const roll=st.exercises.find(e=>e.name==='Enrollador de muñeca');
 ok(roll && roll.sets===2 && roll.reps===3 && roll.src==='s' && roll.confirmed && st.sessions.some(s=>s.items.includes(roll.id)),'enrollador agregado a una sesión');
 ok(st.weeklyGoal===3 && st.visits.length===1 && st.visits[0].changes.length===5 && /dolor de 3/.test(st.visits[0].loadRule),'cita guardada con cambios '+JSON.stringify([st.weeklyGoal,st.visits]));
 ok(await p.evaluate(()=>localStorage.getItem('fibra-fisio'))===null,'borrador limpio');
 ok(/Última cita guardada: 14 (de )?oct/.test(await p.locator('.item.cita').innerText()),'Rutina muestra la última cita');
 ok(/Indicación de Santiago/.test(await (async()=>{ await p.locator('.exrow .thumb[data-detail="ecc_ext"]').click(); await p.waitForTimeout(300); const t=await sheet.innerText(); await p.locator('.sheet [data-close]').first().click(); await p.waitForTimeout(300); return t; })()),'el detalle muestra la indicación');
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(400);
 ok(/La cita fue hoy/.test(await p.locator('.cita-sum').innerText()),'Progreso: la cita fue hoy');
 // al día siguiente
 await p.clock.runFor(24*3600*1000); await p.reload(); await p.waitForTimeout(300);
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(400);
 const s3=await p.locator('.cita-sum').innerText();
 ok(/Desde la cita del 14 (de )?oct: 1 día/.test(s3),'Progreso: desde la cita ('+s3.split('\n')[0]+')');
 await p.locator('.cambios summary').click(); await p.waitForTimeout(100);
 ok(/Se quita: Agarre con toalla/.test(await p.locator('.cambios').innerText()),'Progreso: qué cambió en la cita');
 await p.locator('.cita-sum').scrollIntoViewIfNeeded(); await shot(p,'F05_progreso_cita');
 ok(errors.length===0,'sin errores '+errors.join(';'));
 await b.close(); server.close();
});
