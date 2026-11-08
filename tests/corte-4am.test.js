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
// El día de Fibra termina a las 4 a. m.: marcar a las 12:30 a. m. cuenta para el día anterior; a las 4:30 a. m. ya es el día nuevo.
server.listen(8801,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-11-08T00:30:00-05:00')});
 await p.goto('http://localhost:8801/'); await p.waitForTimeout(300);
 const one=p.locator('[data-one]'); const first=await one.getAttribute('data-one');
 await one.click(); await p.waitForTimeout(250);
 await p.locator('#flow [data-done]').first().click(); await p.waitForTimeout(450);
 let st=await ST(p);
 ok(st.logs['2026-11-07'] && st.logs['2026-11-07'].done[first]===true,'a las 12:30 a. m. cuenta para el 7 (ayer)');
 ok(!st.logs['2026-11-08'],'no creó registro del 8');
 await p.clock.setSystemTime(new Date('2026-11-08T04:30:00-05:00'));
 await p.reload(); await p.waitForTimeout(300);
 await p.locator('[data-one]').click(); await p.waitForTimeout(250);
 await p.locator('#flow [data-done]').first().click(); await p.waitForTimeout(450);
 st=await ST(p);
 ok(st.logs['2026-11-08'] && Object.keys(st.logs['2026-11-08'].done||{}).length===1,'a las 4:30 a. m. ya cuenta para el 8');
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
