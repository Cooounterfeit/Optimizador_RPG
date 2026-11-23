import { useState } from 'react';

import { Button } from '../../components/ui/Button';
import type { GameTemplate } from '@zenith/shared-types';

import { editorCopy } from './copy';
import { useSaveOptimizer } from './useSaveOptimizer';

/**
 * Guardar el optimizador en la cuenta
 * ===================================
 * El boton que faltaba. Toda la decision de si se puede guardar vive en
 * `useSaveOptimizer`; aqui solo se pinta, para que el dia que el guardado
 * cambie no haya que buscar la regla entre el markup.
 *
 * Dos cosas que la pantalla tiene que dejar claras o se pierde trabajo:
 *
 * QUE SE GUARDA. Lo que sube es el optimizador: las estadisticas, las formulas
 * y las reglas. Los objetos del jugador no, y eso no es una limitacion sino el
 * reparto: la matematica la construye el autor y la data de SU partida la pone
 * cada uno, importandola por JSON o a mano. Se dice en el momento de decidir,
 * no en una ayuda aparte que nadie abre.
 *
 * QUIEN LO VE. Privado o comunitario lo elige el autor, y se puede cambiar
 * despues. No se decide por el: un optimizador a medio hacer en el catalogo es
 * tan malo como uno terminado que nadie encuentra.
 */

type Mode = 'idle' | 'choosing';

export function SavePanel({ template }: { template: GameTemplate }) {
  const { availability, phase, link, error, detail, goSignIn, save } =
    useSaveOptimizer(template);
  const [mode, setMode] = useState<Mode>('idle');
  /** Lo elegido en el panel; arranca en lo que ya estaba, o en privado. */
  const [shared, setShared] = useState(false);

  const copy = editorCopy.save;

  if (availability === 'unavailable') {
    return (
      <p className="m-0 mt-4 text-[13px] text-muted-foreground">{copy.unavailable}</p>
    );
  }

  if (availability === 'needsSession') {
    return (
      <div className="mt-4">
        <Button variant="outline" onClick={goSignIn}>
          {copy.signIn}
        </Button>
        <p className="m-0 mt-2 max-w-[60ch] text-[12px] text-muted-foreground">
          {copy.signInWhy}
        </p>
      </div>
    );
  }

  const open = () => {
    setShared(link?.shared ?? false);
    setMode('choosing');
  };

  if (mode === 'choosing') {
    return (
      <div className="mt-4 rounded-[2px] border border-line-strong bg-card px-4 py-3">
        <p className="m-0 mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {copy.visibility}
        </p>

        {(
          [
            { value: false, label: copy.privateLabel, note: copy.privateNote },
            { value: true, label: copy.sharedLabel, note: copy.sharedNote },
          ] as const
        ).map((option) => (
          <label
            key={String(option.value)}
            className="mt-2 flex cursor-pointer items-start gap-2.5"
          >
            <input
              type="radio"
              name="visibility"
              className="mt-[3px]"
              checked={shared === option.value}
              onChange={() => setShared(option.value)}
            />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium">{option.label}</span>
              <span className="block text-[12px] text-muted-foreground">{option.note}</span>
            </span>
          </label>
        ))}

        <p className="m-0 mt-3 max-w-[60ch] border-l-2 border-l-border-strong pl-3 text-[12px] text-muted-foreground">
          {copy.whatTravels}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <Button
            disabled={phase === 'saving'}
            onClick={() => {
              void save(shared).then(() => setMode('idle'));
            }}
          >
            {phase === 'saving' ? copy.saving : copy.confirm}
          </Button>
          <button
            type="button"
            onClick={() => setMode('idle')}
            className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {copy.cancel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={link ? 'outline' : 'primary'}
          disabled={availability === 'loading' || phase === 'saving'}
          onClick={() => {
            // Ya guardado: el boton repite lo que el autor eligio la vez
            // anterior, sin volver a preguntar. Cambiarlo es el otro boton.
            if (link) void save(link.shared);
            else open();
          }}
        >
          {phase === 'saving' ? copy.saving : link ? copy.again : copy.first}
        </Button>

        {link ? (
          <button
            type="button"
            onClick={open}
            className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {copy.change}
          </button>
        ) : null}
      </div>

      {link ? (
        <p className="m-0 mt-2 text-[12px] text-muted-foreground" role="status">
          {link.shared ? copy.savedShared : copy.savedPrivate}
        </p>
      ) : null}

      {error ? (
        <div className="mt-2" role="alert">
          <p className="m-0 text-[13px] text-[oklch(0.78_0.16_25)]">{error}</p>
          {detail ? (
            <p className="m-0 mt-0.5 font-mono text-[11px] text-muted-foreground">{detail}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
