# Pasos siguientes

Documento unificado: roadmap, evaluación, prioridades, integraciones pendientes y próximos pasos para Streamer Scheduler.  
*Última actualización: marzo 2026*

---

## 1. Posicionamiento y mensaje

- **Mensaje:** *Schedule your streams once. We promote them everywhere automatically.*
- **Core:** Stream automation (planificación + anuncios automáticos). Bots, overlays, ideas y timeline son extras integrados.
- **Pricing (referencia):** Free €0 · Starter €7/mes · Pro €15/mes. Mercado: ~7–8M streamers mensuales en Twitch; foco en creadores independientes.

---

## 2. Evaluación estratégica (resumen)

| Dimensión        | Valoración   |
|------------------|-------------|
| Producto         | ⭐⭐⭐⭐☆ (4/5) |
| Arquitectura     | ⭐⭐⭐⭐☆ (4/5) |
| Mercado          | ⭐⭐⭐☆☆ (3/5) |
| Producto–mercado fit | ⭐⭐⭐☆☆ (3/5) |

**Conclusión:** No priorizar más código; priorizar **enfoque de producto, onboarding y growth loop**. Fortalezas: API para bots, overlays, página pública, recordatorios, Slack. Problemas a abordar: mensaje único, killer feature (auto stream promotion), onboarding más corto, viral loop en overlays/página pública.

---

## 3. Plan para convertirlo en un SaaS viable

1. **Reposicionar** — Mensaje claro: *Schedule once, promote everywhere.* Core = stream automation.
2. **Simplificar onboarding** — signup → connect Twitch → create stream → done; luego Discord y overlay.
3. **Auto-promotion engine** — Al crear stream: auto-publicar en Discord, X, YouTube, página (plantillas).
4. **Viral loop** — “Powered by Streamer Scheduler” + CTA en overlays y página pública.
5. **Métricas para streamers** — Analytics simples: streams/mes, mejor día, consistencia.

---

## 4. Roadmap por fases

| Fase   | Enfoque |
|--------|--------|
| **1. Activación (0–2 meses)** | Onboarding guiado (wizard, progreso), demo interactiva, first stream generator, dashboard con Next Stream / Countdown. |
| **2. Feature killer (2–4 meses)** | Anuncios automáticos al programar stream (Discord, X, YouTube); panel “Auto announcements”. |
| **3. Growth (4–6 meses)** | Overlay con marca, página pública viral, notificaciones viewers (Discord/Telegram/email). |
| **4. Monetización (6–12 meses)** | Planes Free/Creator/Pro definidos; analytics; Twitch extension, OBS plugin, marketplace comandos (visión). |

---

## 5. Prioridades de implementación

**Alta:** Onboarding wizard, auto first stream, auto announcements, auto live announcements, advanced reminders (1h/30m/10m), analytics básicos.

**Media:** Notificaciones viewers (Discord/Telegram), mejor horario para streamear, marketplace de comandos, editor visual de overlays.

**Baja:** Leaderboard viewers, nuevos widgets overlay, API pública desarrolladores.

---

## 6. Roadmap técnico (30 ítems, resumido)

- **Onboarding (1–5):** onboarding-status/step, demo calendario, auto-create-first-stream, importar desde Twitch, setup score.
- **Automatización (6–10):** AnnouncementTemplate, stream/live webhook, social_post, reminder settings (1h/30m/10m), multi-platform sync.
- **Engagement (11–15):** notificaciones Discord/Telegram viewers, votación ideas, leaderboard, panel comunidad, challenges.
- **Analytics (16–20):** streams/semana, mejor día, comparación semanal, rendimiento anuncios, heatmap calendario.
- **Bots/overlays (21–25):** marketplace comandos, editor overlays, themes, nuevos widgets, overlay stats API.
- **Escalabilidad (26–30):** BullMQ/Redis (ya en uso para reminders), cache Redis endpoints públicos, rate limit por API key, tabla AppEvent, API pública.

---

## 7. Infraestructura técnica pendiente

- Colas: BullMQ + Redis ya usados para recordatorios; extender para anuncios/webhooks si hace falta.
- Cache Redis o CDN para `/streamer/:username` y `/overlay/*`.
- Rate limiting por API key (y por plan), no solo por IP.
- Métricas: tabla de eventos (stream_created, overlay_loaded, reminder_sent).

---

## 8. Qué NO construir ahora

- Generador de ideas con IA.
- Automatización Slack avanzada.
- Sistema de mensajes interno complejo.
- Sistema de medios complejo.
- Timeline avanzado.

**Primero:** usuarios, activación, retención.

---

## 9. Integraciones pendientes

### Instagram

- **Estado:** Deshabilitado por defecto (no se ofrece en Schedule hasta que un admin lo active). Constantes, validación, formateo, rate limit, Integration y UI ya listos.
- **Falta:** OAuth (autorize + callback), guardar/refresh token en `Integration`, rama `platform === 'instagram'` en `platformPublisher.js` (Graph API: media container + publish). Requisitos: cuenta Instagram Business/Creator, página Facebook, app en Meta for Developers, App Review para producción.
- **Cuándo habilitar:** Tras implementar OAuth + publicación + env (p. ej. `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`), activar en Admin → Plataformas.

### Otras (visión)

- Kick, TikTok, YouTube Live, extensiones Twitch, plugins OBS según demanda.

---

## 10. Resumen temporal (quarters)

| Q1 | Activación: wizard, demo, dashboard, primer stream automático. |
| Q2 | Feature killer: automatic announcements, templates. |
| Q3 | Growth: overlays virales, notificaciones viewers. |
| Q4 | Escala: analytics, Twitch extension, OBS plugin, marketplace. |

---

## Referencias

- **Funcionalidad y estructura actual:** `FUNCIONALIDAD_Y_ESTRUCTURA.md`
- **Funcionalidad, estructura, landing/pricing y checkout:** `FUNCIONALIDAD_Y_ESTRUCTURA.md`
- **Guías de usuario / FAQ:** `USER-GUIDE.md`, `GUIA-USUARIOS.md`, `FAQ_ES.md`, `FAQ_EN.md`
