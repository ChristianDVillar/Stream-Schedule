# Streamer Scheduler

Una aplicación web para programar contenido en múltiples plataformas sociales (Twitch, Twitter/X, Instagram, Discord) con una interfaz moderna y fácil de usar.

## 🚀 Tecnologías

### Backend
- **Node.js**
- **Express** - Framework web
- **Sequelize** - ORM para base de datos
- **PostgreSQL / SQLite** - Base de datos
- **JWT** - Autenticación
- **CORS** - Soporte para CORS

### Frontend
- **React 18** - Biblioteca de UI
- **JavaScript** - Lenguaje de programación
- **Tailwind CSS** - Framework de CSS
- **React Router** - Enrutamiento
- **Axios** - Cliente HTTP
- **Lucide React** - Iconos

## 📁 Estructura del Proyecto

```
streamer-scheduler/
├── backend/
│   ├── src/
│   │   ├── app.js          # API Express
│   │   ├── routes/         # Rutas API
│   │   └── models/         # Modelos Sequelize
│   ├── migrations/         # Migraciones Sequelize
│   └── database.sqlite     # Base SQLite local (dev)
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── contexts/       # Contextos de React
│   │   ├── pages/          # Páginas de la aplicación
│   │   ├── App.js          # Componente principal
│   │   └── index.js        # Punto de entrada
│   ├── package.json        # Dependencias de Node.js
│   ├── tailwind.config.js  # Configuración de Tailwind
│   └── postcss.config.js   # Configuración de PostCSS
└── README.md
```

## 🛠️ Instalación

### Prerrequisitos
- Node.js 16 o superior
- npm o yarn

### Backend (Node/Express)

1. **Navegar al directorio del backend:**
   ```bash
   cd backend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar el servidor:**
   ```bash
   npm start
   ```

El backend estará disponible en: http://localhost:5000

### Frontend (React/JavaScript)

1. **Navegar al directorio del frontend:**
   ```bash
   cd frontend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar en modo desarrollo:**
   ```bash
   npm start
   ```

El frontend estará disponible en: http://localhost:3000

## 🎯 Funcionalidades

### 🔐 Autenticación
- Registro de usuarios
- Inicio de sesión
- Gestión de sesiones

### 📅 Programación de Contenido
- Crear contenido con título y descripción
- Programar fecha y hora de publicación
- Seleccionar múltiples plataformas
- Agregar hashtags y menciones
- Cargar archivos multimedia (imágenes y videos)

### 🎨 Interfaz Moderna
- Diseño responsive con Tailwind CSS
- Iconos modernos con Lucide React
- Navegación intuitiva
- Vista previa en tiempo real

### 📊 Dashboard
- Estadísticas de contenido programado
- Lista de contenido con estados
- Acciones rápidas (editar, eliminar)

### ⚙️ Configuración
- Gestión de plataformas sociales
- Configuración de cuenta
- Conexión/desconexión de APIs

## 🔧 Configuración de APIs

Para conectar las plataformas sociales, necesitarás configurar las siguientes APIs:

### Twitch
1. Crear aplicación en [Twitch Developer Console](https://dev.twitch.tv/console)
2. Obtener Client ID y Client Secret
3. Configurar OAuth2

### Twitter/X
1. Crear aplicación en [Twitter Developer Portal](https://developer.twitter.com/)
2. Obtener API Key y API Secret
3. Configurar OAuth2

### Instagram
1. Crear aplicación en [Facebook Developers](https://developers.facebook.com/)
2. Configurar Instagram Basic Display API
3. Obtener Access Token

### Discord
1. Crear aplicación en [Discord Developer Portal](https://discord.com/developers/applications)
2. Obtener Bot Token
3. Configurar permisos

## 🚀 Despliegue

### Frontend (Producción)
```bash
# Construir para producción
npm run build

# Servir archivos estáticos con nginx o similar
```

## 📝 Variables de Entorno

Crear un archivo `.env` en el directorio backend:

```env
PORT=5000
JWT_SECRET=your-jwt-secret
DATABASE_URL=postgres://user:pass@host:5432/dbname
DATABASE_SSL=false
SQLITE_STORAGE=database.sqlite
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa los issues existentes
2. Crea un nuevo issue con detalles del problema
3. Incluye logs de error y pasos para reproducir

## 🔄 Actualizaciones

### v2.0.0 - Migración a JavaScript y SQLAlchemy
- ✅ Migrado de TypeScript a JavaScript
- ✅ Migrado de MongoDB a SQLAlchemy (SQLite)
- ✅ Migrado de Material-UI a Tailwind CSS
- ✅ Simplificado el stack tecnológico
- ✅ Eliminadas dependencias innecesarias
- ✅ Mejorada la experiencia de desarrollo

### Próximas características
- [ ] Integración real con APIs de plataformas
- [ ] Notificaciones push
- [ ] Analytics y métricas
- [ ] Plantillas de contenido
- [ ] Programación recurrente