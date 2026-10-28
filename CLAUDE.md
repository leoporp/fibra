# Fibra: contexto para seguir trabajando

Fibra es la app personal de Leo para ser constante con los ejercicios de fuerza de su rehabilitación de epicondilitis en los dos codos, que le manda su fisioterapeuta, Santiago. La usa en un Android (Chrome, instalada en la pantalla de inicio) y a veces en el computador. **Leo es el usuario final y el único usuario.**

Este archivo es el traspaso entre chats: léelo completo antes de tocar algo.

## Cómo trabajar con Leo

- Escribe en español, casual y directo. Honesto, sin condescendencia: prefiere la verdad con hechos a que le den la razón.
- Si no tienes más de 90 % de certeza de lo que quiere, **hazle preguntas cerradas antes** (con opciones, idealmente con una recomendada). Cuando pide "solo guárdalo" o "no lo ejecutes", no cambies la app.
- Nada de afirmaciones de salud como certezas. Dosis, cargas y ejercicios nuevos: "confírmalo con Santiago". La rutina sugerida está marcada "por confirmar".
- Después de cada cambio: probar (`bash tests/run-all.sh` y, si es visual, mirar pantallazos), commit con atribución, `git push origin main`, esperar el deploy (`gh run list -R leoporp/fibra -L 1`) y decirle que cierre y abra la app.
- Respuestas finales cortas: qué cambió, en lenguaje de usuario (no de código).

## Arquitectura

- `index.html`: toda la app (HTML, CSS y JS vanilla en un solo archivo, sin build). Estado local primero en `localStorage` (`fibra-state-v1`).
- `config.js`: URL de Supabase y **publishable key** (pública por diseño; las reglas RLS protegen los datos). Nunca poner la secret/service_role.
- `supabase/setup.sql`: tabla `fibra_state` (un JSON por usuario, RLS "solo lo propio") y bucket privado `media` para fotos y videos (rutas `uid/...`, URLs firmadas). Idempotente. Ya está corrido en el proyecto.
- `sw.js`: service worker network-first (sirve sin internet). Si cambias la lista `SHELL`, sube la versión de `CACHE`.
- `vendor/supabase.js`: supabase-js 2.116.0 UMD, local. `fonts/`: Bricolage Grotesque (títulos) y Atkinson Hyperlegible (texto). `icons/`: ícono óxido con hebras.
- Hosting: GitHub Pages desde `main` del repo público `leoporp/fibra` → https://leoporp.github.io/fibra/. Como el repo es público, no metas datos personales en el código.

### Sincronización
- Al entrar: si la nube es más nueva, se adopta; si el dispositivo es más nuevo, se sube. Cada guardado sube tras 700 ms.
- La **primera** vez que una cuenta se sincroniza en un dispositivo (`fibra-synced-uid`), si la nube es más nueva igual se conservan los días, ejercicios marcados y gustos que solo estaban en el dispositivo (`mergeLocal`). Después no, para no revivir lo borrado.
- El borrador del registro del día está en `fibra-draft` (solo local).

### Modelo de datos (versión 8, `migrate()` con banderas)
- `exercises[]`: `id, name, zone, sets, reps, unit ("reps"|"seg"), perArm, load, loadHistory[{d, load}], notes, confirmed, art, media[], progSnooze`.
- `sessions[]`: `{id, name, items[ids]}`; rotan solas (toca la siguiente a la última hecha).
- `logs["AAAA-MM-DD"]`: `done{id:true}`, `sets{id:n}`, `reps{id:[n por serie, der/izq alternado]}`, `loads{id:texto}`, `effort{id:1..4}`, `session`, `painL`, `painR` (0–10), `ice`, `heat`, `breaks` (0 = no aplica, 1–5), `note`, `savedAt`.
- También: `rewards[]` (solo las que él cree), `spends[]` y `fundStart` (fondo), `bundle` (audiolibro), `painView` ("max"|"arms"), `weeklyGoal` (4), `restSec` (60).
- Citas con Santiago: `visits[{d, changes[texto], loadRule, note}]`, `citaNotes` (lo que Leo quiere hablar). En ejercicios: `src` ("s" = de Santiago, "ai" = sugerido), `retired` (fecha en que Santiago lo quitó; sale de las sesiones pero conserva registros), `pNote`/`pNoteD` (indicación de Santiago). El borrador del modo fisio vive solo en el dispositivo (`fibra-fisio`).
- Para cambiar datos de usuarios existentes: agrega una bandera nueva en `migrate()` (como `setsV6`, `equipV7`, `fundV8`), sube `v`, `blank()` y `CUR_V`, y no pises lo que él haya personalizado.

## Decisiones ya tomadas (y por qué)

- **Rutina**: 4 sesiones de 5 ejercicios, unos 20 a 22 minutos más 3 de calentamiento. El excéntrico o isométrico de extensores va en 3 series y los complementarios en 2. Los de antebrazo alternan brazo derecho e izquierdo.
- **Equipo en casa**: mancuernas ajustables (2 a 7 kg, con discos), una banda grande en círculo, 3 mini bandas y una toalla. No tiene pelota, martillo, ligas, flexbar ni barra. Los ejercicios y dibujos están adaptados a eso.
- **Antes de empezar**: hoja con lo que hay que tener listo (sale de la carga de cada ejercicio) y un calentamiento de 5 pasos.
- **Durante la sesión**: contador de repeticiones por serie (arranca en la meta), "Terminé antes" en isométricos, carga editable ahí mismo, y al terminar "¿Cómo se sintió con esta carga?" (Muy fácil, Bien, Difícil, No pude). "La última vez" se muestra en el ejercicio, en Rutina y en el mensaje para Santiago.
- **Aviso de subir carga**: 2 semanas constante con dolor bajo, o dos veces seguidas "Muy fácil". Nunca si quedaron series incompletas o la última vez fue difícil.
- **Registro del día**: dolor por brazo de cómo estuvo el día **en general** (decidido por Leo), con guía del 0 al 10 y preguntas para decidir entre dos números. Si duda, elige el más alto. Además hielo, calor y pausas activas (con "No aplica hoy"). Botón Guardar explícito y se compacta al guardar. Los días pasados se editan desde Progreso → Tus registros: el registro y también los ejercicios (Leo a veces olvida marcarlos el mismo día). Ahí elige la sesión, marca los hechos y, opcional, carga y "¿cómo se sintió?" (sin reps por serie: de memoria no son confiables). Cualquier día, y cuentan igual para puntos, racha, meta y fondo (decisión de Leo). Agregar un día cambia la rotación de sesiones.
- **Gamificación**: puntos (10 por ejercicio, 20 por sesión completa, 5 por registro y 50 por semana cumplida), 9 niveles con nombres de hebras, meta de 4 días por semana (un día cuenta con la mitad de la sesión). **Fondo**: $5.000 por día cumplido y $10.000 por semana cumplida, contado desde `fundStart`; sus gustos salen de ahí. Las recompensas precargadas se quitaron porque no lo convencían.
- **Audiolibro solo mientras entrena** (temptation bundling): recordatorio dentro del primer ejercicio. Eligió Proyecto Hail Mary.
- **Progreso**: gráfica de dolor de 0 a 10 (peor brazo o cada brazo) con carriles alineados debajo (sesión, hielo, calor, pausas). **Nunca doble eje ni barras apiladas** de cosas que no suman. Colores de brazos validados: claro `#2A6FB0`/`#9A3F27`, oscuro `#4A90E2`/`#DB6F4C`.
- **Identidad visual**: "hebras que se ordenan". Acento óxido `#9A3F27` (oscuro `#E58A68`) y ámbar `--fiber`. Las fibras de Hoy se enderezan al marcar (transición CSS de `d`, que funciona en Chrome) y al completar la sesión pulsan con un brillo.
- **Movimiento**: transiciones equilibradas (0,2 a 0,4 s): hojas que suben y se cierran deslizando hacia abajo, pestañas con View Transitions e íconos de hebra, rebotes al tocar. Se respeta la opción de reducir animaciones. **Sin vibración** (lo pidió así).
- **Botón atrás de Android**: una entrada de historial protege hojas abiertas y pestañas distintas de Hoy (`syncNav`).
- **Modo fisio** (Rutina → Cita con Santiago): Santiago revisa en el celular de Leo durante la cita, no con cuenta propia (se descartó por ahora: le pediría trabajo fuera de la cita, implica compartir datos de salud y la edición simultánea choca con el JSON único). Él toca el celular, así que todo es grande y sin jerga. Por ejercicio: "¿Este se lo pusiste tú?" y Va así / Ajustar / Quitar (dosis, carga, por brazo, indicación para Leo); puede agregar ejercicios (atajo para el enrollador de muñeca, que Leo dice que él le puso) y cambiar los días por semana. No puede tocar calentamiento ni guía de dolor (decisión de Leo). Nada cambia hasta "Guardar"; salir o el botón atrás no pierden lo marcado. Arriba le muestra "Cómo le ha ido" y que parte de la rutina se armó con IA (Leo está de acuerdo en decírselo).
- **Resumen desde la última cita**: en el modo fisio y en Progreso (debajo de la gráfica, que debe seguir siendo lo primero). Sin citas guardadas usa las últimas 3 semanas.
- Lo que Leo recuerda de Santiago: isométrico de extensores, extensión de dedos contra la otra mano, varios con banda elástica, tríceps (no recuerda cuáles), el enrollador y uno de halar peso con toalla que odió. Por eso los demás quedan para que Santiago los marque.
- **No se puede**: notificaciones o recordatorios (es una web app, sin servidor de push). Leo no quiso recordatorio externo por ahora.

## Pruebas

- `bash tests/run-all.sh` corre todas las pruebas con Playwright (Chromium headless). Cada una levanta un servidor local y simula Supabase. `node tests/pantallas.js nombre` guarda pantallazos de todas las pantallas, en modo claro y oscuro, en `tests/shots/` (ignorado por git).
- En el sandbox de Claude en la nube no se llega a `*.supabase.co` ni a `leoporp.github.io` por curl (proxy). WebFetch no ve el JS. Para revisar en vivo, usa el navegador integrado si el chat está conectado al computador de Leo.

## Pendiente o por confirmar

- Después de la primera cita con el modo fisio, preguntarle a Leo cómo le fue y ajustar. Calentamiento y guía de dolor siguen sin confirmar.
- Posible siguiente paso, solo si Santiago muestra interés tras 2 o 3 citas: acceso propio para él. Ampliarlo a sus pacientes sería otro proyecto (muchos usuarios y datos de salud de terceros).
- Verificar que en Supabase esté apagado "Allow new users to sign up" después de que Leo creó su cuenta.
- Si el ícono viejo sigue en Android: desinstalar y reinstalar la app desde Chrome (sus datos están en la nube).
