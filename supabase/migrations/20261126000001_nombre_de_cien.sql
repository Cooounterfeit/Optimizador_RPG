-- =============================================================================
-- El nombre de un optimizador llega a 100 caracteres.
--
-- POR QUE. El criterio de CFG-05, ya aceptado, fija el maximo del formulario en
-- 100. La tabla se escribio antes, con 80. Mientras nadie guardaba en la cuenta
-- la diferencia no se notaba; desde que hay boton de guardar, un nombre de 90
-- se escribe en el navegador sin problema y revienta al subirlo, con un error
-- de Postgres y no un mensaje del formulario. De los dos numeros, el que manda
-- es el del criterio: el otro no lo pidio nadie.
--
-- SOLO `optimizers.name`. Una version anterior de esta migracion tambien subia
-- `optimizers.game_name`, pero `20261124000001_unificar_juego` elimino esa
-- columna: el nombre del juego dejo de ser texto libre en cada optimizador y
-- vive una sola vez en `public.game`. Aplicar aquella version contra el esquema
-- actual fallaria.
--
-- `game.name` se queda en 80 a proposito. Es otra entidad y otro limite, y la
-- aplicacion recorta ahi, igual que hizo la migracion de relleno al unificar.
--
-- LA VERSION. Nacio como 20261123000001 y chocaba de lleno con
-- `20261123000001_catalogo_juegos`, que entro por otra rama. Supabase indexa
-- las migraciones por ese prefijo, asi que con dos iguales una se habria dado
-- por aplicada y la otra no habria corrido nunca.
-- =============================================================================

alter table public.optimizers drop constraint if exists optimizers_name_check;
alter table public.optimizers
  add constraint optimizers_name_check
  check (char_length(btrim(name)) between 1 and 100);
