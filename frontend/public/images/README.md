# Imágenes por tema (light/dark)

Coloca aquí assets que tengan una versión para modo claro y otra para modo oscuro.

**Convención recomendada:**
- `logo-light.png` (o `.svg`) – imagen para modo claro
- `logo-dark.png` (o `.svg`) – imagen para modo oscuro

**Uso en React con el componente ThemeImage:**

```jsx
import ThemeImage from '../components/ThemeImage';

<ThemeImage
  srcLight="/images/logo-light.png"
  srcDark="/images/logo-dark.png"
  alt="Logo"
  className="h-8"
/>
```

Si solo tienes una imagen para ambos modos, usa la prop `src`:

```jsx
<ThemeImage src="/images/logo.png" alt="Logo" className="h-8" />
```
