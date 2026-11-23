-- =============================================================================
-- `ensure_game`: el autor de un optimizador puede estrenar juego.
--
-- EL PROBLEMA. `game_insert` exige `is_admin()`, asi que un usuario normal no
-- puede crear un juego en el catalogo. Desde que `20261124000001_unificar_juego`
-- dejo `optimizers.game_id` como not null, eso significa que quien crea un
-- optimizador de un juego que todavia no esta en el catalogo NO PUEDE GUARDARLO.
-- Con un solo juego sembrado, eso es casi todo el mundo.
--
-- POR QUE ASI Y NO ABRIENDO LA POLITICA. Que crear juegos sea cosa de
-- administradores es una decision deliberada: evita que el catalogo se llene de
-- duplicados y de nombres de prueba. Esta funcion no la deshace. El insert
-- directo sigue siendo solo de administradores; lo que se abre es un camino
-- estrecho y validado, que es justo para lo que existe `security definer`.
--
-- QUE GARANTIZA.
--   - Hace falta sesion. Sin `auth.uid()` no registra nada.
--   - Reutiliza antes de crear, con la misma normalizacion que el indice unico
--     del catalogo (`lower(btrim(name))`), asi que no genera duplicados.
--   - Recorta el nombre a 80, que es lo que admite la columna, igual que hizo
--     la migracion de relleno al unificar el juego.
--   - Deja rastro de quien lo creo en `created_by`.
--   - Si dos usuarios estrenan el mismo juego a la vez, el segundo choca contra
--     el indice unico y se queda con el del primero, en vez de fallar.
-- =============================================================================

create or replace function public.ensure_game(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := left(btrim(coalesce(p_name, '')), 80);
  v_id     uuid;
  v_base   text;
  v_slug   text;
  v_n      int := 1;
begin
  if auth.uid() is null then
    raise exception 'hace falta una sesion para registrar un juego';
  end if;

  if char_length(v_nombre) = 0 then
    raise exception 'el nombre del juego no puede estar vacio';
  end if;

  -- Reutilizar antes que crear: misma normalizacion que `game_name_unique`.
  select id into v_id
    from public.game
   where lower(btrim(name)) = lower(btrim(v_nombre));
  if v_id is not null then
    return v_id;
  end if;

  -- El slug tiene un check de forma, asi que esto no es cosmetica. Se quitan
  -- los acentos a mano para no depender de la extension `unaccent`.
  v_base := translate(
    lower(v_nombre),
    'áàäâãéèëêíìïîóòöôõúùüûñç',
    'aaaaaeeeeiiiiooooouuuunc'
  );
  v_base := btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-');
  if char_length(v_base) = 0 then
    v_base := 'juego';
  end if;
  v_base := left(v_base, 76);

  loop
    v_slug := case when v_n = 1 then v_base else v_base || '-' || v_n end;

    begin
      insert into public.game (slug, name, created_by)
      values (v_slug, v_nombre, auth.uid())
      returning id into v_id;
      return v_id;
    exception
      when unique_violation then
        -- Puede haber chocado el nombre (otro lo creo a la vez) o el slug (otro
        -- juego distinto ya lo usaba). Si fue el nombre, ese es el que sirve.
        select id into v_id
          from public.game
         where lower(btrim(name)) = lower(btrim(v_nombre));
        if v_id is not null then
          return v_id;
        end if;

        v_n := v_n + 1;
        if v_n > 20 then
          raise exception 'no se pudo generar un identificador libre para "%"', v_nombre;
        end if;
    end;
  end loop;
end;
$$;

-- Solo con sesion. `public` incluye a `anon`, y un anonimo no tiene por que
-- poder escribir en el catalogo por ninguna via.
revoke all on function public.ensure_game(text) from public;
grant execute on function public.ensure_game(text) to authenticated;
