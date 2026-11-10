// Si la app queda abierta (instalada en el celular casi nunca se recarga) y cambia el día, Hoy no se queda mostrando ayer.
const H = require('./util.js');
(async () => {
  const h = await H(8822, '2026-10-10T21:00:00-05:00'); const {device, ok, ST} = h;
  const p = await device();
  for (let i = 0; i < 5; i++){ await p.locator('[data-toggle]').nth(i).click(); await p.waitForTimeout(80); }
  ok(/completa/i.test(await p.locator('h1').innerText()), 'el sábado terminó la sesión');
  // 1. vuelve a la app al otro día por la mañana, sin recargar
  await p.clock.setSystemTime(new Date('2026-10-11T09:00:00-05:00'));
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(500);
  ok(/11 de octubre/i.test(await p.locator('.date').innerText()), 'al volver, Hoy muestra el domingo 11');
  ok(/toca entrenar/i.test(await p.locator('h1').innerText()), 'y la sesión del día nuevo, sin marcar');
  ok(await p.locator('.ex.on').count() === 0, 'ningún ejercicio aparece hecho');
  // 2. con la pantalla prendida a las 4 a. m. también cambia solo (el día de Fibra termina a las 4)
  await p.locator('[data-toggle]').first().click(); await p.waitForTimeout(100);
  await p.clock.setSystemTime(new Date('2026-10-12T03:58:30-05:00')); await p.clock.runFor(61000); await p.waitForTimeout(200);
  ok(/11 de octubre/i.test(await p.locator('.date').innerText()), 'a las 3:59 a. m. sigue siendo el día 11');
  await p.clock.setSystemTime(new Date('2026-10-12T04:00:30-05:00')); await p.clock.runFor(61000); await p.waitForTimeout(200);
  ok(/12 de octubre/i.test(await p.locator('.date').innerText()), 'pasadas las 4 a. m. Hoy pasa al día 12 sin tocar nada');
  // 3. con un ejercicio abierto no se cierra la hoja; lo que se marque cuenta para el día nuevo
  await p.locator('.thumb').first().click(); await p.waitForTimeout(300);
  await p.clock.setSystemTime(new Date('2026-10-13T08:00:00-05:00'));
  await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(400);
  ok(await p.locator('#sheet h3').count() === 1, 'la hoja del ejercicio sigue abierta');
  await p.locator('#sheet [data-close]').first().click(); await p.waitForTimeout(400);
  ok(/13 de octubre/i.test(await p.locator('.date').innerText()), 'al cerrarla, Hoy ya es el día 13');
  const st = await ST(p); ok(Object.keys(st.logs).sort().join() === '2026-10-10,2026-10-11', 'solo hay registros de los días en que marcó algo');
  ok(h.errors.length === 0, 'sin errores ' + h.errors.join(';'));
  await h.close();
})();
