import { render, screen } from '@testing-library/react';
import App from './app';

describe('App', () => {
  it('renderiza el titulo', () => {
    render(<App />);
    expect(screen.getByText('Zenith Optimizer')).toBeTruthy();
  });
});
