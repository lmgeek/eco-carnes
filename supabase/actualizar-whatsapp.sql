-- Ejecutar UNA SOLA VEZ si el proyecto de Supabase ya tenía otro número.
-- Para proyectos nuevos no hace falta: schema.sql ya carga este valor.

update configuracion
set whatsapp = '5491122934235'
where id = 1;

-- El número guardado equivale a +54 9 11 2293-4235.
-- wa.me recibe solo dígitos: https://wa.me/5491122934235
