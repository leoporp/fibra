# Fibra

Rutina terapéutica para epicondilitis: sesiones guiadas con dibujos animados, temporizador de series, registro de dolor, fotos y videos de cada ejercicio, y recompensas.

- **La app** (este repositorio) se publica con GitHub Pages.
- **Los datos** viven en Supabase, en una cuenta privada: registros en la tabla `fibra_state` y fotos o videos en la carpeta privada `media`. Cada cuenta solo puede ver lo suyo.
- **Configuración:** `config.js` lleva la dirección del proyecto y la clave pública. Nunca la clave secreta.
- **Base de datos:** `supabase/setup.sql` crea la tabla, la carpeta y las reglas de privacidad.

Los cambios a la app no tocan los datos: una actualización solo reemplaza el código.
