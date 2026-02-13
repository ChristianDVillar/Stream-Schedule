/**
 * Oculta parcialmente un correo electrónico para mostrar solo una versión segura
 * Ejemplo: "ejemplo@test.com" -> "ej***@test.com"
 * @param {string} email - El correo electrónico a ocultar
 * @returns {string} - El correo parcialmente oculto
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  
  const [localPart, domain] = email.split('@');
  
  if (!domain) return email; // Si no hay dominio, retornar tal cual
  
  // Si la parte local tiene 2 o menos caracteres, mostrar solo el primer carácter
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  
  // Mostrar los primeros 2 caracteres y ocultar el resto
  const visiblePart = localPart.substring(0, 2);
  return `${visiblePart}***@${domain}`;
}

