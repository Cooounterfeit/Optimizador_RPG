export const gameCopy = {
  eyebrow: 'Optimizer',
  demoEyebrow: 'Demo optimizer',
  demoNote:
    'This is a demo card from the mock catalog. Its game template is not available in this build, so the optimizer cannot be opened. The built-in demo card does have a playable template.',
  loading: 'Loading optimizer…',
  errorTitle: 'Could not load this optimizer',
  retry: 'Try again',
  backToAll: 'All optimizers',
  backToOptimizer: 'Back to optimizer',
  openInventory: 'Open inventory',
  viewAllItems: 'View all items',
  browseCatalog: 'Browse catalog',
  counts: {
    stats: 'Stats',
    slots: 'Slots',
    sets: 'Sets',
    objectives: 'Objectives',
    characters: 'Characters',
  },
  cockpit: {
    published: 'Published',
    character: 'Character',
    characterHint: 'The build is calculated for this profile.',
    objective: 'Objective',
    objectiveHint: 'What the solver will maximize.',
    constraints: 'Constraints',
    constraintsHint: 'Minimum and maximum rules arrive with the solver (F7).',
    ready: 'Run an optimization',
    readyBody:
      'This is the workspace the solver will read: one character, one objective and your inventory.',
    optimize: 'Optimize build',
    optimizeNote: 'The solver arrives in F7.',
    steps: [
      {
        title: 'Pick a character and an objective',
        body: 'Both come from the game template, not from hardcoded screens.',
      },
      {
        title: 'Load your inventory',
        body: 'Items stay in this browser. Add them by hand today; GOOD import arrives in F6.2.',
      },
      {
        title: 'Run the solver',
        body: 'Branch and bound will prove the best combination of the items you own.',
      },
    ],
    inventory: 'Inventory',
    inventoryEmpty: 'No items yet. Add them by hand; GOOD import arrives in F6.2.',
    items: (count: number) => `${count} item${count === 1 ? '' : 's'}`,
    templateNotes: 'Template notes and limitations',
  },
  errors: {
    missing: 'No optimizer was requested.',
    notFound: 'This optimizer does not exist or is not published.',
    invalid: 'The game template is not valid.',
    unknown: 'Something went wrong while loading the optimizer.',
  },
} as const;
