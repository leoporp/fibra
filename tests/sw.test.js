// Service worker de verdad (las demás pruebas lo bloquean): instala, abre sin internet, no se queda esperando con red lenta
// y sigue trayendo la versión nueva cuando la red responde.
const PW = (() => { try { return require('playwright'); } catch(e){ return require('/home/claude/.npm-global/lib/node_modules/playwright'); } })();
const {chromium} = PW;
const http = require('http'), fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
let delay = 0, down = false, marker = '';   // el "servidor" puede ir lento, caerse o publicar una versión nueva (cambia el <title>)
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split('?')[0]);
  if (down){ req.socket.destroy(); return; }
  const f = path.join(DIR, u === '/' ? 'index.html' : u);
  setTimeout(() => {
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()){ res.writeHead(404); return res.end(); }
    let body = fs.readFileSync(f); if (u === '/' && marker) body = Buffer.from(String(body).replace('<title>Fibra</title>', '<title>' + marker + '</title>'));
    res.writeHead(200, {'Content-Type': types[path.extname(f)] || 'application/octet-stream'}); res.end(body);
  }, delay); });
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
server.listen(8823, async () => {
  const b = await chromium.launch(), ctx = await b.newContext({viewport:{width:390,height:844}}), p = await ctx.newPage(), errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const open = async () => { const t = Date.now(); await p.reload(); await p.waitForSelector('h1'); return Date.now() - t; };
  await p.goto('http://localhost:8823/'); await p.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {timeout: 15000}).catch(() => {});
  await p.waitForTimeout(1500);
  const shell = [...new Set(fs.readFileSync(path.join(DIR, 'sw.js'), 'utf8').match(/"\.\/[^"]*"/g).map(x => x.slice(3, -1)).filter(Boolean))];
  ok(shell.every(f => fs.existsSync(path.join(DIR, f))), 'todos los archivos de la lista SHELL existen');
  const c = await p.evaluate(async () => { const ks = await caches.keys(); return {ks, n: (await (await caches.open(ks[0])).keys()).length}; });
  ok(c.ks.length === 1 && c.n >= shell.length + 1 && shell.length >= 11, 'instala y guarda la app completa (' + c.n + ' archivos en ' + c.ks[0] + ')');

  down = true; let ms = await open();
  ok(/toca entrenar/i.test(await p.locator('h1').innerText()), 'abre sin internet (' + ms + ' ms)');
  ok(await p.evaluate(() => document.fonts.check('700 20px "Bricolage Grotesque"')), 'con sus fuentes');

  down = false; await open(); await p.waitForTimeout(4000); marker = 'Fibra rápida'; await open();
  ok(await p.title() === 'Fibra rápida', 'con red normal, cerrar y abrir trae lo recién publicado');

  marker = 'Fibra lenta'; delay = 8000; ms = await open();
  ok(ms > 2500 && ms < 4800, 'con red muy lenta abre con lo guardado a los 3 s y no se queda esperando (' + ms + ' ms)');
  ok(await p.title() === 'Fibra rápida', 'mostrando la versión que tenía guardada');
  await p.waitForTimeout(9000); down = true; await open();
  ok(await p.title() === 'Fibra lenta', 'y la versión nueva quedó guardada para la próxima vez que abra');
  ok(errs.length === 0, 'sin errores ' + errs.join(';'));
  await b.close(); server.close();
});
