// Cambiar la rutina no reescribe el historial: los días pasados conservan la lista de ejercicios que les tocaba (log.items).
const H = require('./util.js');
(async () => {
  const h = await H(8821, '2026-10-10T21:00:00-05:00'); const {device, ST, ok} = h;
  const p = await device(); await p.locator('[data-toggle]').first().click();
  // historia con el formato anterior (sin log.items), como la que ya tiene Leo
  await p.evaluate(h.SEED); await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('fibra-state-v1')); s.v = 8; for (const k in s.logs) delete s.logs[k].items; localStorage.setItem('fibra-state-v1', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(400);
  const read = async () => { await p.locator('[data-tab="progreso"]').click(); await p.waitForTimeout(500);
    return {pts: await p.locator('.fibers .lvl span').innerText(), fund: await p.locator('.fundtop b').innerText(), full: await p.locator('#painbox .sbar[opacity="0.85"]').count(), racha: await p.locator('.stat b').first().innerText()}; };
  const before = await read(); const same = (x, m) => ok(JSON.stringify(x) === JSON.stringify(before), m + ' ' + JSON.stringify(x));
  ok(before.full >= 10, 'hay sesiones completas en el historial (' + before.full + ')');

  // 1. agregar un ejercicio a la sesión A (lo que haría Santiago en una cita)
  await p.locator('[data-tab="rutina"]').click(); await p.locator('[data-add]').click();
  await p.locator('#f-name').fill('Enrollador de muñeca'); await p.locator('#f-sess').selectOption({index: 0}); await p.locator('[data-saveex]').click(); await p.waitForTimeout(400);
  await p.locator('[data-close]').first().click().catch(() => {});
  same(await read(), 'agregar un ejercicio a una sesión no cambia puntos, fondo, racha ni sesiones completas:');
  let st = await ST(p);
  ok(st.v === 9 && st.logs['2026-10-09'].items.length === 5 && !st.logs['2026-10-09'].items.some(id => !st.sessions.some(s => s.items.includes(id)) ), 'los días pasados guardaron su lista de 5 ejercicios');
  ok(st.sessions[0].items.length === 6, 'la sesión A ahora tiene 6');
  // hoy sí usa la rutina actual
  await p.locator('[data-tab="hoy"]').click(); await p.waitForTimeout(300);
  ok(await p.locator('[data-toggle]').count() === 6, 'hoy (sesión A) muestra los 6 ejercicios');

  // 2. quitar un ejercicio de otra sesión desde el editor
  await p.locator('[data-tab="rutina"]').click(); await p.locator('[data-editsess]').nth(1).click(); await p.locator('[data-rm="0"]').click(); await p.locator('[data-savesess]').click(); await p.waitForTimeout(400);
  same(await read(), 'quitar un ejercicio de una sesión tampoco:');

  // 3. modo fisio: Santiago quita uno y guarda
  await p.locator('[data-tab="rutina"]').click(); await p.locator('[data-fisio]').click(); await p.waitForTimeout(300);
  await p.locator('[data-fdec$=":rm"]').nth(2).click(); await p.locator('[data-fsum]').click(); await p.locator('[data-fsave]').click(); await p.waitForTimeout(500);
  same(await read(), 'ni lo que Santiago quita en el modo fisio:');

  // 4. cambiar en la rutina un ejercicio de hoy
  await p.locator('[data-tab="hoy"]').click(); await p.locator('.thumb').nth(1).click(); await p.waitForTimeout(300);
  await p.locator('[data-swap]').click(); await p.locator('[data-swlist]').click().catch(() => {}); await p.locator('[data-swpick]').first().click(); await p.locator('[data-swapply="routine"]').click(); await p.waitForTimeout(400);
  await p.locator('[data-close]').first().click();
  same(await read(), 'ni "Cambiar ejercicio → En la rutina":');

  // 5. al editar un día pasado se ven los ejercicios que tocaban ese día, no la sesión como quedó hoy
  st = await ST(p); const k = Object.keys(st.logs).sort().reverse().find(x => x < '2026-10-10' && st.logs[x].session === st.sessions[0].id);
  await p.locator('.dayrow[data-editday="' + k + '"]').click().catch(async () => { await p.locator('[data-morehist]').click(); await p.locator('.dayrow[data-editday="' + k + '"]').click(); });
  await p.waitForTimeout(300);
  ok(await p.locator('#pastex .chkrow.pex').count() === st.logs[k].items.length, 'el día ' + k + ' muestra sus ' + st.logs[k].items.length + ' ejercicios de entonces');
  // si de verdad cambia de sesión, ese día pasa a la lista actual de la sesión elegida
  await p.locator('[data-pexpick]').nth(3).click(); await p.locator('#pastex .chkrow.pex').first().click(); await p.locator('#e-save').click(); await p.waitForTimeout(400);
  st = await ST(p);
  ok(st.logs[k].session === st.sessions[3].id && JSON.stringify(st.logs[k].items) === JSON.stringify(st.sessions[3].items), 'cambiarle la sesión a un día pasado le pone la lista de esa sesión');
  ok(h.errors.length === 0, 'sin errores ' + h.errors.join(';'));
  await h.close();
})();
