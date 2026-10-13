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
server.listen(8786,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 const back=async()=>{ await p.evaluate(()=>history.back()); await p.waitForTimeout(250); };
 const sheetOpen=()=>p.evaluate(()=>document.querySelector('#scrim').classList.contains('open'));
 const onApp=()=>p.url().startsWith('http://localhost:8786/') && !p.url().endsWith('/start');
 const curTab=()=>p.evaluate(()=>document.querySelector('.tabs [aria-current=page]').dataset.tab);
 await p.goto('http://localhost:8786/start'); await p.goto('http://localhost:8786/'); await p.waitForTimeout(300);
 // 1 detail -> back closes
 await p.locator('.thumb[data-detail]').first().click(); await p.waitForTimeout(200);
 ok(await sheetOpen(),'detail open'); await back();
 ok(onApp() && !(await sheetOpen()),'back closes detail, stays in app');
 // 2 Cerrar then back exits (no stale entry)
 await p.locator('.thumb[data-detail]').first().click(); await p.waitForTimeout(200);
 await p.locator('[data-close]').first().click(); await p.waitForTimeout(300);
 ok(!(await sheetOpen()),'Cerrar closes');
 // 3 detail -> editar -> back -> detail -> back -> closed
 await p.locator('.thumb[data-detail]').first().click(); await p.waitForTimeout(200);
 await p.locator('.sheet [data-edit]').last().click(); await p.waitForTimeout(200);
 ok(await p.locator('#f-name').count()===1,'edit form open'); await back();
 ok(await p.locator('#stage-svg').count()===1,'back from edit returns to detail');
 await back(); ok(onApp() && !(await sheetOpen()),'second back closes');
 // 4 tabs
 await p.locator('[data-tab="rutina"]').click(); await p.waitForTimeout(150);
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(150);
 await back(); ok(onApp() && (await curTab())==='hoy','back from Progreso goes to Hoy');
 // 5 session editor nested
 await p.locator('[data-tab="rutina"]').click(); await p.waitForTimeout(150);
 await p.locator('[data-editsess]').first().click(); await p.waitForTimeout(150);
 await p.locator('[data-sx="0"]').click(); await p.waitForTimeout(150);
 ok(await p.locator('[data-back]').count()===1,'exercise form from session');
 await back(); ok(await p.locator('[data-savesess]').count()===1,'back -> session editor');
 await back(); ok(!(await sheetOpen()) && (await curTab())==='rutina','back -> closes editor, stays Rutina');
 await back(); ok((await curTab())==='hoy' && onApp(),'back -> Hoy');
 // 6 Rutina, open detail via linkish, close via Cerrar, Hoy tab button, then back exits
 await p.locator('[data-tab="rutina"]').click(); await p.waitForTimeout(150);
 await p.locator('.sl .linkish').first().click(); await p.waitForTimeout(150);
 await p.locator('[data-close]').first().click(); await p.waitForTimeout(200);
 ok((await curTab())==='rutina' && !(await sheetOpen()),'closed on Rutina');
 await p.locator('[data-tab="hoy"]').click(); await p.waitForTimeout(300);
 await back(); await p.waitForTimeout(300);
 ok(p.url().endsWith('/start'),'from Hoy, back exits the app: '+p.url());
 // 7 reload with sheet open then back
 await p.goto('http://localhost:8786/'); await p.waitForTimeout(300);
 await p.locator('.thumb[data-detail]').first().click(); await p.waitForTimeout(150);
 await p.reload(); await p.waitForTimeout(500);
 ok(!(await sheetOpen()),'after reload no sheet');
 await back(); await p.waitForTimeout(300); console.log('after reload+back url', p.url());
 // 8 timer running then back closes and stops
 await p.goto('http://localhost:8786/'); await p.waitForTimeout(300);
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
