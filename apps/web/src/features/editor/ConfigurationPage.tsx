import { useCallback, useEffect, useState } from 'react';

import { validateTemplate, type Issue, type ValidationReport } from '@zenith/core-engine';

import { Button } from '../../components/ui/Button';
import { useOptimizerWorkspace } from '../optimizer/workspace/OptimizerWorkspaceProvider';

import { CONFIG_BLOCKS, missingRequired } from './blocks';
import { editorCopy } from './copy';

/**
 * Ver y validar la configuracion (CFG-06)
 * =======================================
 * El motor trae `validateTemplate` desde que se porto, con sus codigos, sus
 * severidades y un `where` que apunta a la pieza culpable. Hasta ahora no lo
 * llamaba nadie. Esta pantalla es su primer consumidor.
 *
 * Dos cosas que vale la pena saber sobre lo que se muestra:
 *
 * Un aviso de monotonia NO significa que el resultado deje de ser exacto. El
 * motor analiza la formula y, cuando una estadistica no es monotona, acota por
 * intervalos en vez de usar la cota rapida. El optimo se sigue demostrando; lo
 * que cambia es cuanto tarda. Por eso sale como aviso y no como error.
 *
 * La validacion no es barata: los auto-tests ejecutan busquedas de verdad. Se
 * corre al entrar y con el boton, nunca en cada tecla.
 */

const SEVERITY_ORDER: Issue['severity'][] = ['error', 'warning', 'info'];

const SEVERITY_STYLE: Record<Issue['severity'], string> = {
  error: 'border-l-2 border-l-[oklch(0.68_0.15_25)]',
  warning: 'border-l-2 border-l-[oklch(0.80_0.11_72)]',
  info: 'border-l-2 border-l-border-strong',
};

const nf = new Intl.NumberFormat('en-US');

export function ConfigurationPage() {
  const { template, inventory } = useOptimizerWorkspace();
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [checking, setChecking] = useState(false);

  /**
   * Nueve de las 54 comprobaciones del motor solo corren si se le pasa el
   * inventario, y el espacio de busqueda solo se calcula ahi. Pero hay que
   * esperar a que este leido: validar con `[]` mientras carga acusaria de
   * vacia cada ranura obligatoria.
   */
  const items = inventory.items;
  const inventoryReady = template !== undefined && inventory.loadedFor === template.gameId;

  const check = useCallback(() => {
    if (!template || !inventoryReady) return;
    setChecking(true);
    // Un respiro antes de bloquear el hilo: sin esto el boton nunca llega a
    // pintarse en su estado de espera.
    setTimeout(() => {
      setReport(validateTemplate(template, items ?? []));
      setChecking(false);
    }, 0);
  }, [template, inventoryReady, items]);

  useEffect(() => {
    check();
  }, [check]);

  if (!template) return null;

  const missing = missingRequired(template);

  return (
    <div className="mx-auto max-w-[920px] px-6 py-12">
      <header className="mb-10 border-b border-border pb-6">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {editorCopy.config.eyebrow}
        </p>
        <h1 className="mb-2 text-2xl font-extrabold tracking-[-0.03em]">{template.name}</h1>
        <p className="max-w-[60ch] text-sm text-muted-foreground">{editorCopy.config.lede}</p>
      </header>

      {/* Lo primero: puede este juego optimizar o no. */}
      <section className="mb-10" aria-labelledby="config-state">
        <h2 id="config-state" className="sr-only">
          {editorCopy.config.stateTitle}
        </h2>
        {missing.length === 0 ? (
          <p className="border border-border bg-card px-4 py-3 text-sm">
            {editorCopy.config.ready}
          </p>
        ) : (
          <div className="border border-border-strong bg-card px-4 py-3">
            <p className="mb-2 text-sm font-semibold">{editorCopy.config.notReady}</p>
            <ul className="space-y-1">
              {missing.map((block) => (
                <li key={block.id} className="text-sm text-muted-foreground">
                  <span className="text-foreground">{block.label}</span> {'· '}
                  {block.hint}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* El informe del motor. */}
      <section className="mb-10" aria-labelledby="config-report">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-2">
          <h2
            id="config-report"
            className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground"
          >
            {editorCopy.config.reportTitle}
          </h2>
          <Button
            type="button"
            variant="outline"
            onClick={check}
            disabled={checking || !inventoryReady}
          >
            {checking ? editorCopy.config.checking : editorCopy.config.recheck}
          </Button>
        </div>

        {report === null ? (
          <p className="text-sm text-muted-foreground">{editorCopy.config.checking}</p>
        ) : (
          <>
            <p className="mb-4 text-[13px] text-muted-foreground">
              {items && items.length > 0
                ? editorCopy.config.withItems.replace('{n}', nf.format(items.length))
                : editorCopy.config.withoutItems}
            </p>

            <dl className="mb-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              {[
                [editorCopy.config.searchSpace, report.summary.searchSpace],
                [editorCopy.config.monotonic, report.summary.monotonicOk],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="font-mono text-lg">
                    {typeof value === 'number' ? nf.format(value) : editorCopy.config.unknown}
                  </dd>
                </div>
              ))}
            </dl>

            {report.issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">{editorCopy.config.noIssues}</p>
            ) : (
              <ul className="space-y-2">
                {SEVERITY_ORDER.flatMap((severity) =>
                  report.issues
                    .filter((issue) => issue.severity === severity)
                    .map((issue, index) => (
                      <li
                        key={`${issue.code}-${issue.where ?? ''}-${index}`}
                        className={`bg-card px-4 py-3 ${SEVERITY_STYLE[severity]}`}
                      >
                        <p className="mb-1 flex flex-wrap items-baseline gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                            {severity}
                          </span>
                          {issue.where ? (
                            <span className="font-mono text-[11px]">{issue.where}</span>
                          ) : null}
                        </p>
                        <p className="text-sm">{issue.message}</p>
                      </li>
                    )),
                )}
              </ul>
            )}

            {report.selfTests.length > 0 ? (
              <div className="mt-6">
                <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                  {editorCopy.config.selfTests}
                </h3>
                <ul className="space-y-1">
                  {report.selfTests.map((test) => (
                    <li key={test.name} className="flex gap-3 text-sm">
                      <span className="font-mono text-[11px]">
                        {test.passed ? editorCopy.config.pass : editorCopy.config.fail}
                      </span>
                      <span>{test.name}</span>
                      <span className="text-muted-foreground">{test.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* Las partes, en el orden del registro. */}
      {CONFIG_BLOCKS.map((block) => {
        const entries = block.entries(template);
        return (
          <section key={block.id} className="mb-8" aria-labelledby={`block-${block.id}`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-3 border-b border-border pb-2">
              <h2 id={`block-${block.id}`} className="text-base font-bold tracking-[-0.02em]">
                {block.label}
              </h2>
              <span className="font-mono text-[10px] text-muted-foreground">{entries.length}</span>
              {block.required ? (
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  {editorCopy.config.required}
                </span>
              ) : null}
            </div>
            <p className="mb-3 text-[13px] text-muted-foreground">{block.hint}</p>

            {entries.length === 0 ? (
              <p className="border border-dashed border-border-strong px-4 py-6 text-center text-[13px] text-muted-foreground">
                {editorCopy.config.empty}
              </p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap gap-x-4 gap-y-1 px-1 py-2.5">
                    <span className="min-w-[160px] text-sm font-medium">{entry.name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{entry.id}</span>
                    {entry.detail ? (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {entry.detail}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
