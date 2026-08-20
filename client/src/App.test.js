import { render, screen } from '@testing-library/react';
import App from './App';

// The CRA template test looked for "learn react", which this app never
// renders — it failed on every run. This checks something real instead.
test('renders the events board heading', () => {
  render(<App />);
  expect(screen.getByText(/available events/i)).toBeInTheDocument();
});