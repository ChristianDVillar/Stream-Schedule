# Guía para usuarios – Streamer Scheduler

[English](USER-GUIDE.md) · [FAQ (ES)](FAQ_ES.md) · [FAQ (EN)](FAQ_EN.md)

Información para usar **Streamer Scheduler**: qué es la aplicación, cómo empezar y cómo usar sus funciones principales.

---

## ¿Qué es Streamer Scheduler?

Streamer Scheduler es una aplicación web que te permite **programar y gestionar publicaciones** para varias redes sociales desde un solo sitio. Pensada para creadores de contenido y streamers que quieren planificar Twitch, X (Twitter), Instagram, Discord y YouTube sin tener que entrar en cada plataforma por separado.

---

## Empezar

### Crear cuenta e iniciar sesión

- Puedes **registrarte con email y contraseña** o **entrar con Google, Twitch o Discord**.
- Tras el primer acceso, si no tienes licencia, se te puede asignar una **prueba gratuita** (según la configuración de la aplicación).
- Una vez dentro, verás el **Dashboard** (panel principal).

### Licencias

La aplicación usa un sistema de licencias:

- **Prueba (trial)** – Uso limitado en tiempo.
- **Mensual / Trimestral / Permanente** – Según lo que ofrezca el servicio.
- La **licencia** y su fecha de vencimiento se muestran en tu **Perfil** y en **Configuración → Facturación**.
- Puedes **comprar o renovar** licencias desde la app (pagos con Stripe) si está habilitado.

---

## Dashboard

En el **Dashboard** (/dashboard) tienes:

- Resumen de tu actividad y contenido programado o publicado.
- Accesos rápidos a **programar contenido**, **plantillas**, **media**, **lista de tareas** y **perfil**.
- Si tienes Twitch conectado, pueden mostrarse datos de suscripciones, bits o donaciones (si el administrador los tiene activos).
- Notificaciones o avisos importantes (por ejemplo recordatorios de licencia o de contraseña).

Desde aquí se llega al **calendario** y a la creación de publicaciones.

---

## Programar contenido (Calendario)

La sección **Programar** (/schedule) es donde se crea y organiza el contenido:

- **Vista de calendario** por días/semanas: ves las publicaciones programadas y puedes **arrastrar y soltar** para cambiar fecha u hora.
- **Tipos de contenido:** Post, Stream, Evento, Reel.
- **Crear una publicación:** título, texto, y selección de **plataformas** (Twitch, X, Instagram, Discord, YouTube, según lo habilitado).
- **Subir imágenes o vídeos** para adjuntar al contenido (desde **Media** o en el formulario; se respetan los límites de tu plan).
- **Fecha y hora** de publicación: el sistema intentará publicar a esa hora en las plataformas elegidas (si están conectadas y la función está activa).
- Para **eventos en Discord** puedes elegir servidor, canal y opcionalmente un canal de anuncio.
- Puedes **editar** o **eliminar** publicaciones desde el calendario o desde la ficha del contenido.

Para que las publicaciones se envíen solas a cada red, debes tener **conectadas** las cuentas de esas plataformas (ver más abajo).

---

## Lista de tareas (To-do)

En **To-do** (/todos) puedes:

- Crear una **lista de tareas** personal: añadir ítems, marcar como hechos o pendientes y borrarlos.
- Está disponible para **todos los usuarios** (no solo para no administradores).
- Útil para anotar recordatorios o pasos relacionados con tu contenido.

---

## Media (archivos)

En **Media** (/media):

- **Subir imágenes y vídeos** a la nube (Supabase Storage) para usarlos en tus publicaciones.
- Ver el listado de archivos ya subidos y adjuntarlos al crear o editar contenido.
- Los límites de subida dependen de tu plan (trial, pro, etc.).

---

## Plantillas

En **Plantillas** (/templates):

- Crear **plantillas reutilizables** (título, texto, tipo de contenido, plataformas, hashtags).
- Aplicar una plantilla al crear una nueva publicación en el calendario para ahorrar tiempo.
- Las plantillas pueden guardarse también desde el formulario de programar contenido.

---

## Mensajes (soporte)

Si la aplicación tiene **Mensajes** (/messages) para usuarios no administradores:

- Enviar **mensajes de soporte** al equipo.
- Ver el estado de tus conversaciones (no leído, leído, respondido).

---

## Perfil

En **Perfil** (/profile) puedes:

- Ver y **editar tu nombre**, bio, zona horaria e idioma.
- Cambiar tu **foto de perfil**.
- Ver tu **licencia** (tipo y fecha de vencimiento).
- Gestionar **cuentas conectadas** (Google, Twitch, X/Twitter, Discord, YouTube): conectar o desconectar para publicar en cada red.
- Ver **analíticas de rendimiento de publicaciones**: total publicados, fallidos e intentos por plataforma.
- Cambiar **contraseña** (desde **Configuración → Seguridad**).
- Ajustar **notificaciones**, **tema** (claro/oscuro) y **idioma** (español/inglés) en **Configuración**.

---

## Configuración

En **Configuración** (/settings) tienes varias pestañas:

- **Perfil:** nombre, email, enlace de merchandising, foto, opciones del dashboard (Twitch).
- **Notificaciones:** preferencias de avisos.
- **Plataformas:** conectar o desconectar Google, Twitch, Discord, X (Twitter), YouTube. Aquí también puedes elegir el **canal de Discord para clips de Twitch**: los clips que se publiquen automáticamente irán al servidor y canal que configures.
- **Seguridad:** cambiar contraseña.
- **Apariencia:** tema, color de acento, banners de cabecera.
- **Facturación:** ver licencia, comprar o renovar (Stripe), historial de pagos.
- **Soporte:** enviar mensajes al equipo.
- **Datos:** exportar o eliminar cuenta (según lo ofrecido).

---

## Conectar plataformas

Para que el contenido se publique en cada red, debes **vincular** tus cuentas:

- En **Configuración → Plataformas** verás qué redes están conectadas o no.
- Pulsa **Conectar** en la que quieras (por ejemplo Twitch, Discord, X, YouTube). Se abrirá la autorización oficial de esa plataforma; inicia sesión y acepta los permisos.
- **Discord:** para publicar en un servidor, el bot de la aplicación debe estar invitado a ese servidor; el enlace de invitación aparece en la app.
- Cuando esté conectada, podrás elegir esa plataforma al crear o editar una publicación en el calendario.
- Si una cuenta deja de funcionar (token caducado, etc.), la app puede pedirte **desconectar y volver a conectar** esa cuenta.

---

## Idioma y tema

- **Idioma:** se cambia en **Configuración → Perfil** o en el selector de idioma (español / inglés). La interfaz y el **FAQ** se muestran en el idioma elegido.
- **Tema:** en **Configuración → Apariencia** puedes elegir tema claro, oscuro o automático, y el color de acento.

---

## Ayuda y soporte

- **FAQ (preguntas frecuentes):** consulta la [FAQ en español](FAQ_ES.md) o la [FAQ en inglés](FAQ_EN.md), o el enlace **FAQ** en la aplicación (según tu idioma).
- Para **términos de uso**, **privacidad** y **contacto**, consulta los enlaces al pie de la aplicación o la documentación legal del proyecto (*Términos de Servicio*, *Aviso de Copyright*).
- Si encuentras un fallo o tienes una solicitud concreta, contacta con el equipo que gestiona la aplicación (correo o canal indicados en la web).

---

*Última actualización: 2026. Streamer Scheduler – Guía para usuarios.*
