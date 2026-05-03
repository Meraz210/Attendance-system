import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  localStorage.clear();
});

test('renders login screen before authentication', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/at least 6 characters/i)).toBeInTheDocument();
});
