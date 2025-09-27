import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn()
  }
};

jest.mock('../../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Test component to access auth context
const TestComponent = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? 'authenticated' : 'not-authenticated'}</div>
      <button onClick={() => signIn('test@test.com', 'password')}>Sign In</button>
      <button onClick={() => signUp('test@test.com', 'password')}>Sign Up</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    });
  });

  describe('AuthProvider', () => {
    it('should provide initial loading state', async () => {
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    it('should handle initial session fetch', async () => {
      const mockUser = { id: '1', email: 'test@test.com' };
      const mockSession = { user: mockUser, access_token: 'token' };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });
    });

    it('should handle session fetch error', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Failed to fetch session')
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error getting session:', expect.any(Error));
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      consoleSpy.mockRestore();
    });

    it('should set up auth state change listener', async () => {
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });

    it('should provide auth methods', async () => {
      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  describe('Authentication methods', () => {
    it('should handle sign in', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '1', email: 'test@test.com' } },
        error: null
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await act(async () => {
        screen.getByText('Sign In').click();
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password'
      });
    });

    it('should handle sign in error', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid credentials')
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await act(async () => {
        screen.getByText('Sign In').click();
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
    });

    it('should handle sign up', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: { id: '1', email: 'test@test.com' } },
        error: null
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await act(async () => {
        screen.getByText('Sign Up').click();
      });

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password'
      });
    });

    it('should handle sign out', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      await act(async () => {
        screen.getByText('Sign Out').click();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('Auth state changes', () => {
    it('should handle auth state change events', async () => {
      let authCallback: any;

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      // Simulate auth state change
      const mockUser = { id: '1', email: 'test@test.com' };
      const mockSession = { user: mockUser, access_token: 'token' };

      await act(async () => {
        authCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('authenticated');
      });
    });

    it('should handle sign out state change', async () => {
      let authCallback: any;

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      // Simulate sign out
      await act(async () => {
        authCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('not-authenticated');
      });
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from auth changes on unmount', async () => {
      const unsubscribeMock = jest.fn();

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeMock } }
      });

      const { unmount } = await act(async () => {
        return render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        );
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });
});