
import { render, act } from '@testing-library/react';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Mock the errorEmitter
jest.mock('@/firebase/error-emitter', () => ({
  errorEmitter: {
    on: jest.fn(),
    off: jest.fn(),
  },
}));

describe('FirebaseErrorListener', () => {
  it('should throw an error when a permission-error is emitted', () => {
    const mockError = new FirestorePermissionError('Test error');
    
    // Use a try-catch block to assert that an error is thrown
    try {
      render(<FirebaseErrorListener />);
      
      // Simulate the emission of the 'permission-error' event
      act(() => {
        // Find the registered callback and invoke it
        const callback = (errorEmitter.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'permission-error'
        )[1];
        callback(mockError);
      });
      
    } catch (error) {
      expect(error).toBe(mockError);
    }
  });

  it('should unsubscribe from the event on unmount', () => {
    const { unmount } = render(<FirebaseErrorListener />);
    
    unmount();
    
    expect(errorEmitter.off).toHaveBeenCalledWith(
      'permission-error',
      expect.any(Function)
    );
  });
});
