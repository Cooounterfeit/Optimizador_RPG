import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { validateTemplate } from '@zenith/core-engine';
import type { GameTemplate, Item } from '@zenith/shared-types';

import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';

import { missingRequired } from './blocks';
import { editorCopy } from './copy';
import { useSaveOptimizer } from './useSaveOptimizer';

/**
 * Guardar en la cuenta, desde cualquier parte del optimizador
 * ===========================================================
 * El boton vive fijo abajo a la derecha y esta SIEMPRE en pantalla mientras se
 * trabaja en un optimizador propio. Dos intentos anteriores fallaron por lo
 * mismo: estaba en la cabecera, asi que se iba con el scroll, y se apagaba
 * cuando no se podia guardar, asi que no explicaba nada.
 *
 * Ahora nunca se apaga. Siempre se puede pulsar y siempre contesta algo, y eso
 * cambia donde viven las reglas: se evaluan AL HACER CLIC, no en cada render.
 * De paso sale gratis lo que antes costaba caro, porque `validateTemplate`
 * recorre la plantilla entera y no tiene por que correr mientras alguien
 * escribe el nombre de una estadistica.
 *
 * El orden de las comprobaciones no es casual, va de la mas barata a la mas
 * cara y de la mas accionable a la menos: cuenta, bloques vacios y solo
 * entonces el motor.
 */

type Paso =
  | { kind: 'needAccount' }
  | { kind: 'unavailable' }
  | { kind: 'checking' }
  | { kind: 'incomplete'; missing: string[] }
  | { kind: 'errors' }
  | { kind: 'choose' };

const TITULO = 'save-dialog-title';

export function SaveButton({
  template,
  items,
}: {
  template: GameTemplate;
  items: Item[];
}) {
  const { availability, phase, link, error, detail, goSignIn, save } =
    useSaveOptimizer(template);
  const navigate = useNavigate();
  const [paso, setPaso] = useState<Paso | null>(null);
  const [shared, setShared] = useState(false);

  const copy = editorCopy.save;

  const abrir = useCallback(async () => {
    if (availability === 'unavailable') return setPaso({ kind: 'unavailable' });
    if (availability === 'needsSession') return setPaso({ kind: 'needAccount' });

    setShared(link?.shared ?? false);

    const missing = missingRequired(template).map((block) => block.label);
    if (missing.length > 0) return setPaso({ kind: 'incomplete', missing });

    setPaso({ kind: 'checking' });
    // Un respiro para que el dialogo llegue a pintarse: lo siguiente bloquea
    // el hilo mientras el motor recorre la plantilla entera.
    await new Promise((listo) => setTimeout(listo, 0));

    const report = validateTemplate(template, items);
    const errores = report.issues.filter((issue) => issue.severity === 'error');
    setPaso(errores.length > 0 ? { kind: 'errors' } : { kind: 'choose' });
  }, [availability, link, template, items]);

  const cerrar = useCallback(() => setPaso(null), []);

  const etiqueta = phase === 'saving' ? copy.saving : link ? copy.again : copy.first;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-end px-5 pb-5">
        <Button
          className="pointer-events-auto shadow-[0_6px_24px_oklch(0_0_0/0.45)]"
          onClick={() => void abrir()}
        >
          {etiqueta}
        </Button>
      </div>

      {paso ? (
        <Dialog titleId={TITULO} onClose={cerrar}>
          <Contenido
            paso={paso}
            shared={shared}
            setShared={setShared}
            phase={phase}
            link={link}
            error={error}
            detail={detail}
            onSave={() => void save(shared).then(cerrar)}
            onClose={cerrar}
            onSignIn={goSignIn}
            onRegister={() =>
              navigate(`/registro?next=${encodeURIComponent(window.location.pathname)}`)
            }
          />
        </Dialog>
      ) : null}
    </>
  );
}

interface ContenidoProps {
  paso: Paso;
  shared: boolean;
  setShared: (value: boolean) => void;
  phase: ReturnType<typeof useSaveOptimizer>['phase'];
  link: ReturnType<typeof useSaveOptimizer>['link'];
  error: string | null;
  detail: string | null;
  onSave: () => void;
  onClose: () => void;
  onSignIn: () => void;
  onRegister: () => void;
}

function Contenido({
  paso,
  shared,
  setShared,
  phase,
  link,
  error,
  detail,
  onSave,
  onClose,
  onSignIn,
  onRegister,
}: ContenidoProps) {
  const copy = editorCopy.save;

  const titulo = (texto: string) => (
    <h2 id={TITULO} className="m-0 mb-2 text-[15px] font-bold tracking-[-0.02em]">
      {texto}
    </h2>
  );

  const cerrarBoton = (
    <button
      type="button"
      onClick={onClose}
      className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
    >
      {copy.close}
    </button>
  );

  if (paso.kind === 'needAccount') {
    return (
      <>
        {titulo(copy.needAccountTitle)}
        <p className="m-0 text-[13.5px] text-muted-foreground">{copy.needAccount}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={onSignIn}>{copy.signInAction}</Button>
          <Button variant="outline" onClick={onRegister}>
            {copy.createAccount}
          </Button>
          {cerrarBoton}
        </div>
      </>
    );
  }

  if (paso.kind === 'unavailable') {
    return (
      <>
        {titulo(copy.needAccountTitle)}
        <p className="m-0 text-[13.5px] text-muted-foreground">{copy.unavailable}</p>
        <div className="mt-4">{cerrarBoton}</div>
      </>
    );
  }

  if (paso.kind === 'checking') {
    return (
      <>
        {titulo(copy.dialogTitle)}
        <p className="m-0 text-[13.5px] text-muted-foreground" role="status">
          {copy.checking}
        </p>
      </>
    );
  }

  if (paso.kind === 'incomplete') {
    return (
      <>
        {titulo(copy.notReadyTitle)}
        <p className="m-0 text-[13.5px] text-muted-foreground">
          {copy.blockedMissing.replace('{what}', paso.missing.join(', '))}
        </p>
        <div className="mt-4">{cerrarBoton}</div>
      </>
    );
  }

  if (paso.kind === 'errors') {
    return (
      <>
        {titulo(copy.notReadyTitle)}
        <p className="m-0 text-[13.5px] text-muted-foreground">{copy.blockedErrors}</p>
        <div className="mt-4">{cerrarBoton}</div>
      </>
    );
  }

  return (
    <>
      {titulo(copy.dialogTitle)}
      <p className="m-0 mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
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

      <p className="m-0 mt-3 border-l-2 border-l-border-strong pl-3 text-[12px] text-muted-foreground">
        {copy.whatTravels}
      </p>

      {link ? (
        <p className="m-0 mt-3 text-[12px] text-muted-foreground" role="status">
          {link.shared ? copy.savedShared : copy.savedPrivate}
        </p>
      ) : null}

      {error ? (
        <div className="mt-3" role="alert">
          <p className="m-0 text-[13px] text-[oklch(0.78_0.16_25)]">{error}</p>
          {detail ? (
            <p className="m-0 mt-0.5 font-mono text-[11px] text-muted-foreground">{detail}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <Button disabled={phase === 'saving'} onClick={onSave}>
          {phase === 'saving' ? copy.saving : copy.confirm}
        </Button>
        {cerrarBoton}
      </div>
    </>
  );
}
