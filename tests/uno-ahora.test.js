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
server.listen(8799,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-28T10:00:00-05:00')});
 await p.goto('http://localhost:8799/'); await p.waitForTimeout(300);
 const one=p.locator('[data-one]');
 ok(await one.count()===1,'botón "Hacer uno ahora" visible');
 const first=await one.getAttribute('data-one');
 ok(/Hacer uno ahora: .+ · unos \d+ min/.test(await one.innerText()),'texto del botón: '+await one.innerText());
 await p.screenshot({path:__dirname+'/shots/uno_hoy.png'});
 await one.click(); await p.waitForTimeout(250);
 ok(/Solo este ejercicio/.test(await p.locator('#flow').innerText()),'la hoja dice que es solo este');
 ok(!/siguiente|seguir/i.test(await p.locator('#flow [data-done]').first().innerText()),'el botón de hecho no habla de seguir');
 await p.screenshot({path:__dirname+'/shots/uno_flujo.png'});
 await p.locator('#flow [data-done]').first().click(); await p.waitForTimeout(450);
 let st=await ST(p); ok(st.logs['2026-10-28'].done[first]===true,'quedó marcado');
 ok(!(await p.locator('#flow').count()) || !(await p.locator('#flow').isVisible()),'volvió a Hoy sin abrir el siguiente');
 const next=await p.locator('[data-one]').getAttribute('data-one');
 ok(next && next!==first,'ahora propone otro: '+next);
 // completar por series en modo "uno": al final muestra "Volver a Hoy"
 await p.locator('[data-one]').click(); await p.waitForTimeout(250);
 const fl=await p.locator('#flow').innerText();
 console.log('flow:', fl.replace(/\n/g,' | ').slice(0,200));
 // flujo normal sigue encadenando
 await p.locator('[data-close]').first().click(); await p.waitForTimeout(400);
 await p.locator('[data-start]').click(); await p.waitForTimeout(250);
 const cur=(await p.locator('#flow').innerText()).match(/Ejercicio (\d+) de/)[1];
 await p.locator('#flow [data-done]').first().click(); await p.waitForTimeout(300);
 const after=((await p.locator('#flow').innerText()).match(/Ejercicio (\d+) de/)||[])[1];
 ok(after && after!==cur,'la sesión normal sigue pasando al siguiente');
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
