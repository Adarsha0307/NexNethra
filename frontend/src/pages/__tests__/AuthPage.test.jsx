import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPage from '../AuthPage';

describe('AuthPage login flow (cookie-based)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('logs in without writing tokens to localStorage', async () => {
    const onAuth = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Logged in.' }),
    });

    render(<AuthPage onAuth={onAuth} />);

    fireEvent.change(screen.getByPlaceholderText('Enter your email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'ValidPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(onAuth).toHaveBeenCalledWith({}));

    expect(localStorage.getItem('nexnetra_token')).toBeNull();
    expect(localStorage.getItem('nexnetra_refresh')).toBeNull();

    const [, init] = global.fetch.mock.calls[0];
    expect(init.credentials).toBe('include');
  });

  it('shows the error message on failed login', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid email or password.' }),
    });

    render(<AuthPage onAuth={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Enter your email address'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
      target: { value: 'WrongPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('Invalid email or password.')).toBeInTheDocument());
  });
});