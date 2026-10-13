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
const ST=()=>JSON.parse(localStorage.getItem('fibra-state-v1'));
server.listen(8787,async()=>{
 const b=await chromium.launch(); const errors=[];
 for (const scheme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2,colorScheme:scheme}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-10T14:00:00-05:00')});
 await p.goto('http://localhost:8787/start'); await p.goto('http://localhost:8787/'); await p.waitForTimeout(300);
 // seed: yesterday log with pain, today saved at 0 via UI
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')||'null'); });
 await p.locator('#p-painL').fill('0'); await p.locator('#p-painR').fill('0'); await p.locator('#d-save').click();
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); s.logs['2026-10-09']={done:{},painL:2,painR:4,ice:true,breaks:3,note:'teclado',savedAt:1}; s.logs['2026-10-01']={done:{}}; localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await p.reload(); await p.waitForTimeout(300);
 const draftBefore=await p.evaluate(()=>localStorage.getItem('fibra-draft'));
 // make an unsaved change on Hoy to ensure isolation
 await p.locator('[data-regopen]').click(); await p.locator('[data-med="heat"]').first().click();
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(200);
 const rows=await p.locator('.dayrow').allInnerTexts(); console.log(scheme, 'rows', rows.length, JSON.stringify(rows.slice(0,3)));
 ok(rows.length===7,'7 rows by default');
 ok(/Hoy/.test(rows[0]) && /Dolor izq\. 0, der\. 0/.test(rows[0]),'today row shows 0s');
 ok(/Ayer/.test(rows[1]) && /hielo/.test(rows[1]) && /pausas: a medias/.test(rows[1]),'yesterday summary');
 ok(await p.locator('[data-morehist]').count()===1,'ver días anteriores shown (log on Oct 1)');
 await p.locator('.dayrow').nth(1).scrollIntoViewIfNeeded(); await p.screenshot({path:__dirname+'/shots/'+scheme+'_hist.png'});
 // edit yesterday
 await p.locator('.dayrow').nth(1).click(); await p.waitForTimeout(200);
 ok(await p.locator('#e-painL').inputValue()==='2','sheet prefilled painL');
 ok(await p.locator('#e-save').isDisabled(),'save disabled initially');
 await p.locator('#e-painL').fill('5');
 ok(/Cambios sin guardar/.test(await p.locator('#e-status').innerText()),'dirty');
 await p.locator('.sheet [data-med="heat"]').click(); await p.locator('.sheet [data-breaks="5"]').click(); await p.locator('#e-note').fill('teclado y mouse');
 // Hoy controls untouched by sheet
 const hoyHeat=await p.evaluate(()=>JSON.parse(localStorage.getItem('fibra-draft')||'null'));
 await p.screenshot({path:__dirname+'/shots/'+scheme+'_editday.png'});
 await p.locator('#e-save').click(); await p.waitForTimeout(100);
 const y=await p.evaluate(()=>JSON.parse(localStorage.getItem('fibra-state-v1')).logs['2026-10-09']);
 ok(y.painL===5&&y.painR===4&&y.heat===true&&y.ice===true&&y.breaks===5&&y.note==='teclado y mouse','yesterday saved '+JSON.stringify(y));
 ok(/Registro de ayer guardado/.test(await p.locator('#toast').innerText()),'toast '+await p.locator('#toast').innerText());
 ok(!(await p.evaluate(()=>document.querySelector('#scrim').classList.contains('open'))),'sheet closed after save');
 const t=await p.evaluate(()=>JSON.parse(localStorage.getItem('fibra-state-v1')).logs['2026-10-10']);
 ok(t.heat===false && t.painL===0,'today log untouched '+JSON.stringify(t));
 ok(hoyHeat && hoyHeat.heat===true,'today draft still has unsaved heat');
 // add a day without data (Oct 7) → +5
 const r7=p.locator('.dayrow[data-editday="2026-10-07"]'); await r7.click(); await p.waitForTimeout(150);
 ok(await p.locator('[data-clearday]').count()===0,'no delete button for empty day');
 await p.locator('#e-painR').fill('3'); await p.locator('#e-save').click(); await p.waitForTimeout(100);
 ok(/\+5/.test(await p.locator('#toast').innerText()),'+5 on new day: '+await p.locator('#toast').innerText());
 // delete yesterday
 await p.locator('.dayrow[data-editday="2026-10-09"]').click(); await p.waitForTimeout(150);
 await p.locator('[data-clearday]').click(); await p.locator('[data-clearday]').click(); await p.waitForTimeout(100);
 const y2=await p.evaluate(()=>JSON.parse(localStorage.getItem('fibra-state-v1')).logs['2026-10-09']);
 ok(y2.painL===undefined&&!y2.ice&&!y2.note,'yesterday cleared '+JSON.stringify(y2));
 // back closes the edit sheet
 await p.locator('.dayrow[data-editday="2026-10-08"]').click(); await p.waitForTimeout(150);
 await p.evaluate(()=>history.back()); await p.waitForTimeout(250);
 ok(!(await p.evaluate(()=>document.querySelector('#scrim').classList.contains('open'))) && p.url().endsWith(':8787/'),'back closes edit sheet');
 // more days
 await p.locator('[data-morehist]').click(); await p.waitForTimeout(100);
 const n2=await p.locator('.dayrow').count(); ok(n2===10,'shows back to Oct 1: '+n2);
 // today row goes to Hoy registro
 await p.locator('.dayrow[data-editday="2026-10-10"]').click(); await p.waitForTimeout(250);
 ok(await p.evaluate(()=>document.querySelector('.tabs [aria-current=page]').dataset.tab)==='hoy','today → Hoy tab');
 await ctx.close(); }
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
