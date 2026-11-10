// Ayudante para las pruebas nuevas: sirve la app con un Supabase simulado cuya "nube" comparten todos los dispositivos.
// Uso: const h = await require('./util.js')(puerto, 'fecha inicial'); const celular = await h.device(); ...
const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
// window.__offline = true simula quedarse sin internet en ese dispositivo.
const MOCK = `window.supabase={createClient:(url,key,opts)=>{
 const srv=(...a)=>window.__srv(...a); let session=JSON.parse(localStorage.getItem('mock-session')||'null'); const L=[];
 const emit=ev=>L.forEach(f=>f(ev,session)); const setS=s=>{session=s; s?localStorage.setItem('mock-session',JSON.stringify(s)):localStorage.removeItem('mock-session');};
 const net=async()=>{ if(window.__offline) throw new TypeError('Failed to fetch'); };
 return {auth:{getSession:async()=>({data:{session},error:null}),
   onAuthStateChange:f=>{L.push(f);setTimeout(()=>f('INITIAL_SESSION',session),0);return{data:{subscription:{unsubscribe(){}}}}},
   signUp:async({email,password})=>{const r=await srv('signup',email,password); if(r.error) return {data:{},error:r.error}; setS({user:{id:r.id,email}}); setTimeout(()=>emit('SIGNED_IN'),0); return {data:{session,user:session.user},error:null};},
   signInWithPassword:async({email,password})=>{const r=await srv('signin',email,password); if(r.error) return {data:{},error:r.error}; setS({user:{id:r.id,email}}); setTimeout(()=>emit('SIGNED_IN'),0); return {data:{session,user:session.user},error:null};},
   signOut:async()=>{setS(null); emit('SIGNED_OUT'); return {error:null};}},
  from:t=>({upsert:async row=>{await net(); await srv('upsert',row); return {error:null};},
    select:()=>({eq:(c,v)=>({maybeSingle:async()=>{await net(); return {data:await srv('get',v),error:null};}})})}),
  storage:{from:b=>({upload:async p=>({data:{path:p},error:null}),remove:async()=>({data:[],error:null}),createSignedUrls:async ps=>({data:[],error:null})})}};}};`;
// 20 días de historia hacia atrás desde el 10 de octubre de 2026 (igual que tests/pantallas.js).
const SEED = `(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); const pad=n=>String(n).padStart(2,'0'); const base=new Date(2026,9,10);
  for(let i=1;i<=20;i++){ if([3,4,9,15].includes(i)) continue; const d=new Date(base); d.setDate(base.getDate()-i); const k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
    const ss=s.sessions[i%4]; const done={}; ss.items.slice(0, i%3===0?3:5).forEach(x=>done[x]=true);
    s.logs[k]={done,session:ss.id,painL:Math.max(0,Math.round(3-i/10+(i%3===0?1:0))),painR:Math.max(0,Math.round(4-i/8)),ice:i%2===0,heat:i%4===0,breaks:1+(i%5),note:i%6===0?'mucho teclado':'',savedAt:1}; }
  localStorage.setItem('fibra-state-v1',JSON.stringify(s)); })()`;
module.exports = async function(port, startTime){
  const SRV = {db:{}, users:{}, writes:0};
  const server = http.createServer((req, res) => { let u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/vendor/supabase.js'){ res.writeHead(200, {'Content-Type':'text/javascript'}); return res.end(MOCK); }
    const f = path.join(DIR, u === '/' ? 'index.html' : u);
    if (fs.existsSync(f) && fs.statSync(f).isFile()){ res.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream'}); res.end(fs.readFileSync(f)); } else { res.writeHead(404); res.end(); } });
  await new Promise(r => server.listen(port, r));
  const b = await chromium.launch(), errors = [];
  // Cada dispositivo tiene su propio reloj: t0 permite que uno vaya adelantado respecto al otro, como pasa en la vida real.
  async function device(t0){
    const ctx = await b.newContext({viewport:{width:390,height:844}, serviceWorkers:'block'});
    await ctx.exposeBinding('__srv', (src, op, ...a) => {
      if (op === 'signup'){ if (SRV.users[a[0]]) return {error:{message:'User already registered'}}; const id = 'uid-'+Object.keys(SRV.users).length; SRV.users[a[0]] = {pw:a[1], id}; return {id}; }
      if (op === 'signin'){ const u = SRV.users[a[0]]; if (!u || u.pw !== a[1]) return {error:{message:'Invalid login credentials'}}; return {id:u.id}; }
      if (op === 'upsert'){ SRV.db[a[0].user_id] = JSON.parse(JSON.stringify(a[0])); SRV.writes++; return true; }
      if (op === 'get'){ const r = SRV.db[a[0]]; return r ? {data:r.data} : null; }
    });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.clock.install({time: new Date(t0 || startTime || '2026-10-10T14:00:00-05:00')});
    await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(300); return p;
  }
  const auth = async (p, kind) => { await p.locator('#sync').click(); await p.locator('#l-email').fill('leo@x.com'); await p.locator('#l-pass').fill('secreto1'); await p.locator(kind === 'up' ? '[data-signup]' : '[data-signin]').click(); await p.waitForTimeout(1500); };
  const ST = p => p.evaluate(() => JSON.parse(localStorage.getItem('fibra-state-v1')));
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
  const wake = async p => { await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(1200); };
  return {SRV, SEED, device, auth, ST, ok, wake, errors, close: async () => { await b.close(); server.close(); }};
};
