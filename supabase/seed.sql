-- =============================================================================
-- Datos iniciales del catalogo
-- =============================================================================
-- No es una migracion: es el `seed.sql` que Supabase aplica despues de las
-- migraciones en un `db reset` local. Se separa por dos razones:
--
--   * el esquema y los datos cambian por motivos distintos y a ritmos distintos;
--   * los tests de RLS solo leen `migrations/*.sql`, asi que sembrar aqui no
--     provoca colisiones con los generos que insertan las pruebas.
--
-- Idempotente (`on conflict do nothing`): se puede correr las veces que haga
-- falta. El catalogo de produccion lo sigue administrando una persona con rol
-- `admin`; esto solo evita que un proyecto nuevo arranque sin nada.
--
-- Solo se siembra el juego sintetico que ya trae el repositorio. Los titulos
-- reales son una decision editorial, no de esquema: no se inventan aca.
-- =============================================================================

insert into public.genre (name, description) values
  ('Action RPG',     'Combate en tiempo real con progresion por atributos.'),
  ('Gacha',          'Personajes y equipo obtenidos por sorteo.'),
  ('Roguelike',      'Mazmorras generadas y muerte permanente.'),
  ('Looter shooter', 'Disparos con botin aleatorio y estadisticas.'),
  ('Deckbuilder',    'Construccion de mazo como mecanica central.')
on conflict do nothing;

insert into public.game (slug, name, description) values
  ('astral-forge', 'Astral Forge',
   'Juego sintetico de demostracion: armas, artefactos y una formula de dano no lineal.')
on conflict do nothing;

-- Astral Forge es el juego de ejemplo que la app ya publica en
-- `apps/web/public/seeds/gacha-demo.zenith.json`, y es de genero Gacha.
insert into public.game_genre (game_id, genre_id)
select j.id, g.id
  from public.game j
  join public.genre g on lower(btrim(g.name)) = 'gacha'
 where j.slug = 'astral-forge'
on conflict do nothing;
