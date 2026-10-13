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
server.listen(8795,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:2}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.clock.install({time:new Date('2026-10-10T20:00:00-05:00')});
 await p.goto('http://localhost:8795/'); await p.waitForTimeout(300);
 await p.locator('[data-start]').click(); await p.locator('[data-gostart]').click(); await p.waitForTimeout(150);
 ok(/Carga: Mancuerna sin discos/.test(await p.locator('.loadline').innerText()),'load line shown');
 // right arm: 12 reps
 for(let i=0;i<3;i++) await p.locator('[data-rep="-1"]').click();
 ok(await p.locator('#rep-n').innerText()==='12' && /de 15 repeticiones, brazo derecho/.test(await p.locator('.repctl span').innerText()),'stepper 12 de 15');
 await p.screenshot({path:__dirname+'/shots/L18_reps.png'});
 await p.locator('[data-setdone]').click(); await p.waitForTimeout(50);
 ok(await p.locator('#rep-n').innerText()==='15','reset to 15 for left arm');
 await p.locator('[data-rep="-1"]').click(); await p.locator('[data-setdone]').click(); // left 14 → rest timer
 await p.clock.runFor(70000); await p.waitForTimeout(50);
 // change load inline
 await p.locator('[data-loadedit]').click(); await p.locator('#load-in').fill('Solo la mano'); await p.locator('#load-in').press('Enter'); await p.waitForTimeout(50);
 ok(/Solo la mano/.test(await p.locator('.loadline').innerText()),'load updated inline');
 let st=await ST(p); const ex=st.exercises.find(e=>e.id==='ecc_ext');
 ok(ex.load==='Solo la mano' && ex.loadHistory.slice(-1)[0].load==='Solo la mano','exercise load + history');
 ok(JSON.stringify(st.logs['2026-10-10'].reps.ecc_ext)==='[12,14]','reps recorded [12,14]: '+JSON.stringify(st.logs['2026-10-10'].reps.ecc_ext));
 ok(st.logs['2026-10-10'].loads.ecc_ext==='Solo la mano','today load updated');
 // finish rest of sets full
 for (let i=0;i<4;i++){ await p.locator('[data-setdone]').click(); await p.waitForTimeout(30); if (await p.locator('[data-skiprest]').count()) await p.locator('[data-skiprest]').click(); }
 ok(/Hoy: 12\/14 · 15\/15 · 15\/15 \(der\/izq\) repeticiones/.test(await p.locator('#flow').innerText()),'done summary: '+(await p.locator('#flow').innerText()).split('\n').slice(0,3).join(' | '));
 await p.screenshot({path:__dirname+'/shots/L19_done_summary.png'});
 // nudge blocked by incomplete reps? (needs history; just check function path no error)
 await p.locator('[data-close]').first().click();
 // pausas NA
 await p.locator('[data-breaks="0"]').click(); ok(await p.locator('[data-breaks="0"]').getAttribute('aria-pressed')==='true','NA pressed');
 await p.locator('[data-breaks="3"]').click(); ok(await p.locator('[data-breaks="0"]').getAttribute('aria-pressed')==='false' && await p.locator('[data-breaks="3"]').getAttribute('aria-pressed')==='true','switch NA→3');
 await p.locator('[data-breaks="0"]').click(); await p.locator('#d-save').click(); await p.waitForTimeout(50);
 ok(/pausas: no aplica/.test(await p.locator('.regmini').innerText()),'summary no aplica');
 st=await ST(p); ok(st.logs['2026-10-10'].breaks===0,'breaks 0 saved');
 await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(400); ok(await p.locator('.chart rect[stroke-dasharray="2 2"]').count()===1,'NA lane cell');
 ok(!/pausas activas \d/.test(await p.locator('.chart').innerText()),'NA excluded from average');
 // next day: last time shown
 await p.clock.runFor(24*3600*1000); await p.reload(); await p.waitForTimeout(300);
 await p.locator('[data-tab="rutina"]').click(); const lib=await p.locator('.item:has(.exrow)', {hasText:'Excéntrico de extensores'}).first().innerText(); console.log(lib); ok(/Última vez, 10 (de )?oct/.test(lib),'library last time');
 const msg=await p.locator('#msg').inputValue(); ok(/La última vez hice 12\/14 · 15\/15 · 15\/15 \(der\/izq\) con Solo la mano/.test(msg),'santiago msg last time');
 await p.locator('.sl .linkish').first().click(); await p.waitForTimeout(150);
 const fl=await p.locator('#flow').innerText().catch(()=>''); console.log('flow next day:', fl.split('\n').slice(0,6).join(' | '));
 // iso_ext early finish (seg)
 await p.locator('[data-close]').first().click();
 await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); const k='2026-10-11'; s.logs[k]={done:{},session:'sB'}; localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await p.reload(); await p.waitForTimeout(200); await p.locator('[data-tab="hoy"]').click();
 await p.locator('.thumb[data-detail="iso_ext"]').click(); await p.waitForTimeout(150);
 await p.locator('[data-work]').click(); await p.clock.runFor(20000); await p.waitForTimeout(30);
 await p.locator('[data-early]').click(); await p.waitForTimeout(50);
 st=await ST(p); ok(JSON.stringify(st.logs['2026-10-11'].reps.iso_ext)==='[20]','early finish records 20 s: '+JSON.stringify(st.logs['2026-10-11'].reps));
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
