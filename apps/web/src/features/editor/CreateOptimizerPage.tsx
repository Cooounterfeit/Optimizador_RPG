import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
// Las tres clases son presentacion generica de formulario, no algo de auth:
// se importan para no tener dos definiciones del mismo campo que se separen.
import { errorClass, fieldClass, labelClass } from '../../components/ui/form';
import { getGameRepository } from '../game/repositories';

import { editorCopy } from './copy';
import { nameProblem, type NameProblem } from './name-rules';
import { buildSkeleton, slugify, uniqueGameId } from './skeleton';

/**
 * Crear un optimizador desde cero (CFG-05)
 * ========================================
 * Tres campos y nada mas. La tentacion aqui es pedir ya las estadisticas y las
 * ranuras, y es justo lo que hay que evitar: un formulario largo antes de ver
 * nada hecho es donde la gente abandona. Esto crea un juego valido pero vacio
 * y lleva derecho al workspace, que es donde se sigue trabajando.
 *
 * El juego nace LOCAL, en este navegador, sin pedir cuenta. Publicarlo si
 * exige sesion, porque la politica RLS cuelga de `auth.uid()`, y es otra historia
 * y vive en la epica del hub.
 *
 * Las reglas del nombre viven en `skeleton.ts` y no aqui: asi se prueban sin
 * montar el formulario, y el dia que el editor pida el nombre desde otro sitio
 * no hay dos versiones de la misma regla.
 */

/** El codigo que devuelve `nameProblem`, traducido a lo que lee el usuario. */
const NAME_MESSAGE: Record<NameProblem, string> = {
  required: editorCopy.create.nameRequired,
  tooLong: editorCopy.create.nameTooLong,
  badChars: editorCopy.create.nameChars,
  taken: editorCopy.create.nameTaken,
};
export function CreateOptimizerPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  /**
   * Lo que se avisa MIENTRAS escribe. Solo lo que depende de lo tecleado: que
   * el campo este vacio no es un error hasta que intenta enviar, y si el nombre
   * ya existe no se sabe sin consultar.
   */
  const typing = nameProblem(name, { restrictChars: true });
  const warning =
    typing === 'badChars' || typing === 'tooLong' ? NAME_MESSAGE[typing] : null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = name.trim();

    // Primero lo que se resuelve sin tocar la base, para no leerla en vano.
    const offline = nameProblem(trimmed, { restrictChars: true });
    if (offline) {
      setError(NAME_MESSAGE[offline]);
      return;
    }

    setPending(true);
    try {
      const games = getGameRepository();
      const rows = await games.list();

      // El nombre repetido es un error que se le cuenta. El id repetido no: se
      // numera en silencio, porque el id no lo eligio el y no lo ve. Los dos
      // hacen falta: dos nombres distintos pueden dar el mismo slug.
      const repeated = nameProblem(trimmed, {
        restrictChars: true,
        taken: rows.map((row) => row.template.name).filter(Boolean),
      });
      if (repeated) {
        setError(NAME_MESSAGE[repeated]);
        setPending(false);
        return;
      }

      const gameId = uniqueGameId(
        slugify(trimmed),
        rows.map((row) => row.id),
      );
      const template = buildSkeleton(
        { name: trimmed, description, category },
        gameId,
      );

      await games.save({ id: gameId, template });
      // A configuracion y no al workspace a secas: es lo que le falta hacer, y
      // es donde el aviso de creado tiene sentido.
      navigate(`/optimizer/${gameId}/configuracion`, {
        replace: true,
        state: { created: true },
      });
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : editorCopy.create.failed,
      );
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-[420px] px-6 py-20">
      <h1 className="mb-2 text-2xl font-extrabold tracking-[-0.03em]">
        {editorCopy.create.title}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {editorCopy.create.lede}
      </p>

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
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-describedby="create-name-hint"
          aria-invalid={warning ? true : undefined}
        />
        <p
          id="create-name-hint"
          className="mt-1.5 text-[12px] text-muted-foreground"
        >
          {warning ? (
            <span className="text-[oklch(0.68_0.15_25)]">{warning}</span>
          ) : (
            editorCopy.create.nameHint
          )}
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
        <p
          id="create-description-hint"
          className="mt-1.5 text-[12px] text-muted-foreground"
        >
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
        <p
          id="create-category-hint"
          className="mt-1.5 text-[12px] text-muted-foreground"
        >
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

        <p className="mt-6 text-[12px] text-muted-foreground">
          {editorCopy.create.draftNote}
        </p>
      </form>
    </div>
  );
}
