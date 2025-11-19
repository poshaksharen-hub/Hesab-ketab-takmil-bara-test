import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Firebase services
jest.mock('@/firebase', () => ({
  useAuth: () => ({}),
  useFirestore: () => ({}),
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));


describe('LoginPage', () => {
  it('renders the login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/ایمیل/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/رمز عبور/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ورود/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    render(<LoginPage />);
    fireEvent.input(screen.getByLabelText(/ایمیل/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));

    await waitFor(() => {
      expect(screen.getByText('لطفا یک ایمیل معتبر وارد کنید.')).toBeInTheDocument();
    });
  });

  it('shows validation error for unauthorized email', async () => {
    render(<LoginPage />);
    fireEvent.input(screen.getByLabelText(/ایمیل/i), {
      target: { value: 'test@wrong.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));

    await waitFor(() => {
        expect(screen.getByText('شما اجازه ورود به این اپلیکیشن را ندارید.')).toBeInTheDocument();
    });
  });

  it('shows validation error for short password', async () => {
    render(<LoginPage />);
    fireEvent.input(screen.getByLabelText(/رمز عبور/i), {
      target: { value: '123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));
    
    await waitFor(() => {
      expect(screen.getByText('رمز عبور باید حداقل ۶ کاراکتر باشد.')).toBeInTheDocument();
    });
  });
});
