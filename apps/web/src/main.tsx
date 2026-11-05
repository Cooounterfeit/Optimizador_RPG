import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import '@fontsource/anton/400.css';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';
import '@fontsource/martian-mono/400.css';
import '@fontsource/martian-mono/600.css';

import './styles.css';
import App from './app/app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
