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
server.listen(8791,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-10T21:00:00-05:00')});
 await p.goto('http://localhost:8791/'); await p.waitForTimeout(300);
 await p.locator('#p-painL').fill('2'); await p.locator('#p-painR').fill('3');
 ok(/Leve: apareció con algún esfuerzo/.test(await p.locator('#p-a-painL').innerText()),'anchor updates for 2');
 ok(/Molesto/.test(await p.locator('#p-a-painR').innerText()),'anchor updates for 3');
 await p.locator('[data-med="ice"]').click(); await p.locator('[data-breaks="4"]').click();
 await p.locator('#d-save').click(); await p.waitForTimeout(100);
 ok(await p.locator('.regmini').count()===1,'compact after save');
 const mini=await p.locator('.regmini').innerText(); console.log(mini); ok(/Dolor izq\. 2, der\. 3 · hielo · pausas: casi todas/.test(mini),'mini summary');
 await p.locator('.regmini').scrollIntoViewIfNeeded(); await p.screenshot({path:__dirname+'/shots/L16_regmini.png'});
 await p.locator('[data-regopen]').click(); await p.waitForTimeout(100);
 ok(await p.locator('#p-painL').inputValue()==='2','open shows form with values');
 await p.locator('#p-painL').fill('1'); await p.reload(); await p.waitForTimeout(200);
 ok(await p.locator('#p-painL').count()===1,'dirty draft keeps form open after reload');
 await p.locator('#d-save').click(); await p.waitForTimeout(100); ok(await p.locator('.regmini').count()===1,'compact again');
 // guide from Hoy
 await p.locator('[data-regopen]').click(); await p.locator('[data-painguide]').click(); await p.waitForTimeout(100);
 ok(await p.locator('.guide').count()===2,'guide open'); await p.screenshot({path:__dirname+'/shots/L17_guide.png'});
 await p.locator('[data-guideback]').click();
 // Progreso order
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(100);
 const hs=await p.locator('h2').allInnerTexts(); console.log(hs); ok(hs[0].startsWith('Dolor')&&hs.indexOf('Tu fondo')>hs.indexOf('Tus registros'),'order');
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
