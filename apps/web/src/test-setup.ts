import { configure } from '@testing-library/react';

/**
 * jsdom tarda cerca de un segundo en dejar lista una pagina con Dexie, workers
 * simulados y las secciones del workspace montadas. La suite corre en paralelo
 * y el margen por defecto de `waitFor` (1 s) dejaba las esperas al filo. El
 * limite es del entorno, no del producto: no cambia ninguna asercion.
 */
configure({ asyncUtilTimeout: 15_000 });
