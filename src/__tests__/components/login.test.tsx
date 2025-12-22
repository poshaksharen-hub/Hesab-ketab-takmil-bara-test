
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  useFirestore: () => ({}), // Firestore instance is used by ensureUserProfile
  useUser: () => ({ user: null, isUserLoading: false }),
}));

// Mock 'firebase/auth' module
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'),
  signInWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}),
}));

// Mock 'firebase/firestore' module
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

// Mock useToast
const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    mockPush.mockClear();
    mockToast.mockClear();
    (signInWithEmailAndPassword as jest.Mock).mockClear();
    (doc as jest.Mock).mockClear();
    (getDoc as jest.Mock).mockClear();
    (setDoc as jest.Mock).mockClear();
  });

  it('renders the login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/ایمیل/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/رمز عبور/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ورود/i })).toBeInTheDocument();
  });

  it('shows validation error for unauthorized email', async () => {
    render(<LoginPage />);
    fireEvent.input(screen.getByLabelText(/ایمیل/i), {
      target: { value: 'test@wrong.com' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));

    await waitFor(() => {
      expect(
        screen.getByText('شما اجازه ورود به این اپلیکیشن را ندارید.')
      ).toBeInTheDocument();
    });
    // Ensure no toast is shown for client-side validation
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('redirects to dashboard on successful login', async () => {
    // Arrange
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { uid: '123', email: 'ali@khanevadati.app' },
    });
    // Arrange: Mock Firestore functions for ensureUserProfile
    (getDoc as jest.Mock).mockResolvedValue({ exists: () => false }); // Simulate profile not existing
    (setDoc as jest.Mock).mockResolvedValue(undefined); // Simulate successful profile creation

    render(<LoginPage />);

    // Act
    fireEvent.input(screen.getByLabelText(/ایمیل/i), {
      target: { value: 'ali@khanevadati.app' },
    });
    fireEvent.input(screen.getByLabelText(/رمز عبور/i), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));

    // Assert: Wait for the redirection to happen
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    // Assert: Ensure a success toast was shown
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'ورود موفق',
      })
    );
  });

  it('handles wrong password error', async () => {
    // Arrange
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValue({
      code: 'auth/wrong-password',
    });

    render(<LoginPage />);

    // Act
    fireEvent.input(screen.getByLabelText(/ایمیل/i), {
      target: { value: 'ali@khanevadati.app' },
    });
    fireEvent.input(screen.getByLabelText(/رمز عبور/i), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));

    // Assert
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'خطا در ورود',
          description: 'ایمیل یا رمز عبور اشتباه است.',
        })
      );
    });
  });
});
