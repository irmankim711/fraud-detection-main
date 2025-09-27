import React from 'react';
import { render, screen, act } from '@testing-library/react';
import App from './App';

// Mock Supabase
jest.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } }
      }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn()
    }
  }
}));

test('renders loading initially', async () => {
  await act(async () => {
    render(<App />);
  });

  // Should show loading initially
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
