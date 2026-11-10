import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { clampCalculatorValue, evaluateCalculator, type CalculatorValue } from '@zenith/core-engine';
import type { DamageCalculator, DamageCalculatorField } from '@zenith/shared-types';

import { Button } from '../../components/ui/Button';
import { EmptyState } from '../catalog/components/EmptyState';
import { useGame } from '../game/useGame';
import { damageCopy } from './copy';

const formatNumber = (value: number, decimals?: number): string =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals ?? 1,
    minimumFractionDigits: decimals ?? 0,
  }).format(value);

const labelFor = (field: DamageCalculatorField): string =>
  field.unit === 'percent' ? `${field.label} (%)` : field.label;

const initialValues = (calculator: DamageCalculator): Record<string, string> =>
  Object.fromEntries(
    calculator.fields.map((field) => [field.id, String(field.default ?? 0)]),
  );

export function DamageCalculatorPage() {
  const { id = '' } = useParams();
  const { state, retry } = useGame(id);
  const calculator = state.status === 'ready' ? state.template.damageCalculator : undefined;

  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CalculatorValue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!calculator) return;
    setValues(initialValues(calculator));
    setResult(null);
    setError(null);
    setWarning(null);
  }, [calculator]);

  if (state.status === 'loading') {
    return <p className="px-6 py-24 text-center text-sm text-muted-foreground">{damageCopy.loading}</p>;
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-24">
        <EmptyState title={damageCopy.missingTitle} body={state.message}>
          <Button variant="outline" onClick={retry}>
            Try again
          </Button>
        </EmptyState>
      </div>
    );
  }

  if (!calculator) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-24">
        <EmptyState title={damageCopy.missingTitle} body={damageCopy.missingBody}>
          <Link
            to={`/optimizer/${id}`}
            className="inline-flex h-9 items-center rounded-[2px] border border-line px-4 text-[12.5px] font-semibold transition-colors hover:border-line-strong hover:bg-raised"
          >
            {damageCopy.backToOptimizer}
          </Link>
        </EmptyState>
      </div>
    );
  }

  const update = (field: DamageCalculatorField, value: string) => {
    setValues((current) => ({ ...current, [field.id]: value }));
    setError(null);
    setWarning(null);
  };

  const submit = () => {
    setError(null);
    setWarning(null);

    const parsed: Record<string, number> = {};
    let adjustment: string | null = null;

    for (const field of calculator.fields) {
      const raw = values[field.id]?.trim() ?? '';
      const numeric = raw === '' ? field.default ?? 0 : Number(raw);
      if (!Number.isFinite(numeric)) {
        setError(damageCopy.invalid(field.label));
        return;
      }

      const clamped = clampCalculatorValue(numeric, field.min, field.max);
      if (clamped !== numeric) {
        adjustment ??= damageCopy.adjusted(field.label, field.min, field.max);
        setValues((current) => ({ ...current, [field.id]: String(clamped) }));
      }
      parsed[field.id] = clamped;
    }

    try {
      setResult(evaluateCalculator(calculator, parsed).outputs);
      if (adjustment) setWarning(adjustment);
    } catch {
      setResult(null);
      setError(damageCopy.invalidFormula);
    }
  };

  const featured = result?.[0];
  const others = result?.slice(1) ?? [];

  return (
    <div className="mx-auto max-w-[960px] px-6 py-10 max-[860px]:px-4">
      <Link
        to={`/optimizer/${id}`}
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ← {damageCopy.backToOptimizer}
      </Link>

      <header className="mt-4 border-b border-line pb-6">
        <p className="label-caps mb-1">{damageCopy.eyebrow}</p>
        <h1 className="m-0 text-2xl font-extrabold tracking-[-0.03em]">{calculator.title}</h1>
        {calculator.description ? (
          <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">{calculator.description}</p>
        ) : null}
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <section className="rounded-[4px] border border-line bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {calculator.fields.map((field) => (
              <label key={field.id} className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold">{labelFor(field)}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="h-10 rounded-[2px] border border-line bg-background px-3 font-mono text-[13px] text-foreground outline-none transition-colors focus:border-line-strong"
                  value={values[field.id] ?? ''}
                  onChange={(event) => update(field, event.target.value)}
                />
                {field.description ? (
                  <span className="text-[11px] leading-snug text-muted-foreground">{field.description}</span>
                ) : null}
              </label>
            ))}
          </div>

          {calculator.note ? (
            <p className="mt-4 text-[11.5px] leading-relaxed text-muted-foreground">{calculator.note}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <button
              type="button"
              className="h-10 rounded-[2px] border border-foreground bg-foreground px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90"
              onClick={submit}
            >
              {damageCopy.calculate}
            </button>
            <span className="text-[11px] text-muted-foreground">{damageCopy.note}</span>
          </div>

          {error ? (
            <p role="alert" className="mt-3 text-[12px] text-[oklch(0.78_0.16_25)]">
              {error}
            </p>
          ) : null}
          {warning ? (
            <p role="status" className="mt-3 text-[12px] text-[oklch(0.78_0.16_60)]">
              {warning}
            </p>
          ) : null}
        </section>

        <section className="rounded-[4px] border border-line bg-surface p-5" aria-live="polite">
          {!featured ? (
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">{damageCopy.empty}</p>
          ) : (
            <>
              <p className="label-caps">{featured.label}</p>
              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums">
                {formatNumber(featured.value, featured.decimals)}
                {featured.unit ? <span className="ml-1 text-lg">{featured.unit}</span> : null}
              </p>
              {others.length > 0 ? (
                <dl className="mt-5 divide-y divide-line border-t border-line">
                  {others.map((output) => (
                    <div key={output.id} className="flex items-baseline justify-between gap-3 py-2.5">
                      <dt className="text-[12px] text-muted-foreground">{output.label}</dt>
                      <dd className="m-0 font-mono text-[13px] tabular-nums">
                        {formatNumber(output.value, output.decimals)}
                        {output.unit ? ` ${output.unit}` : ''}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
