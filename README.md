# Streamer Scheduler

Una aplicación web para programar contenido en múltiples plataformas sociales (Twitch, Twitter/X, Instagram, Discord) con una interfaz moderna y fácil de usar.

## 🚀 Tecnologías

### Backend
- **Python 3.8+**
- **Flask** - Framework web
- **SQLAlchemy** - ORM para base de datos
- **SQLite** - Base de datos
- **Flask-Login** - Autenticación de usuarios
- **Flask-CORS** - Soporte para CORS

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
│   ├── app.py              # Aplicación Flask principal
│   ├── requirements.txt    # Dependencias de Python
│   └── streamer_scheduler.db # Base de datos SQLite
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
- Python 3.8 o superior
- Node.js 16 o superior
- npm o yarn

### Backend (Python/Flask)

1. **Navegar al directorio del backend:**
   ```bash
   cd backend
   ```

2. **Crear entorno virtual (opcional pero recomendado):**
   ```bash
   python -m venv venv
   ```

3. **Activar el entorno virtual:**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

4. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Ejecutar el servidor:**
   ```bash
   python app.py
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

### Backend (Producción)
```bash
# Instalar gunicorn
pip install gunicorn

# Ejecutar con gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Frontend (Producción)
```bash
# Construir para producción
npm run build

# Servir archivos estáticos con nginx o similar
```

## 📝 Variables de Entorno

Crear un archivo `.env` en el directorio backend:

```env
SECRET_KEY=your-secret-key-here
FLASK_ENV=development
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