import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Un dialogo modal, a mano
 * ========================
 * No hay libreria de componentes en el proyecto y no se agrega una por esto.
 * Lo que si se respeta es lo que un modal tiene que hacer para no ser una
 * trampa:
 *
 *  - Se anuncia como dialogo y queda asociado a su titulo.
 *  - `aria-modal` dice que lo de detras no cuenta mientras este abierto.
 *  - Escape lo cierra, y un clic en el fondo tambien.
 *  - El foco entra al abrirse y vuelve a donde estaba al cerrarse. Sin esto,
 *    quien navega con teclado queda detras del dialogo sin saberlo.
 *
 * El fondo es `bg-surface` y no `bg-card` a proposito: el tema no define
 * `--color-card`, asi que `bg-card` no pinta nada. En el resto de la aplicacion
 * eso no se nota, porque detras hay pagina casi negra; aqui si, porque detras
 * hay contenido que se transparentaba a traves del dialogo.
 */
export function Dialog({
  titleId,
  onClose,
  children,
}: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const caja = useRef<HTMLDivElement | null>(null);
  const origen = useRef<HTMLElement | null>(null);

  useEffect(() => {
    origen.current = document.activeElement as HTMLElement | null;
    caja.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      origen.current?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0_0_0/0.6)] px-6"
      onMouseDown={(event) => {
        // Solo el fondo: un arrastre que empieza dentro no deberia cerrarlo.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-[460px] rounded-[2px] border border-line-strong bg-surface px-5 py-4 shadow-2xl outline-none"
      >
        {children}
      </div>
    </div>
  );
}
