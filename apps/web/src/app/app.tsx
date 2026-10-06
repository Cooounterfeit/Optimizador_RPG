import { GAME_SCHEMA_VERSION } from '@zenith/shared-types';

export function App() {
  return (
    <main>
      <h1>Zenith Optimizer</h1>
      <p>Monorepo listo. Contrato de juego en version {GAME_SCHEMA_VERSION}.</p>
    </main>
  );
}

export default App;
