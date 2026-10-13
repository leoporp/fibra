const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http=require('http'),fs=require('fs'),path=require('path');
fs.mkdirSync(__dirname+'/shots',{recursive:true});
const DIR=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('window.FIBRA_CONFIG={url:"",key:""};');}
 if(u==='/start'){res.writeHead(200,{'Content-Type':'text/html'});return res.end('<p>start</p>');}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
server.listen(8794,async()=>{
 const b=await chromium.launch(); const errors=[];
 for (const scheme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2,colorScheme:scheme}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8794/start'); await p.goto('http://localhost:8794/'); await p.waitForTimeout(300);
 ok(/más 3 de calentamiento/.test(await p.locator('.sessmeta').innerText()),'sessmeta mentions warm-up');
 await p.locator('[data-start]').click(); await p.waitForTimeout(150);
 const items=await p.locator('.chkrow').allInnerTexts(); console.log(scheme, JSON.stringify(items));
 ok(items.includes('Mancuerna sin discos')&&items.includes('Toalla de mano')&&items.includes('Banda grande')&&items.some(x=>/Audífonos/.test(x))&&items.some(x=>/Mesa o tu muslo/.test(x)),'gear list for session A');
 ok(await p.locator('.warm li').count()===5,'warm-up steps');
 await p.locator('.chkrow').first().click(); ok(await p.locator('.chkrow').first().getAttribute('aria-pressed')==='true','tick item');
 await p.screenshot({path:__dirname+'/shots/'+scheme+'_pre.png'});
 await p.locator('.sheet').evaluate(e=>e.scrollTo(0,e.scrollHeight)); await p.screenshot({path:__dirname+'/shots/'+scheme+'_pre2.png'});
 // back closes
 await p.evaluate(()=>history.back()); await p.waitForTimeout(250);
 ok(!(await p.evaluate(()=>document.querySelector('#scrim').classList.contains('open'))) && p.url().endsWith('8794/'),'back closes pre-sheet');
 await p.locator('[data-start]').click(); await p.locator('[data-gostart]').click(); await p.waitForTimeout(200);
 ok(await p.locator('#stage-svg').count()===1 && await p.locator('.pill.play').count()===1,'gostart opens first exercise with play note');
 await p.locator('[data-done]').first().click(); await p.waitForTimeout(150); await p.locator('[data-close]').first().click(); await p.waitForTimeout(150);
 await p.locator('[data-start]').click(); await p.waitForTimeout(150);
 ok(await p.locator('#stage-svg').count()===1 && await p.locator('.chkrow').count()===0,'Seguir con goes straight to exercise');
 await p.locator('[data-close]').first().click();
 await p.locator('[data-tab="rutina"]').click(); const msg=await p.locator('#msg').inputValue(); ok(/caliento unos 3 minutos/.test(msg),'santiago msg warm-up');
 await ctx.close(); }
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
