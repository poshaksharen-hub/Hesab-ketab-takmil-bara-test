
"use client";

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
    const mockError = new FirestorePermissionError({
        path: '/test/path',
        operation: 'read',
    });
    
    // We expect an error to be thrown, so we wrap the render and emit in a function
    const renderAndEmit = () => {
        render(<FirebaseErrorListener />);
        
        // Find the callback registered with the emitter
        const onCallback = (errorEmitter.on as jest.Mock).mock.calls.find(
          (call) => call[0] === 'permission-error'
        )?.[1];

        // If the callback exists, invoke it to simulate the error event
        if (onCallback) {
            act(() => {
                onCallback(mockError);
            });
        }
    };
    
    // Assert that calling the function throws the expected error message
    // This confirms that the listener correctly catches and re-throws the error
    expect(renderAndEmit).toThrow(mockError.message);
  });

  it('should unsubscribe from the event on unmount', () => {
    const { unmount } = render(<FirebaseErrorListener />);
    
    unmount();
    
    // Assert that the 'off' method was called, ensuring no memory leaks
    expect(errorEmitter.off).toHaveBeenCalledWith(
      'permission-error',
      expect.any(Function)
    );
  });
});
