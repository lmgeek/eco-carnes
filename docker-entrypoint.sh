#!/bin/sh
set -eu

# Genera js/config.js desde las variables de entorno de Dokploy.
# Así se puede cambiar de proyecto Supabase/Cloudinary sin reconstruir la imagen.

CONFIG_FILE="/usr/share/nginx/html/js/config.js"

escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g"
}

cat > "$CONFIG_FILE" <<EOF
// Generado automáticamente al iniciar el contenedor. No editar a mano.
export const SUPABASE_URL = '$(escape_js "${SUPABASE_URL:-}")';
export const SUPABASE_ANON_KEY = '$(escape_js "${SUPABASE_ANON_KEY:-}")';
export const CLOUDINARY_CLOUD_NAME = '$(escape_js "${CLOUDINARY_CLOUD_NAME:-}")';
export const CLOUDINARY_UPLOAD_PRESET = '$(escape_js "${CLOUDINARY_UPLOAD_PRESET:-}")';
export const CLOUDINARY_FOLDER = '$(escape_js "${CLOUDINARY_FOLDER:-carnes}")';
EOF
