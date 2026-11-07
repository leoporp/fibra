const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http=require('http'),fs=require('fs'),path=require('path');
const DIR=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/config.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end('window.FIBRA_CONFIG={url:"",key:""};');}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
server.listen(8795,async()=>{
 const b=await chromium.launch(); const errors=[];
 const ctx=await b.newContext({viewport:{width:360,height:780},serviceWorkers:'block'}); const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:8795/'); await p.waitForTimeout(300);
 const c=p.locator('.chips').first();
 const max=await c.evaluate(e=>e.scrollWidth-e.clientWidth); ok(max>0,'chips scroll sideways ('+max+'px)');
 await c.evaluate(e=>{e.scrollLeft=e.scrollWidth;});
 const before=await c.evaluate(e=>e.scrollLeft);
 await p.locator('.chip').last().click(); await p.waitForTimeout(200);
 const after=await p.locator('.chips').first().evaluate(e=>e.scrollLeft);
 ok(after>0 && Math.abs(after-before)<20,'scroll kept after picking last session ('+before+' → '+after+')');
 ok(await p.locator('.chip').last().getAttribute('aria-pressed')==='true','last session picked');
 await ctx.close(); ok(errors.length===0,'no errors '+errors.join(';')); await b.close(); server.close();
});
