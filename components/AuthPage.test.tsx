import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthPage } from './AuthPage';

const signInMock = vi.fn();

vi.mock('../services/auth', () => ({
  auth: {
    signIn: (...args: unknown[]) => signInMock(...args),
  },
}));

vi.mock('../services/db', () => ({
  db: {
    verifyAccessCode: vi.fn(),
  },
}));

vi.mock('../services/supabase', () => ({
  isConfigured: true,
}));

describe('AuthPage', () => {
  beforeEach(() => {
    localStorage.clear();
    signInMock.mockReset();
  });

  it('saves email to localStorage when remember me is enabled', async () => {
    signInMock.mockResolvedValue({ error: null });

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText('البريد الإلكتروني'), {
      target: { value: 'operator@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('كلمة المرور'), {
      target: { value: 'strong-password' },
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'دخول النظام' }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith('operator@example.com', 'strong-password');
    });
    expect(localStorage.getItem('ops_saved_email')).toBe('operator@example.com');
  });

  it('shows translated auth error for invalid credentials', async () => {
    signInMock.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText('البريد الإلكتروني'), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('كلمة المرور'), {
      target: { value: 'wrong-pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'دخول النظام' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
    );
  });
});
