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

/**
 * Por que no se puede guardar todavia, segun la misma validacion que la pagina
 * ya pinta mas abajo. Se recibe hecho en vez de calcularlo aqui: la pantalla
 * tiene un solo juez de si la plantilla esta lista, y este panel no es otro.
 */
export interface SaveGate {
  /** Bloques obligatorios que siguen vacios, por su nombre visible. */
  missing: readonly string[];
  /** Errores del informe del motor. Con uno solo no se guarda. */
  errors: number;
  /** El informe aun se esta calculando. */
  checking: boolean;
}

export function SavePanel({
  template,
  gate,
}: {
  template: GameTemplate;
  gate: SaveGate;
}) {
  const { availability, phase, link, error, detail, goSignIn, save } =
    useSaveOptimizer(template);
  const [mode, setMode] = useState<Mode>('idle');
  /** Lo elegido en el panel; arranca en lo que ya estaba, o en privado. */
  const [shared, setShared] = useState(false);

  const copy = editorCopy.save;

  /**
   * Lo que impide guardar, en el orden en que le sirve a quien esta mirando.
   * Iniciar sesion no entra aqui: ese caso tiene su propio boton, que lleva a
   * hacerlo en vez de quedarse quieto.
   */
  const razones: string[] = [];
  if (gate.checking) razones.push(copy.checking);
  if (gate.missing.length > 0) {
    razones.push(copy.blockedMissing.replace('{what}', gate.missing.join(', ')));
  }
  // Solo si no falta nada: en un optimizador recien creado los bloques vacios
  // son justamente la causa de esos errores, y decirlo dos veces no ayuda.
  if (gate.errors > 0 && gate.missing.length === 0) razones.push(copy.blockedErrors);
  if (availability === 'unavailable') razones.push(copy.unavailable);
  if (availability === 'needsSession') razones.push(copy.signInWhy);

  const incompleto = gate.checking || gate.missing.length > 0 || gate.errors > 0;
  const pideSesion = availability === 'needsSession';

  const notas = (
    <>
      {razones.map((razon) => (
        <p key={razon} className="m-0 mt-2 max-w-[60ch] text-[12px] text-muted-foreground">
          {razon}
        </p>
      ))}
    </>
  );

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

  /*
    El boton esta SIEMPRE en pantalla, en todos los casos, incluido el de una
    instalacion sin cuentas. Antes desaparecia ahi, y un boton ausente no
    explica por que no esta: quien lo busca concluye que no se guardo nada.
    Cuando no se puede guardar, sigue visible y debajo dice que falta.
  */
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={link && !pideSesion ? 'outline' : 'primary'}
          disabled={
            availability === 'loading' ||
            availability === 'unavailable' ||
            phase === 'saving' ||
            (!pideSesion && incompleto)
          }
          onClick={() => {
            // Sin sesion, el boton no se queda quieto: lleva a iniciarla.
            if (pideSesion) {
              goSignIn();
              return;
            }
            // Ya guardado: el boton repite lo que el autor eligio la vez
            // anterior, sin volver a preguntar. Cambiarlo es el otro boton.
            if (link) void save(link.shared);
            else open();
          }}
        >
          {pideSesion
            ? copy.signIn
            : phase === 'saving'
              ? copy.saving
              : link
                ? copy.again
                : copy.first}
        </Button>

        {link && !pideSesion ? (
          <button
            type="button"
            onClick={open}
            className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {copy.change}
          </button>
        ) : null}
      </div>

      {link && !pideSesion ? (
        <p className="m-0 mt-2 text-[12px] text-muted-foreground" role="status">
          {link.shared ? copy.savedShared : copy.savedPrivate}
        </p>
      ) : null}

      {notas}

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
