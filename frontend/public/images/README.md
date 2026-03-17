# Imágenes del Proyecto / Project Images

Este directorio contiene imágenes estáticas que se usan en la aplicación, especialmente aquellas que tienen versiones para modo claro y oscuro.

This directory contains static images used in the application, especially those with light and dark mode versions.

---

## 📁 Estructura de Directorios / Directory Structure

```
frontend/public/
├── images/          ← Este directorio (imágenes con tema)
│   ├── logo-light.png
│   ├── logo-dark.png
│   └── README.md
├── blacklogo.png    ← Logo principal (tema claro) / favicon
├── logo192.png      ← Icono PWA (192x192)
├── logo512.png      ← Icono PWA (512x512)
└── favicon.ico      ← Favicon del navegador
```

---

## 🎨 Imágenes con Tema (Light/Dark)

### Convención de Nombres / Naming Convention

Para imágenes que tienen versiones diferentes según el tema:

- **Español:** `nombre-light.png` y `nombre-dark.png`
- **English:** `name-light.png` and `name-dark.png`

**Ejemplos / Examples:**
- `logo-light.png` / `logo-dark.png`
- `header-light.svg` / `header-dark.svg`
- `banner-light.jpg` / `banner-dark.jpg`

### Formatos Soportados / Supported Formats

- ✅ PNG (recomendado para logos con transparencia)
- ✅ SVG (recomendado para iconos y gráficos vectoriales)
- ✅ JPG/JPEG (para fotografías)
- ✅ WebP (moderno, mejor compresión)

---

## 🔧 Uso del Componente ThemeImage

### Importar el Componente

```jsx
import ThemeImage from '../components/ThemeImage';
```

### Imágenes con Versiones Light/Dark

```jsx
<ThemeImage
  srcLight="/images/logo-light.png"
  srcDark="/images/logo-dark.png"
  alt="Logo de la aplicación"
  className="h-8 w-auto"
/>
```

### Imagen Única (Sin Variantes)

Si solo tienes una imagen que funciona para ambos modos:

```jsx
<ThemeImage 
  src="/images/logo.png" 
  alt="Logo" 
  className="h-8" 
/>
```

### Con Props Adicionales

Puedes pasar cualquier prop estándar de `<img>`:

```jsx
<ThemeImage
  srcLight="/images/banner-light.png"
  srcDark="/images/banner-dark.png"
  alt="Banner promocional"
  className="w-full h-auto rounded-lg"
  loading="lazy"
  width={800}
  height={200}
/>
```

---

## 📝 Mejores Prácticas / Best Practices

### ✅ Recomendaciones

1. **Optimización:**
   - Comprime las imágenes antes de agregarlas
   - Usa SVG para iconos y gráficos simples
   - Usa WebP para fotografías cuando sea posible
   - Mantén tamaños razonables (< 500KB por imagen)

2. **Nombres de Archivos:**
   - Usa nombres descriptivos en minúsculas
   - Separa palabras con guiones: `mi-imagen-light.png`
   - Mantén consistencia: siempre `-light` y `-dark`

3. **Accesibilidad:**
   - Siempre incluye texto alternativo (`alt`)
   - Usa texto descriptivo, no genérico como "imagen"

4. **Rendimiento:**
   - Usa `loading="lazy"` para imágenes fuera del viewport
   - Especifica `width` y `height` para evitar layout shift

### ❌ Evitar

- ❌ Nombres genéricos como `image1.png`
- ❌ Archivos muy grandes (> 1MB)
- ❌ Imágenes sin texto alternativo
- ❌ Mezclar convenciones de nombres

---

## 🖼️ Otras Imágenes del Proyecto

### Logo Principal (`/blacklogo.png`)

- **Ubicación:** `frontend/public/blacklogo.png` (tema claro). `whitelogo.png` para tema oscuro (header en App.js).
- **Uso:** Logo principal, favicon, icono de la aplicación
- **Tamaño recomendado:** 512x512px
- **Referencias:**
  - `frontend/public/index.html` (favicon)
  - `frontend/public/manifest.json` (PWA icon)
  - `frontend/src/App.js` (logo en header: blacklogo / whitelogo según tema)
  - `frontend/src/pages/AdminDashboard.js` (logo en PDF de exportación)

### Iconos PWA

- **`logo192.png`:** 192x192px para PWA
- **`logo512.png`:** 512x512px para PWA
- **Ubicación:** `frontend/public/`

### Favicon

- **`favicon.ico`:** Icono del navegador
- **Ubicación:** `frontend/public/favicon.ico`

---

## 🎯 Iconos de Plataformas / Platform Icons

Los iconos de plataformas sociales (Discord, Twitch, Twitter, Google) se manejan de diferentes formas:

### Discord

- **Fuente:** URL externa (Icons8)
- **Constante:** `DISCORD_ICON_URL` en `src/constants/platforms.js`
- **Uso:** Se carga desde CDN externo

### Otras Plataformas

- **Fuente:** Componentes SVG inline
- **Ubicación:** Definidos directamente en componentes
- **Archivos:** `src/pages/Login.js`, `src/pages/Settings/SettingsPlatformsTab.js`

**Nota:** Si quieres usar imágenes locales para iconos de plataformas, puedes agregarlas aquí y actualizar los componentes.

---

## 📚 Ejemplos Completos / Complete Examples

### Ejemplo 1: Logo en Header

```jsx
import ThemeImage from '../components/ThemeImage';

function Header() {
  return (
    <header className="bg-white dark:bg-gray-800">
      <ThemeImage
        srcLight="/images/logo-light.png"
        srcDark="/images/logo-dark.png"
        alt="Streamer Scheduler"
        className="h-10 w-auto"
      />
    </header>
  );
}
```

### Ejemplo 2: Banner Promocional

```jsx
<ThemeImage
  srcLight="/images/promo-banner-light.jpg"
  srcDark="/images/promo-banner-dark.jpg"
  alt="Oferta especial de lanzamiento"
  className="w-full rounded-lg shadow-lg"
  loading="lazy"
/>
```

### Ejemplo 3: Imagen Simple

```jsx
<ThemeImage
  src="/images/illustration.png"
  alt="Ilustración descriptiva"
  className="max-w-md mx-auto"
/>
```

---

## 🔍 Verificación / Verification

### Checklist antes de Agregar Imágenes

- [ ] ¿La imagen tiene versión light y dark? → Usa `srcLight` y `srcDark`
- [ ] ¿Solo hay una versión? → Usa `src`
- [ ] ¿Está optimizada? → Comprimida y tamaño razonable
- [ ] ¿Tiene texto alternativo? → Incluye `alt` descriptivo
- [ ] ¿Sigue la convención de nombres? → `nombre-light.png` / `nombre-dark.png`
- [ ] ¿Está en el directorio correcto? → `public/images/`

---

## 📖 Referencias / References

- **Componente ThemeImage:** `src/components/ThemeImage.js`
- **Utilidades de tema:** `src/utils/themeUtils.js`
- **Constantes de plataformas:** `src/constants/platforms.js`

---

## 🆘 Solución de Problemas / Troubleshooting

### La imagen no cambia con el tema

**Causa:** No estás usando el componente `ThemeImage` o las rutas son incorrectas.

**Solución:**
1. Verifica que estás usando `<ThemeImage>` en lugar de `<img>`
2. Verifica que las rutas empiezan con `/images/`
3. Verifica que los archivos existen en `public/images/`

### La imagen no se muestra

**Causa:** Ruta incorrecta o archivo no existe.

**Solución:**
1. Verifica que la ruta es `/images/nombre-archivo.png` (no `./images/` o `../images/`)
2. Verifica que el archivo existe en `frontend/public/images/`
3. Reinicia el servidor de desarrollo si acabas de agregar el archivo

### La imagen se ve pixelada

**Causa:** Imagen de baja resolución o escalada incorrectamente.

**Solución:**
1. Usa imágenes de alta resolución (2x o 3x para pantallas Retina)
2. Usa SVG para gráficos vectoriales
3. Evita escalar imágenes más allá de su tamaño original

---

**Última actualización / Last updated:** 20 de febrero de 2026
