const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http=require('http'),fs=require('fs'),path=require('path');
fs.mkdirSync(__dirname+'/shots',{recursive:true});
const DIR=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
const SRV={db:{},users:{}};
const MOCK=`window.supabase={createClient:(url,key,opts)=>{
 const srv=(...a)=>window.__srv(...a); let session=JSON.parse(localStorage.getItem('mock-session')||'null'); const L=[];
 const emit=ev=>L.forEach(f=>f(ev,session)); const setS=s=>{session=s; s?localStorage.setItem('mock-session',JSON.stringify(s)):localStorage.removeItem('mock-session');};
 return {auth:{getSession:async()=>({data:{session},error:null}),
   onAuthStateChange:f=>{L.push(f);setTimeout(()=>f('INITIAL_SESSION',session),0);return{data:{subscription:{unsubscribe(){}}}}},
   signUp:async({email,password})=>{const r=await srv('signup',email,password); if(r.error) return {data:{},error:r.error}; setS({user:{id:r.id,email}}); setTimeout(()=>emit('SIGNED_IN'),0); return {data:{session,user:session.user},error:null};},
   signInWithPassword:async({email,password})=>{const r=await srv('signin',email,password); if(r.error) return {data:{},error:r.error}; setS({user:{id:r.id,email}}); setTimeout(()=>emit('SIGNED_IN'),0); return {data:{session,user:session.user},error:null};},
   signOut:async()=>{setS(null); emit('SIGNED_OUT'); return {error:null};}},
  from:t=>({upsert:async row=>(await srv('upsert',row),{error:null}),
    select:()=>({eq:(c,v)=>({maybeSingle:async()=>({data:await srv('get',v),error:null})})})}),
  storage:{from:b=>({upload:async p=>({data:{path:p},error:null}),remove:async()=>({data:[],error:null}),createSignedUrls:async ps=>({data:[],error:null})})}};}};`;
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/vendor/supabase.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(MOCK);}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); if(!c) process.exitCode=1;};
server.listen(8793,async()=>{
 const b=await chromium.launch(); const errors=[];
 async function device(){ const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
   await ctx.exposeBinding('__srv',(src,op,...a)=>{
     if(op==='signup'){ if(SRV.users[a[0]]) return {error:{message:'User already registered'}}; const id='uid-'+Object.keys(SRV.users).length; SRV.users[a[0]]={pw:a[1],id}; return {id}; }
     if(op==='signin'){ const u=SRV.users[a[0]]; if(!u||u.pw!==a[1]) return {error:{message:'Invalid login credentials'}}; return {id:u.id}; }
     if(op==='upsert'){ SRV.db[a[0].user_id]=JSON.parse(JSON.stringify(a[0])); return true; }
     if(op==='get'){ const r=SRV.db[a[0]]; return r?{data:r.data}:null; }
   });
   const p=await ctx.newPage(); p.on('pageerror',e=>errors.push(e.message)); await p.goto('http://localhost:8793/'); await p.waitForTimeout(300); return p; }
 const auth=async(p,kind)=>{ await p.locator('#sync').click(); await p.locator('#l-email').fill('leo@x.com'); await p.locator('#l-pass').fill('secreto1'); await p.locator(kind==='up'?'[data-signup]':'[data-signin]').click(); await p.waitForTimeout(1500); };
 // phone: has local data from earlier days
 const phone=await device();
 await phone.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')||'null'); });
 await phone.locator('[data-toggle]').first().click(); await phone.locator('#p-painL').fill('3'); await phone.locator('#p-painR').fill('2'); await phone.locator('#d-save').click();
 await phone.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); s.logs['2026-10-09']={done:{},painL:4,painR:4,savedAt:5,ice:true}; s.spends=[{id:'sp1',d:'2026-10-10',amount:3000,what:'café'}]; localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
 await phone.reload(); await phone.waitForTimeout(300);
 // computer signs up FIRST (the risky order)
 const pc=await device(); await auth(pc,'up');
 ok(!!SRV.db['uid-0'],'computer pushed its (empty) state');
 const pcLogs=Object.keys(SRV.db['uid-0'].data.logs).length; console.log('remote logs after pc:', pcLogs);
 await new Promise(r=>setTimeout(r,50));
 // phone signs in later
 await auth(phone,'in');
 const st=await phone.evaluate(()=>JSON.parse(localStorage.getItem('fibra-state-v1')));
 const tk=Object.keys(st.logs).sort().pop();
 ok(st.logs['2026-10-09'] && st.logs['2026-10-09'].painL===4,'phone kept yesterday after merge');
 ok(Object.values(st.logs).some(l=>l.painL===3),'phone kept today registro');
 ok((st.spends||[]).some(x=>x.id==='sp1'),'phone kept spend');
 await phone.waitForTimeout(1200);
 const remote=SRV.db['uid-0'].data; ok(remote.logs['2026-10-09'] && remote.logs['2026-10-09'].painL===4,'merged data pushed to cloud');
 console.log('phone sync:', await phone.locator('#sync').innerText());
 // pc reloads → gets phone data
 await pc.reload(); await pc.waitForTimeout(1200);
 const pst=await pc.evaluate(()=>JSON.parse(localStorage.getItem('fibra-state-v1')));
 ok(pst.logs['2026-10-09'] && pst.logs['2026-10-09'].painL===4,'computer receives phone data');
 // deletion on pc propagates and is not resurrected by phone
 await pc.evaluate(()=>{});
 await pc.locator('[data-tab="progreso"]').click(); await pc.locator('.dayrow[data-editday="2026-10-09"]').click(); await pc.locator('[data-clearday]').click(); await pc.locator('[data-clearday]').click(); await pc.waitForTimeout(1500);
 await phone.reload(); await phone.waitForTimeout(1500);
 const st2=await phone.evaluate(()=>JSON.parse(localStorage.getItem('fibra-state-v1')));
 ok(!st2.logs['2026-10-09'] || st2.logs['2026-10-09'].painL===undefined,'deleted day not resurrected on phone');
 ok(SRV.db['uid-0'].data.logs['2026-10-09'].painL===undefined,'cloud keeps deletion');
 ok(errors.length===0,'no errors '+errors.join(';'));
 await b.close(); server.close();
});
