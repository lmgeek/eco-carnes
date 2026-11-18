/**
 * Configuración del proyecto.
 *
 * Rellena estos valores con los de tu cuenta. Mientras estén vacíos, la app
 * arranca en "modo demostración" con productos de ejemplo guardados en el
 * navegador, para que puedas probar la interfaz sin crear cuentas.
 *
 * Nunca pongas aquí la clave service_role de Supabase: esta información
 * viaja al navegador. Solo la clave anon / public.
 */

// Supabase → Project Settings → API
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

// Cloudinary → Dashboard → Cloud name
export const CLOUDINARY_CLOUD_NAME = '';

// Cloudinary → Settings → Upload presets → preset unsigned
export const CLOUDINARY_UPLOAD_PRESET = '';

// Carpeta donde se guardan las fotos (debe estar permitida en el preset).
export const CLOUDINARY_FOLDER = 'carnes';
