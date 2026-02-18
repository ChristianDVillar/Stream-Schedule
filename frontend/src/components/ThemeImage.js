import React from 'react';
import { useEffectiveTheme } from '../utils/themeUtils';

/**
 * Renders an <img> that switches between two sources based on theme (light/dark).
 * Use for logos, headers, or any asset that has separate light and dark variants.
 *
 * Props:
 *   srcLight - image URL for light mode (required if no single src)
 *   srcDark  - image URL for dark mode (required if no single src)
 *   src      - optional: use same image for both modes (overrides srcLight/srcDark if both omitted)
 *   alt, className, and other standard img attributes are passed through.
 *
 * Asset convention: place light/dark assets in public/images/, e.g.:
 *   public/images/logo-light.png
 *   public/images/logo-dark.png
 *   <ThemeImage srcLight="/images/logo-light.png" srcDark="/images/logo-dark.png" alt="Logo" />
 */
function ThemeImage({ srcLight, srcDark, src, alt = '', className, ...rest }) {
  const theme = useEffectiveTheme();
  const resolvedSrc =
    src != null
      ? src
      : theme === 'dark'
        ? (srcDark ?? srcLight)
        : (srcLight ?? srcDark);

  if (resolvedSrc == null) return null;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      {...rest}
    />
  );
}

export default ThemeImage;
