import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// Get the mock after jest.mock is called
const mockAuth = require('../../lib/supabase').supabase.auth;

// Test component to access auth context
const TestComponent = () => {
  const { user, loading, signIn, signUp, signOut, session } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="session">{session ? 'has-session' : 'no-session'}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => signUp('test@example.com', 'password')}>Sign Up</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
};

describe('AuthContext', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockSession = {
    user: mockUser,
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementation
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null
    });

    mockAuth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    });

    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    mockAuth.signUp.mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    mockAuth.signOut.mockResolvedValue({
      error: null,
    });
  });

  it('should provide initial loading state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });

  it('should handle successful session retrieval', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
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
      expect(screen.getByTestId('user')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('session')).toHaveTextContent('has-session');
    });
  });

  it('should handle failed session retrieval', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Session error'),
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
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      expect(screen.getByTestId('user')).toHaveTextContent('not-authenticated');
      expect(consoleSpy).toHaveBeenCalledWith('Error getting session:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should handle sign in', async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByText('Sign In'));
    });

    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('should handle sign in error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new Error('Invalid credentials'),
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

    await act(async () => {
      fireEvent.click(screen.getByText('Sign In'));
    });

    expect(mockAuth.signInWithPassword).toHaveBeenCalled();
  });

  it('should handle sign up', async () => {
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

    await act(async () => {
      fireEvent.click(screen.getByText('Sign Up'));
    });

    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('should handle sign out', async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Sign Out'));
    });

    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('should handle auth state changes', async () => {
    const mockStateChangeCallback = jest.fn();

    mockAuth.onAuthStateChange.mockImplementation((callback) => {
      mockStateChangeCallback.mockImplementation(callback);
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      };
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });

    // Simulate auth state change
    await act(async () => {
      mockStateChangeCallback('SIGNED_IN', mockSession);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('session')).toHaveTextContent('has-session');
    });
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    const TestWithoutProvider = () => {
      useAuth();
      return <div>Test</div>;
    };

    expect(() => {
      render(<TestWithoutProvider />);
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('should cleanup subscription on unmount', async () => {
    const unsubscribeMock = jest.fn();

    mockAuth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
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