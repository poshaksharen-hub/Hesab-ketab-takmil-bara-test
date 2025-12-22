
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Mock useRouter from next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Firebase services
jest.mock('@/firebase', () => ({
  useAuth: () => ({}), // We mock the auth functions directly
  useFirestore: () => ({}), // We mock the firestore functions directly
  useUser: () => ({ user: null, isUserLoading: false }), // Assume no user is logged in initially
}));

// Mock firebase/auth module
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'),
  signInWithEmailAndPassword: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}), // Returns a mock unsubscribe function
}));

// Mock firebase/firestore module
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
    // Clear all mocks before each test to ensure isolation
    jest.clearAllMocks();
  });

  it('should render the login form correctly', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/ایمیل/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/رمز عبور/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ورود/i })).toBeInTheDocument();
  });

  it('should show a validation error for unauthorized emails on the client-side', async () => {
    render(<LoginPage />);
    fireEvent.input(screen.getByLabelText(/ایمیل/i), { target: { value: 'intruder@wrong.com' } });
    fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));

    await waitFor(() => {
      expect(screen.getByText('شما اجازه ورود به این اپلیکیشن را ندارید.')).toBeInTheDocument();
    });
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  // Test suite for authorized users (Ali and Fatemeh)
  const authorizedUsers = [
    { email: 'ali@khanevadati.app', uid: 'ali_uid' },
    { email: 'fatemeh@khanevadati.app', uid: 'fatemeh_uid' },
  ];

  describe.each(authorizedUsers)('for user $email', ({ email, uid }) => {
    it('should redirect to dashboard and create a profile on first successful login', async () => {
      // Arrange: Mock successful authentication and a non-existent user profile
      (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: { uid, email } });
      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      render(<LoginPage />);

      // Act: Fill and submit the form
      fireEvent.input(screen.getByLabelText(/ایمیل/i), { target: { value: email } });
      fireEvent.input(screen.getByLabelText(/رمز عبور/i), { target: { value: 'any-password' } });
      fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));

      // Assert: Check for redirection and profile creation
      await waitFor(() => {
        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), email, 'any-password');
        expect(setDoc).toHaveBeenCalled(); // Profile creation is called
        expect(mockPush).toHaveBeenCalledWith('/');
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'ورود موفق' }));
      });
    });

    it('should redirect to dashboard if the user profile already exists', async () => {
        // Arrange: Mock successful authentication and an existing user profile
        (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: { uid, email } });
        (getDoc as jest.Mock).mockResolvedValue({ exists: () => true }); // Profile already exists
  
        render(<LoginPage />);
  
        // Act: Fill and submit the form
        fireEvent.input(screen.getByLabelText(/ایمیل/i), { target: { value: email } });
        fireEvent.input(screen.getByLabelText(/رمز عبور/i), { target: { value: 'any-password' } });
        fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));
  
        // Assert: Check for redirection WITHOUT profile creation
        await waitFor(() => {
          expect(setDoc).not.toHaveBeenCalled(); // Profile creation is NOT called
          expect(mockPush).toHaveBeenCalledWith('/');
          expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'ورود موفق' }));
        });
      });

    it('should show a toast error for wrong password', async () => {
      // Arrange: Mock the specific "wrong-password" error from Firebase
      (signInWithEmailAndPassword as jest.Mock).mockRejectedValue({ code: 'auth/wrong-password' });

      render(<LoginPage />);

      // Act: Fill and submit the form
      fireEvent.input(screen.getByLabelText(/ایمیل/i), { target: { value: email } });
      fireEvent.input(screen.getByLabelText(/رمز عبور/i), { target: { value: 'wrong-password' } });
      fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));

      // Assert: Check for the specific error toast
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: 'destructive',
            title: 'خطا در ورود',
            description: 'ایمیل یا رمز عبور اشتباه است.',
          })
        );
      });
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
