import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/login/page';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Firebase services more comprehensively
jest.mock('@/firebase', () => ({
  useAuth: () => ({}), // Returns a mock auth object
  useFirestore: () => ({}),
}));

// Mock the entire 'firebase/auth' module to control its functions
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'), // Keep original functions not mocked
  signInWithEmailAndPassword: jest.fn(),
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
        // Clear all mock implementations and call history before each test
        mockPush.mockClear();
        mockToast.mockClear();
        (signInWithEmailAndPassword as jest.Mock).mockClear();
    });


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

  it('redirects to dashboard on successful login', async () => {
    // Arrange: Mock a successful login response
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { uid: '123', email: 'ali@khanevadati.app' },
    });

    render(<LoginPage />);

    // Act: Fill in the form with valid credentials and submit
    fireEvent.input(screen.getByLabelText(/ایمیل/i), {
      target: { value: 'ali@khanevadati.app' },
    });
    fireEvent.input(screen.getByLabelText(/رمز عبور/i), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /ورود/i }));

    // Assert: Wait for the router.push to be called to the dashboard
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
    // Optional: Assert that a success toast was shown
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'ورود موفق',
    }));
  });
});
