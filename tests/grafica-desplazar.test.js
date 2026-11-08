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
// 70 días de historia: la gráfica deja ir hacia atrás, volver a hoy y cambiar el rango.
server.listen(8803,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-11-08T18:00:00-05:00')});
 await p.goto('http://localhost:8803/'); await p.waitForTimeout(300);
 await p.locator('[data-toggle]').first().click(); await p.waitForTimeout(200);
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); const pad=n=>String(n).padStart(2,'0'); const base=new Date(2026,10,8);
   for(let i=0;i<70;i++){ const d=new Date(base); d.setDate(base.getDate()-i); const k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
     s.logs[k]=Object.assign(s.logs[k]||{done:{}},{painL:i%5,painR:(i+2)%6,ice:i%3===0,savedAt:1}); }
   localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await p.reload(); await p.waitForTimeout(300);
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(500);
 const span=()=>p.locator('.cspan').innerText();
 ok(/– hoy$/.test(await span()),'arranca terminando hoy: '+await span());
 ok(await p.locator('[data-pday]').count()===28,'28 días');
 ok(await p.locator('[data-cpan="-1"]').isDisabled(),'no se puede ir al futuro');
 await p.locator('[data-cpan="1"]').click(); await p.waitForTimeout(400);
 ok(!/hoy/.test(await span()),'flecha atrás: otra ventana '+await span());
 ok(await p.locator('[data-cnow]').count()===1,'aparece Volver a hoy');
 await p.locator('#chart').scrollIntoViewIfNeeded(); await p.screenshot({path:__dirname+'/shots/grafica_atras.png'});
 await p.locator('[data-pday="10"]').click({force:true}); await p.waitForTimeout(80);
 ok(/izquierdo \d+/.test(await p.locator('#pday').innerText()),'tocar un día funciona en la ventana vieja');
 await p.locator('[data-cnow]').click(); await p.waitForTimeout(300);
 ok(/– hoy$/.test(await span()),'Volver a hoy');
 // deslizar el dedo hacia la derecha = días anteriores
 const bb=await p.locator('#chart svg').boundingBox();
 await p.mouse.move(bb.x+80,bb.y+60); await p.mouse.down(); await p.mouse.move(bb.x+200,bb.y+64,{steps:6}); await p.mouse.up(); await p.waitForTimeout(400);
 ok(!/hoy/.test(await span()),'deslizar lleva a días anteriores');
 const bb2=await p.locator('#chart svg').boundingBox();
 await p.mouse.move(bb2.x+220,bb2.y+60); await p.mouse.down(); await p.mouse.move(bb2.x+90,bb2.y+62,{steps:6}); await p.mouse.up(); await p.waitForTimeout(400);
 ok(/– hoy$/.test(await span()),'deslizar al otro lado vuelve');
 // rangos
 await p.locator('[data-crange="91"]').click(); await p.waitForTimeout(300);
 ok(await p.locator('[data-pday]').count()===91,'3 meses');
 await p.locator('[data-crange="all"]').click(); await p.waitForTimeout(300);
 ok(await p.locator('[data-pday]').count()===70,'Todo: desde el primer registro');
 ok(await p.locator('[data-cpan]').count()===0,'en Todo no hay flechas');
 await p.locator('#chart').scrollIntoViewIfNeeded(); await p.screenshot({path:__dirname+'/shots/grafica_todo.png'});
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
