// La mezcla de tres vías que usa la sincronización (merge3): se sacan las funciones puras de index.html y se prueban sin navegador.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
const a = src.indexOf('const plain = o =>'), b = src.indexOf('function refreshOpen()', a);
if (a < 0 || b < 0){ console.log('FAIL no encontré merge3 en index.html'); process.exit(1); }
const {merge3, same, plain} = new Function(src.slice(a, b) + '; return {merge3, same, plain};')();
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);

ok(same({a:1, b:{c:[1,2]}}, {b:{c:[1,2]}, a:1}), 'same ignora el orden de las claves (la base de datos las reordena)');
ok(!same({a:1}, {a:1, b:2}) && !same([1,2], [2,1]) && !same(null, undefined) && same(undefined, undefined), 'same distingue lo distinto');
ok(merge3(1, 1, 2) === 2, 'solo cambió la nube: queda la nube');
ok(merge3(1, 3, 1) === 3, 'solo cambió este dispositivo: queda este');
ok(merge3(1, 3, 2) === 3, 'el mismo dato cambió en los dos: gana este dispositivo');
let r = merge3({a:1, b:1, c:1}, {a:2, b:1, c:1}, {a:1, b:5, c:1}); ok(eq(r, {a:2, b:5, c:1}), 'se juntan campos distintos');
r = merge3({a:1, b:1}, {a:1}, {a:1, b:1}); ok(eq(r, {a:1}), 'un lado borra un campo que el otro no tocó: borrado');
r = merge3({a:1, b:1}, {a:1}, {a:1, b:9}); ok(eq(r, {a:1, b:9}), 'un lado borra y el otro lo cambió: se conserva');
r = merge3({a:1}, {a:1, x:1}, {a:1, y:2}); ok(eq(r, {a:1, x:1, y:2}), 'los dos agregan campos distintos');

const base = {logs: {'2026-10-09': {done:{a:true}, painL:3, savedAt:1}}};
const mine = plain(base); mine.logs['2026-10-10'] = {done:{a:true, b:true}, session:'sA'}; mine.logs['2026-10-09'].done.c = true;
const theirs = plain(base); theirs.logs['2026-10-09'].painL = 5; theirs.logs['2026-10-09'].note = 'mucho teclado'; theirs.logs['2026-10-08'] = {done:{}, painR:2};
r = merge3(base, mine, theirs);
ok(r.logs['2026-10-10'] && r.logs['2026-10-08'] && r.logs['2026-10-09'].done.c && r.logs['2026-10-09'].painL === 5 && r.logs['2026-10-09'].note === 'mucho teclado', 'registros: días y campos de los dos lados');

const bE = [{id:'a', name:'A', load:'1 kg'}, {id:'b', name:'B'}, {id:'c', name:'C'}];
const mE = [{id:'a', name:'A', load:'2 kg'}, {id:'c', name:'C'}, {id:'n1', name:'Nuevo mío'}];
const tE = [{id:'a', name:'A', load:'1 kg', notes:'lento'}, {id:'b', name:'B'}, {id:'c', name:'C+'}, {id:'n2', name:'Nuevo de ellos'}];
r = merge3(bE, mE, tE);
ok(eq(r.map(x => x.id), ['a', 'c', 'n1', 'n2']), 'ejercicios: lo borrado sale y lo agregado en cada lado entra');
ok(r[0].load === '2 kg' && r[0].notes === 'lento' && r[1].name === 'C+', 'ejercicios: cambios por campo dentro de cada uno');
r = merge3(bE, [bE[0], bE[2]], [bE[0], {id:'b', name:'B editado'}, bE[2]]);
ok(r.some(x => x.id === 'b' && x.name === 'B editado'), 'uno borra y el otro edita el mismo ejercicio: se conserva el editado');
r = merge3([{d:'2026-10-01', load:'1'}], [{d:'2026-10-01', load:'1'}, {d:'2026-10-09', load:'3'}], [{d:'2026-10-01', load:'1'}, {d:'2026-10-05', load:'2'}]);
ok(eq(r.map(x => x.d), ['2026-10-01', '2026-10-05', '2026-10-09']), 'historial de cargas: se junta y queda en orden de fecha');
r = merge3(['a', 'b', 'c'], ['c', 'a', 'b', 'x'], ['a', 'b', 'y']);
ok(eq(r, ['a', 'b', 'x', 'y']), 'ejercicios de una sesión: mi orden, sale lo que el otro quitó y entra lo que agregó');
r = merge3([15, 15], [15, 12], [15, 15, 15]); ok(eq(r, [15, 12]), 'repeticiones por serie en conflicto: gana este dispositivo');

const M = merge3(base, mine, theirs); ok(same(merge3(base, M, theirs), M), 'repetir la mezcla da lo mismo');
const b0 = JSON.stringify(base), m0 = JSON.stringify(mine), t0 = JSON.stringify(theirs); merge3(base, mine, theirs);
ok(b0 === JSON.stringify(base) && m0 === JSON.stringify(mine) && t0 === JSON.stringify(theirs), 'no modifica lo que recibe');

// Al azar: si solo cambió un lado, el resultado siempre es ese lado.
let seed = 7; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const gen = d => { const t = rnd(d > 2 ? 3 : 6);
  if (t === 0) return rnd(5); if (t === 1) return 's' + rnd(4); if (t === 2) return rnd(2) === 0;
  if (t === 3){ const o = {}, n = rnd(4); for (let i = 0; i < n; i++) o['k' + rnd(5)] = gen(d + 1); return o; }
  if (t === 4) return Array.from({length: rnd(4)}, (_, i) => ({id: 'i' + i, v: gen(d + 1)}));
  return Array.from({length: rnd(4)}, () => 's' + rnd(6)).filter((x, i, arr) => arr.indexOf(x) === i); };
let bad = 0;
for (let i = 0; i < 3000; i++){ const B = gen(0), X = gen(0);
  if (!same(merge3(B, X, plain(B)), X)) bad++; if (!same(merge3(B, plain(B), X), X)) bad++; if (!same(merge3(B, X, plain(X)), X)) bad++; }
ok(bad === 0, 'al azar: con un solo lado cambiado siempre queda ese lado (' + bad + ' fallos)');
