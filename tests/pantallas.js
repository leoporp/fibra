// QA walkthrough: screenshots of every screen, fresh + with history, light + dark
const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http=require('http'),fs=require('fs'),path=require('path');
fs.mkdirSync(__dirname+'/shots',{recursive:true});
const DIR=path.resolve(__dirname,'..'), OUT=__dirname+'/shots/'+(process.argv[2]||'pantallas');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const MOCK=`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:f=>{setTimeout(()=>f('INITIAL_SESSION',null),0);return{data:{subscription:{unsubscribe(){}}}}},signOut:async()=>({error:null}),signInWithPassword:async()=>({data:{},error:{message:'Invalid login credentials'}}),signUp:async()=>({data:{},error:{message:'x'}})},
 from:()=>({upsert:async()=>({error:null}),select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:null})})})}),storage:{from:()=>({})}})};`;
const server=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]);
 if(u==='/vendor/supabase.js'){res.writeHead(200,{'Content-Type':'text/javascript'});return res.end(MOCK);}
 const f=path.join(DIR,u==='/'?'index.html':u); if(fs.existsSync(f)&&fs.statSync(f).isFile()){res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});res.end(fs.readFileSync(f));} else {res.writeHead(404);res.end();}});
server.listen(8790,async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const b=await chromium.launch(); const errors=[];
 for (const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',deviceScaleFactor:1.5,colorScheme:scheme}); const p=await ctx.newPage();
  p.on('pageerror',e=>errors.push(scheme+': '+e.message)); p.on('console',m=>{ if(m.type()==='error') errors.push(scheme+' console: '+m.text()); });
  await p.clock.install({time:new Date('2026-10-10T21:00:00-05:00')});
  await p.goto('http://localhost:8790/'); await p.waitForTimeout(300);
  const S=async n=>{ await p.waitForTimeout(700); await p.screenshot({path:OUT+'/'+scheme[0]+'_'+n+'.png',fullPage:true}); };
  await S('01_hoy_fresh');
  await p.locator('[data-tab="progreso"]').click(); await S('02_progreso_fresh');
  await p.locator('[data-tab="rutina"]').click(); await S('03_rutina_fresh');
  await p.locator('[data-tab="hoy"]').click();
  // history
  await p.locator('[data-toggle]').first().click();
  await p.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('fibra-state-v1')); const pad=n=>String(n).padStart(2,'0'); const base=new Date(2026,9,10);
    for(let i=1;i<=20;i++){ if([3,4,9,15].includes(i)) continue; const d=new Date(base); d.setDate(base.getDate()-i); const k=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
      const ss=s.sessions[i%4]; const done={}; ss.items.slice(0, i%3===0?3:5).forEach(x=>done[x]=true);
      s.logs[k]={done,session:ss.id,painL:Math.max(0,Math.round(3-i/10+(i%3===0?1:0))),painR:Math.max(0,Math.round(4-i/8)),ice:i%2===0,heat:i%4===0,breaks:1+(i%5),note:i%6===0?'mucho teclado':'',savedAt:1}; }
    localStorage.setItem('fibra-state-v1',JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(300);
  await S('04_hoy_history');
  await p.locator('[data-painguide]').first().click(); await S('05_guide');
  await p.locator('[data-guideback]').click();
  await p.locator('[data-start]').click(); await p.waitForTimeout(200);
  await p.locator('[data-setdone]').first().click().catch(()=>{}); await S('07_detail_after_set');
  await p.locator('[data-close]').first().click();
  await p.locator('[data-tab="progreso"]').click(); await S('08_progreso_history');
  await p.locator('[data-pday="20"]').click({force:true}).catch(()=>{});
  await p.locator('[data-painview="arms"]').click(); await S('09_progreso_arms');
  await p.locator('.dayrow').nth(1).click(); await S('10_editday');
  await p.locator('.sheet [data-painguide]').click(); await S('11_guide_from_edit');
  await p.locator('[data-guideback]').click(); await S('12_back_to_edit');
  await p.locator('[data-close]').first().click();
  await p.locator('[data-spend]').click(); await S('13_spend');
  await p.locator('[data-close]').first().click();
  await p.locator('[data-addrw]').click(); await S('14_reward_form');
  await p.locator('[data-close]').first().click();
  await p.locator('[data-tab="rutina"]').click(); await S('15_rutina');
  await p.locator('[data-editsess]').first().click(); await S('16_sess_editor');
  await p.locator('[data-sx="0"]').click(); await S('17_ex_form');
  await p.locator('[data-back]').click(); await p.locator('[data-close]').first().click();
  await p.locator('[data-add]').click(); await S('18_new_ex');
  await p.locator('[data-close]').first().click();
  await p.locator('#sync').click(); await S('19_login');
  await p.locator('[data-close]').first().click().catch(()=>{});
  await ctx.close(); }
 console.log('errors', JSON.stringify(errors));
 await b.close(); server.close();
});
