import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './app';

describe('App', () => {
  it('monta el catálogo con la marca de Zenith', async () => {
    render(<App />);

    expect(await screen.findByText('Zenith Optimizer')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Proven builds/ })).toBeTruthy();
  });
});
