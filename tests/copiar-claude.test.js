// Botón "Copiar para Claude": arma el resumen de las últimas 4 semanas
const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();const {chromium}=PW;
const http=require('http'),fs=require('fs'),path=require('path');const DIR=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('window.FIBRA_CONFIG={url:"",key:""};');}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':u.endsWith('.js')?'text/javascript':'text/html'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
server.listen(8812,async()=>{const b=await chromium.launch();const ctx=await b.newContext({serviceWorkers:'block',permissions:['clipboard-read','clipboard-write']});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.clock.install({time:new Date('2026-10-28T17:00:00-05:00')});
 await p.goto('http://localhost:8812/');await p.waitForTimeout(300);
 await p.locator('[data-toggle]').first().click();
 await p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('fibra-state-v1'));const ss=s.sessions[1];const done={};ss.items.forEach(x=>done[x]=true);
  s.logs['2026-10-20']={done,session:ss.id,painL:3,painR:2,ice:true,breaks:3,note:'mucho teclado',reps:{[ss.items[0]]:[12,12,10,10]},loads:{[ss.items[0]]:'2 kg'},effort:{[ss.items[0]]:3}};
  s.logs['2026-09-01']={done:{},painL:9};localStorage.setItem('fibra-state-v1',JSON.stringify(s));});
 await p.reload();await p.waitForTimeout(300);
 await p.locator('[data-tab="progreso"]').click();await p.waitForTimeout(300);
 const n=await p.locator('[data-aicopy]').count();
 await p.locator('[data-aicopy]').click();await p.waitForTimeout(300);const t=await p.evaluate(()=>navigator.clipboard.readText());console.log('toast:',await p.locator('#toast').innerText());
 const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
 ok(n===1,'botón en Progreso');
 ok(/Hoy es mié, 28 de oct/.test(t) && /últimas 4 semanas \(2026-10-01 a 2026-10-28\)/.test(t),'fecha y periodo');
 ok(/Sesión B \(/.test(t) && /Sesiones B, D/.test(t),'rutina sin repetir ejercicios');
 ok(/dolor 3\/2, hielo, pausas: a medias\. Nota: "mucho teclado"/.test(t),'día con dolor, hielo, pausas y nota');
 ok(/12\/12 · 10\/10 seg, 2 kg, difícil/.test(t),'reps, carga y esfuerzo');
 ok(!/2026-09-01|dolor 9/.test(t),'no incluye días de más de 4 semanas');
 ok(/Semana del 2026-10-19: 1 de 4 días/.test(t),'resumen por semana');
 ok(errs.length===0,'no errors '+errs.join(';'));await b.close();server.close();});
