export const damageCopy = {
  eyebrow: 'Tool',
  loading: 'Loading calculator…',
  backToOptimizer: 'Back to optimizer',
  missingTitle: 'This game has no damage calculator',
  missingBody:
    'The game template does not declare a calculator, so there are no fields or formulas to show.',
  calculate: 'Calculate',
  invalid: (field: string) => `Enter a valid number for "${field}".`,
  adjusted: (field: string, min?: number, max?: number) => {
    if (min !== undefined && max !== undefined) return `"${field}" was adjusted to ${min}–${max}.`;
    if (min !== undefined) return `"${field}" was adjusted to at least ${min}.`;
    if (max !== undefined) return `"${field}" was adjusted to at most ${max}.`;
    return `"${field}" was adjusted to the allowed range.`;
  },
  empty: 'Fill the fields and calculate to see the result.',
  invalidFormula: 'The calculator formula is not valid.',
  note: 'This calculation runs only in your browser and is not saved.',
} as const;
