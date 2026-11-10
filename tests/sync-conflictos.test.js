// Dos dispositivos con la misma cuenta: lo que hace uno nunca pisa lo que hizo el otro.
const H = require('./util.js');
(async () => {
  const h = await H(8820, '2026-10-10T21:00:00-05:00'); const {SRV, device, auth, ST, ok, wake} = h;
  const tk = '2026-10-10', cloud = () => SRV.db['uid-0'].data;

  // 1. Celular con historial en la nube. Después, un dispositivo nuevo (o la app reinstalada) donde Leo toca algo ANTES de entrar.
  const A = await device(); await A.locator('[data-toggle]').first().click(); await A.evaluate(h.SEED); await A.reload(); await A.waitForTimeout(300);
  await auth(A, 'up'); await A.waitForTimeout(800);
  const n0 = Object.keys(cloud().logs).length;
  ok(n0 >= 17, 'la nube tiene el historial del celular (' + n0 + ' días)');
  const B = await device('2026-10-10T21:05:00-05:00');   // su reloj va adelante: lo local es "más nuevo" que la nube
  await B.locator('[data-toggle]').nth(1).click(); await B.waitForTimeout(300);
  await auth(B, 'in'); await B.waitForTimeout(1500);
  ok(Object.keys(cloud().logs).length >= n0, 'entrar en un dispositivo nuevo no borra el historial de la nube');
  let sb = await ST(B); const ids = sb.sessions[0].items;
  ok(Object.keys(sb.logs).length >= n0, 'el dispositivo nuevo recibe el historial');
  ok(sb.logs[tk].done[ids[0]] && sb.logs[tk].done[ids[1]], 'y conserva lo que marcó antes de entrar junto con lo de la nube');

  // 2. Pestaña abierta y desactualizada: A marca algo, B (que no se ha enterado) marca otra cosa.
  await wake(A);
  await A.locator('[data-toggle]').nth(2).click(); await A.waitForTimeout(1300);
  ok(cloud().logs[tk].done[ids[2]], 'la nube tiene el ejercicio 3, hecho en A');
  await B.locator('[data-toggle]').nth(3).click(); await B.waitForTimeout(1600);
  ok(cloud().logs[tk].done[ids[2]] && cloud().logs[tk].done[ids[3]], 'B no pisa a A: la nube tiene el 3 (de A) y el 4 (de B)');
  await wake(A); let sa = await ST(A);
  ok(sa.logs[tk].done[ids[2]] && sa.logs[tk].done[ids[3]], 'A recibe lo de B sin perder lo suyo');

  // 3. A entrena sin internet; mientras tanto B edita otra cosa; A vuelve a tener señal.
  await A.evaluate(() => { window.__offline = true; });
  await A.locator('[data-toggle]').nth(4).click(); await A.waitForTimeout(1300);
  ok(/Sin internet/.test(await A.locator('#sync').innerText()), 'A avisa que está sin internet');
  await B.locator('[data-tab="rutina"]').click(); await B.locator('#cita-notes').fill('preguntar por el enrollador'); await B.waitForTimeout(1600);
  await A.evaluate(() => { window.__offline = false; }); await A.reload(); await A.waitForTimeout(1600);
  sa = await ST(A);
  ok(sa.logs[tk].done[ids[4]], 'A conserva el ejercicio que hizo sin internet');
  ok(sa.citaNotes === 'preguntar por el enrollador', 'A recibe la nota que escribió B');
  ok(cloud().logs[tk].done[ids[4]] && cloud().citaNotes === 'preguntar por el enrollador', 'la nube queda con las dos cosas');

  // 4. Lo borrado en un dispositivo no revive desde el otro.
  await wake(B);
  await B.locator('[data-tab="progreso"]').click(); await B.locator('.dayrow[data-editday="2026-10-09"]').click();
  await B.locator('[data-clearday]').click(); await B.locator('[data-clearday]').click(); await B.waitForTimeout(1600);
  await A.locator('[data-tab="rutina"]').click(); await A.locator('#bundle').fill('Proyecto Hail Mary'); await A.locator('#bundle').blur(); await A.waitForTimeout(1600);
  ok(cloud().logs['2026-10-09'].painL === undefined, 'el registro borrado en B sigue borrado después de que A (desactualizado) guarda');
  ok(cloud().bundle === 'Proyecto Hail Mary', 'y lo que cambió A también quedó');
  await wake(B); sb = await ST(B);
  ok(sb.bundle === 'Proyecto Hail Mary' && sb.logs['2026-10-09'].painL === undefined, 'B termina igual que la nube');

  // 5. Sin cambios no hay escrituras de más.
  const w0 = SRV.writes; await wake(A); await wake(B); await wake(A);
  ok(SRV.writes === w0, 'abrir la app sin cambios no escribe en la nube');
  ok(/Guardado en la nube/.test(await A.locator('#sync').innerText()), 'A queda "Guardado en la nube"');
  ok(h.errors.length === 0, 'sin errores ' + h.errors.join(';'));
  await h.close();
})();
