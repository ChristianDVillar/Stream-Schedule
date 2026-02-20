# Permisos del Bot de Discord / Discord Bot Permissions

Este documento explica qué permisos necesita el bot de Discord para funcionar correctamente y cómo configurarlos.

This document explains what permissions the Discord bot needs to work correctly and how to configure them.

---

## 🇪🇸 Español

### ¿Qué permisos necesita el bot?

El bot necesita los siguientes permisos para poder realizar todas sus funciones:

#### ✅ Permisos Requeridos

1. **Ver Canales** (View Channels)
   - Permite al bot ver los canales de tu servidor
   - Necesario para: Listar canales y verificar acceso

2. **Enviar Mensajes** (Send Messages)
   - Permite al bot publicar mensajes en los canales
   - Necesario para: Publicar contenido programado en canales de texto

3. **Insertar Enlaces** (Embed Links)
   - Permite al bot incluir enlaces con vista previa en los mensajes
   - Necesario para: Mostrar imágenes, vídeos y enlaces con formato

4. **Adjuntar Archivos** (Attach Files)
   - Permite al bot enviar imágenes y vídeos como archivos adjuntos
   - Necesario para: Publicar contenido multimedia

5. **Leer Historial de Mensajes** (Read Message History)
   - Permite al bot leer mensajes anteriores en el canal
   - Necesario para: Funciones básicas de Discord

6. **Gestionar Eventos** (Manage Events) ⭐ **IMPORTANTE**
   - Permite al bot crear, modificar y eliminar eventos programados
   - Necesario para: La función principal de programar eventos en Discord

---

### 📝 Cómo Invitar el Bot a tu Servidor

#### Paso 1: Obtener la URL de Invitación

1. Inicia sesión en la aplicación
2. Ve a **Configuración** → **Plataformas** → **Discord**
3. Haz clic en **"Obtener URL de Invitación"** o **"Invitar Bot"**
4. Se abrirá una nueva ventana con la URL de invitación

#### Paso 2: Invitar el Bot

1. Haz clic en la URL de invitación que te proporcionó la aplicación
2. Selecciona el servidor donde quieres agregar el bot
3. **IMPORTANTE:** Verifica que todos los permisos estén marcados:
   - ✅ Ver Canales
   - ✅ Enviar Mensajes
   - ✅ Insertar Enlaces
   - ✅ Adjuntar Archivos
   - ✅ Leer Historial de Mensajes
   - ✅ **Gestionar Eventos** (este es el más importante)
4. Haz clic en **"Autorizar"**

#### Paso 3: Verificar que el Bot Está en el Servidor

1. Abre Discord y ve a tu servidor
2. En la lista de miembros (lado derecho), deberías ver el bot
3. Si no lo ves, verifica que la invitación se completó correctamente

---

### 🔍 Cómo Verificar los Permisos del Bot

#### Verificar Permisos a Nivel de Servidor

1. En Discord, ve a tu servidor
2. Haz clic derecho en el nombre del servidor → **Configuración del servidor**
3. Ve a **Roles** (en el menú izquierdo)
4. Busca el rol del bot (normalmente tiene el mismo nombre que el bot)
5. Haz clic en el rol del bot
6. Desplázate hasta **Permisos del servidor**
7. Verifica que estos permisos estén activados:
   - ✅ Ver Canales
   - ✅ Enviar Mensajes
   - ✅ Insertar Enlaces
   - ✅ Adjuntar Archivos
   - ✅ Leer Historial de Mensajes
   - ✅ **Gestionar Eventos**

#### Verificar Permisos por Canal

Si el bot no puede publicar en un canal específico:

1. Haz clic derecho en el canal → **Editar canal**
2. Ve a la pestaña **Permisos**
3. Busca el bot en la lista o haz clic en **+ Agregar miembros o roles**
4. Selecciona el bot
5. Asegúrate de que estos permisos estén activados:
   - ✅ Ver canal
   - ✅ Enviar mensajes
   - ✅ Adjuntar archivos

---

### 🚨 Problemas Comunes y Soluciones

#### Problema: "El bot no puede enviar mensajes en este canal"

**Solución:**
1. Haz clic derecho en el canal → **Editar canal** → **Permisos**
2. Busca el bot en la lista de permisos
3. Si no está, haz clic en **+ Agregar miembros o roles** y selecciona el bot
4. Activa estos permisos:
   - ✅ Ver canal
   - ✅ Enviar mensajes
   - ✅ Adjuntar archivos

#### Problema: "No se puede crear el evento programado"

**Solución:**
1. Ve a **Configuración del servidor** → **Roles**
2. Selecciona el rol del bot
3. Busca **Gestionar Eventos** en la lista de permisos
4. Si no está activado, actívalo y guarda los cambios
5. Si tu servidor requiere verificación de nivel 2 o superior, asegúrate de que el bot tenga el nivel necesario

#### Problema: "El bot no aparece en la lista de servidores"

**Solución:**
1. Genera una nueva URL de invitación desde la aplicación
2. Asegúrate de completar el proceso de invitación completamente
3. Verifica que seleccionaste el servidor correcto al invitar el bot

---

### 💡 ¿Por qué necesita estos permisos?

- **Ver Canales:** Para saber qué canales existen y en cuáles puede publicar
- **Enviar Mensajes:** Para publicar tu contenido programado
- **Insertar Enlaces:** Para mostrar imágenes y vídeos con formato bonito
- **Adjuntar Archivos:** Para enviar imágenes y vídeos directamente
- **Leer Historial:** Necesario para funciones básicas de Discord
- **Gestionar Eventos:** ⭐ **Este es el más importante** - permite crear eventos programados que aparecen en el calendario de Discord

---

### ✅ Checklist de Configuración

Antes de usar el bot, verifica que:

- [ ] El bot está invitado a tu servidor
- [ ] El bot aparece en la lista de miembros del servidor
- [ ] El bot tiene el permiso **Gestionar Eventos** activado
- [ ] El bot puede enviar mensajes en los canales donde quieres publicar
- [ ] Has probado crear un evento de prueba para verificar que funciona

---

## 🇬🇧 English

### What permissions does the bot need?

The bot needs the following permissions to perform all its functions:

#### ✅ Required Permissions

1. **View Channels**
   - Allows the bot to see your server's channels
   - Needed for: Listing channels and verifying access

2. **Send Messages**
   - Allows the bot to post messages in channels
   - Needed for: Publishing scheduled content to text channels

3. **Embed Links**
   - Allows the bot to include links with previews in messages
   - Needed for: Displaying images, videos, and formatted links

4. **Attach Files**
   - Allows the bot to send images and videos as file attachments
   - Needed for: Publishing multimedia content

5. **Read Message History**
   - Allows the bot to read previous messages in the channel
   - Needed for: Basic Discord functionality

6. **Manage Events** ⭐ **IMPORTANT**
   - Allows the bot to create, modify, and delete scheduled events
   - Needed for: The main feature of scheduling events on Discord

---

### 📝 How to Invite the Bot to Your Server

#### Step 1: Get the Invitation URL

1. Log in to the application
2. Go to **Settings** → **Platforms** → **Discord**
3. Click **"Get Invite URL"** or **"Invite Bot"**
4. A new window will open with the invitation URL

#### Step 2: Invite the Bot

1. Click on the invitation URL provided by the application
2. Select the server where you want to add the bot
3. **IMPORTANT:** Verify that all permissions are checked:
   - ✅ View Channels
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ **Manage Events** (this is the most important one)
4. Click **"Authorize"**

#### Step 3: Verify the Bot is in the Server

1. Open Discord and go to your server
2. In the member list (right side), you should see the bot
3. If you don't see it, verify that the invitation was completed correctly

---

### 🔍 How to Verify Bot Permissions

#### Verify Server-Level Permissions

1. In Discord, go to your server
2. Right-click the server name → **Server Settings**
3. Go to **Roles** (in the left menu)
4. Find the bot's role (usually has the same name as the bot)
5. Click on the bot's role
6. Scroll down to **Server Permissions**
7. Verify that these permissions are enabled:
   - ✅ View Channels
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ **Manage Events**

#### Verify Channel-Specific Permissions

If the bot cannot post in a specific channel:

1. Right-click the channel → **Edit Channel**
2. Go to the **Permissions** tab
3. Find the bot in the list or click **+ Add Members or Roles**
4. Select the bot
5. Make sure these permissions are enabled:
   - ✅ View Channel
   - ✅ Send Messages
   - ✅ Attach Files

---

### 🚨 Common Problems and Solutions

#### Problem: "The bot cannot send messages in this channel"

**Solution:**
1. Right-click the channel → **Edit Channel** → **Permissions**
2. Find the bot in the permissions list
3. If it's not there, click **+ Add Members or Roles** and select the bot
4. Enable these permissions:
   - ✅ View Channel
   - ✅ Send Messages
   - ✅ Attach Files

#### Problem: "Cannot create scheduled event"

**Solution:**
1. Go to **Server Settings** → **Roles**
2. Select the bot's role
3. Find **Manage Events** in the permissions list
4. If it's not enabled, enable it and save changes
5. If your server requires level 2+ verification, make sure the bot has the necessary level

#### Problem: "Bot does not appear in the server list"

**Solution:**
1. Generate a new invitation URL from the application
2. Make sure you complete the invitation process fully
3. Verify that you selected the correct server when inviting the bot

---

### 💡 Why does it need these permissions?

- **View Channels:** To know what channels exist and where it can post
- **Send Messages:** To publish your scheduled content
- **Embed Links:** To display images and videos with nice formatting
- **Attach Files:** To send images and videos directly
- **Read Message History:** Required for basic Discord functionality
- **Manage Events:** ⭐ **This is the most important** - allows creating scheduled events that appear in Discord's calendar

---

### ✅ Setup Checklist

Before using the bot, verify that:

- [ ] The bot is invited to your server
- [ ] The bot appears in the server's member list
- [ ] The bot has the **Manage Events** permission enabled
- [ ] The bot can send messages in the channels where you want to publish
- [ ] You've tested creating a test event to verify it works

---

**Last updated:** February 20, 2026
