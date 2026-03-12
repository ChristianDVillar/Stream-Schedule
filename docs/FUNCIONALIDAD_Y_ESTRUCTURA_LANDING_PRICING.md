# Streamer Scheduler — Landing & Pricing (Funcionamiento y estructura)

Documento breve que explica cómo están organizadas y qué muestran la **Landing page** y la **Pricing page** de la app, sin sustituir al documento técnico principal (`FUNCIONALIDAD_Y_ESTRUCTURA.md`).

---

## 1. Landing page (`/`)

### 1.1 Objetivo

- Presentar Streamer Scheduler como una herramienta de automatización para streamers (calendario + anuncios + overlays).
- Explicar el producto de forma visual, rápida y sin números de usuarios (pre‑lanzamiento).
- Llevar a los usuarios a **Sign up / Get started** y a ver cómo funciona el flujo “creo un stream → mis viewers se enteran en todas partes”.

### 1.2 Estructura visual

- **Hero section**
  - Título orientado a beneficio (“Automate your streams…”).
  - Subtítulo corto explicando el valor (calendario + anuncios + bots).
  - Botones principales: empezar (registro/login) y ver cómo funciona.
  - Fondo con gradiente suave + elementos de producto (mock del calendario/horario).

- **Barra de “social proof” sin métricas**
  - Logos de plataformas (Twitch, YouTube, Discord, Instagram, X) para transmitir integración y confianza, sin mostrar contadores de usuarios.

- **Sección “Product motion”**
  - Componente `ProductMotionSteps` con pasos animados (ej. “Planifica tu stream → Anuncia en Discord/X → Muestra overlay en directo”).
  - Cada paso resalta una parte clave de la automatización.

- **Previews del producto**
  - Vista del **Dashboard** con calendario semanal y bloques de Twitch/Discord.
  - Resumen de la **página pública del streamer** (`/streamer/:username`): próximo stream, horario semanal, botón “Notify me”.
  - Mock de los **overlays** (Next stream, Goal, Weekly schedule, Quote, Suggestions) como si estuvieran encima de un stream de OBS.

- **Sección “Built for streamers”**
  - Lista de problemas típicos del streamer (olvidar anunciar, horarios caóticos, etc.).
  - Cada punto se enlaza mentalmente con una funcionalidad existente (recordatorios, página pública, bots, overlays).

- **Sección de integraciones**
  - Muestra las plataformas soportadas: Twitch, Discord, YouTube, X, Slack (workspace streaming), Instagram (como destino de contenido).
  - Aclara que el objetivo es centralizar la programación y automatizar anuncios/canales.

- **CTA final**
  - Repite mensaje de producto.
  - Botón claro para crear cuenta o iniciar sesión.

### 1.3 Comportamiento / detalles UX

- Colores alineados con el Dashboard: se usan `text-accent`, `bg-accent`, `bg-gray-50`/`bg-gray-100` para evitar demasiadas secciones blancas.
- Se prioriza el scroll vertical con secciones bien delimitadas, sin sobrecargar con texto técnico.
- Las capturas y mocks no son “pixel perfect” del dashboard real, pero comunican:
  - Horario semanal.
  - Página pública + botón de recordatorio.
  - Overlays con “Powered by Streamer Scheduler”.

---

## 2. Pricing page (`/pricing`)

### 2.1 Objetivo

- Explicar los **planes** y justificación de valor sin depender de una gran base de usuarios.
- Responder a:
  - “¿Qué gano pagando frente a usarlo gratis / solo el calendario?”
  - “¿Qué pasa si soy un streamer pequeño?”

### 2.2 Estructura

- **Hero de precios**
  - Título claro (“Elige el plan que se adapta a tu stream” o similar).
  - Subtítulo que menciona automatización, tiempo ahorrado y menos estrés al programar.

- **Tarjetas de planes**
  - Plan pensado para:
    - Streamers que empiezan (puede incluir capa gratuita o trial).
    - Streamers que ya streamean varias veces a la semana y quieren automatizar anuncios/overlays.
  - Cada tarjeta incluye:
    - Nombre del plan.
    - Precio (cuando se defina), frecuencia y breve descripción.
    - Lista de características alineadas con la funcionalidad real:
      - Calendario y programación multi‑plataforma.
      - Página pública del streamer + botón “Notify me”.
      - Integraciones de bots (webhooks, API key única).
      - Overlays para OBS/Streamlabs.
      - Slack workspace setup (en planes superiores, si aplica).

- **Sección de valor para streamers pequeños**

  Aunque el producto está diseñado para escalar, la página de precios debe dejar claro:

  - Que incluso con pocos viewers, tener un horario claro y anuncios coherentes ayuda a crecer.
  - Que los overlays con “Next stream” y la página pública aportan profesionalidad sin requerir un equipo técnico.
  - Que pueden empezar con poco riesgo (trial / plan base).

### 2.3 Comportamiento / UX

- Misma paleta que la landing y dashboard, evitando contrastes bruscos.
- Botón principal en cada tarjeta redirige al flujo de checkout (Stripe) o a signup si el usuario no está autenticado.
- Secciones adicionales (si se usan) para:
  - Preguntas frecuentes de precios (relación con la FAQ general).
  - Contacto/soporte para dudas de facturación.

---

## 3. Relación con el resto de la app

- La **Landing** y la **Pricing** son páginas puramente públicas: no requieren autenticación y su objetivo es convertir tráfico en registros.
- Todo lo que se muestra en estas páginas está respaldado por la funcionalidad descrita en `FUNCIONALIDAD_Y_ESTRUCTURA.md`:
  - Calendario y contenido programado.
  - Página pública del streamer.
  - Webhooks y comandos de chat.
  - Overlays para OBS/Streamlabs.
  - Integraciones (Twitch, Discord, YouTube, Slack, etc.).
- Este archivo sirve como resumen de “cómo se ve” y “qué comunica” la capa de marketing (landing/pricing) sobre la base técnica ya documentada.

