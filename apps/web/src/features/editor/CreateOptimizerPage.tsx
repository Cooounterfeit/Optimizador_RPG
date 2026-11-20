import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
// Las tres clases son presentacion generica de formulario, no algo de auth:
// se importan para no tener dos definiciones del mismo campo que se separen.
import { errorClass, fieldClass, labelClass } from '../auth/AuthShell';
import { getGameRepository } from '../game/repositories';

import { editorCopy } from './copy';
import { buildSkeleton, slugify, uniqueGameId } from './skeleton';

/**
 * Crear un optimizador desde cero (CFG-05)
 * ========================================
 * Tres campos y nada mas. La tentacion aqui es pedir ya las estadisticas y las
 * ranuras, y es justo lo que hay que evitar: un formulario largo antes de ver
 * nada hecho es donde la gente abandona. Esto crea un juego valido pero vacio
 * y lleva derecho al workspace, que es donde se sigue trabajando.
 *
 * El juego nace LOCAL, en este navegador, sin pedir cuenta. Publicarlo —que si
 * exige sesion, porque la politica RLS cuelga de `auth.uid()`— es otra historia
 * y vive en la epica del hub.
 */
export function CreateOptimizerPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError(editorCopy.create.nameRequired);
      return;
    }

    setPending(true);
    try {
      const games = getGameRepository();
      // Dos juegos pueden llamarse igual; lo que no puede repetirse es el id.
      const taken = (await games.list()).map((row) => row.id);
      const gameId = uniqueGameId(slugify(trimmed), taken);
      const template = buildSkeleton({ name: trimmed, description, category }, gameId);

      await games.save({ id: gameId, template });
      navigate(`/optimizer/${gameId}`, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : editorCopy.create.failed);
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-[420px] px-6 py-20">
      <h1 className="mb-2 text-2xl font-extrabold tracking-[-0.03em]">
        {editorCopy.create.title}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">{editorCopy.create.lede}</p>

      <form onSubmit={onSubmit} noValidate>
        {error ? (
          <p className={errorClass} role="alert">
            {error}
          </p>
        ) : null}

        <label className={labelClass} htmlFor="create-name">
          {editorCopy.create.name}
        </label>
        <input
          id="create-name"
          className={fieldClass}
          type="text"
          maxLength={80}
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-describedby="create-name-hint"
        />
        <p id="create-name-hint" className="mt-1.5 text-[12px] text-muted-foreground">
          {editorCopy.create.nameHint}
        </p>

        <label className={`${labelClass} mt-4`} htmlFor="create-description">
          {editorCopy.create.description}
        </label>
        <input
          id="create-description"
          className={fieldClass}
          type="text"
          maxLength={200}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-describedby="create-description-hint"
        />
        <p id="create-description-hint" className="mt-1.5 text-[12px] text-muted-foreground">
          {editorCopy.create.descriptionHint}
        </p>

        <label className={`${labelClass} mt-4`} htmlFor="create-category">
          {editorCopy.create.category}
        </label>
        <input
          id="create-category"
          className={fieldClass}
          type="text"
          maxLength={40}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-describedby="create-category-hint"
        />
        <p id="create-category-hint" className="mt-1.5 text-[12px] text-muted-foreground">
          {editorCopy.create.categoryHint}
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? editorCopy.create.pending : editorCopy.create.submit}
          </Button>
          <Link
            to="/"
            className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {editorCopy.create.cancel}
          </Link>
        </div>

        <p className="mt-6 text-[12px] text-muted-foreground">{editorCopy.create.draftNote}</p>
      </form>
    </div>
  );
}
