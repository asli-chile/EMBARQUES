-- Sacar a `anon` de las tablas que no sirven a ninguna página pública.
--
-- La anon key va en el navegador de cualquiera. Todo lo que `anon` pueda leer
-- es, en la práctica, público.
--
-- El criterio no es "hoy esas columnas están vacías". Se revisó `plantas` y sus
-- campos de contacto, teléfono y correo estaban en cero, y con eso se argumentó
-- que no había nada expuesto. Es un mal argumento: la tabla existe para
-- llenarse, y el día que alguien cargue los contactos quedan publicados sin que
-- nada avise. El permiso se decide por lo que la tabla **es**, no por lo que
-- todavía no tiene cargado.
--
-- Qué se queda como está, y por qué: `itinerarios`, `itinerario_escalas`,
-- `naves`, `navieras`, `navieras_naves` y `destinos` las consultan de verdad
-- los endpoints de /api/public/* con `createAnonClient()`. Revocarles el
-- permiso rompe el itinerario público. `conteo_visitas` tampoco se toca: es un
-- contador de una fila, sin dato de nadie, y lo lee el header antes de iniciar
-- sesión.
--
-- Todas las de abajo tienen sus propios GRANT para `authenticated`
-- (comprobado antes de escribir esto), así que el ERP no pierde nada.

-- Datos de negocio: clientes, plantas y depósitos con los que opera ASLI.
REVOKE ALL ON public.empresas FROM anon;
REVOKE ALL ON public.plantas FROM anon;
REVOKE ALL ON public.depositos FROM anon;

-- Catálogos internos. Poco sensibles hoy, pero ninguna página pública los usa,
-- y un permiso que nadie ocupa es superficie de ataque a cambio de nada.
REVOKE ALL ON public.especies FROM anon;
REVOKE ALL ON public.catalogos FROM anon;
REVOKE ALL ON public.puertos_origen FROM anon;

-- `documentos` es el caso más serio de todos: `anon` tenía
-- DELETE, INSERT, UPDATE y TRUNCATE. Hoy RLS no deja pasar nada —comprobado:
-- devuelve 0 de 2 filas—, pero eso deja la tabla sostenida por una sola
-- barrera. Basta una política nueva mal dirigida para que la anon key pueda
-- borrar la metadata de los documentos.
REVOKE ALL ON public.documentos FROM anon;

-- 973 filas de sesiones. RLS las filtra, pero vale la misma razón.
REVOKE ALL ON public.sesiones_activas FROM anon;

-- Verificación: no debe devolver ninguna de las tablas de arriba.
-- SELECT table_name, privilege_type
--   FROM information_schema.role_table_grants
--  WHERE table_schema = 'public' AND grantee = 'anon'
--  ORDER BY table_name;
