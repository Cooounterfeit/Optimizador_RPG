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
-- `game_name` sube tambien. Los dos salen del mismo nombre de la plantilla, asi
-- que dejar uno en 80 solo cambiaria cual de los dos checks falla.
--
-- `cloud_inventory.game_name` NO se toca: ahi el nombre llega por otra via y no
-- lo escribe este formulario.
-- =============================================================================

alter table public.optimizers drop constraint if exists optimizers_name_check;
alter table public.optimizers
  add constraint optimizers_name_check
  check (char_length(btrim(name)) between 1 and 100);

alter table public.optimizers drop constraint if exists optimizers_game_name_check;
alter table public.optimizers
  add constraint optimizers_game_name_check
  check (char_length(btrim(game_name)) between 1 and 100);
