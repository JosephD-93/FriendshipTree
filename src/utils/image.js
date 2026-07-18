/** Detect an image MIME type from a raw base64 byte signature. */
export function detectImageMimeFromBase64(base64String) {
  if (!base64String) return 'image/jpeg';
  if (base64String.startsWith('/9j/')) return 'image/jpeg';
  if (base64String.startsWith('iVBORw0KG')) return 'image/png';
  if (base64String.startsWith('R0lGOD')) return 'image/gif';
  if (base64String.startsWith('UklGR')) return 'image/webp';
  if (base64String.startsWith('Qk')) return 'image/bmp';
  return 'image/jpeg';
}
