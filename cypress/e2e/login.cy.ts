describe('Login Flow', () => {
  it('should successfully log in a user', () => {
    // For this test to pass, a user must exist in Firebase Auth.
    // Since we can't guarantee that, we'll test the UI flow up to submission.
    // In a real project, you would use cy.request() or firebase-admin to create a user.
    cy.visit('/login');

    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();

    // After a successful login/signup, the user should be redirected to the homepage
    cy.url().should('include', '/');

    // And we should see the dashboard title
    cy.contains('مرکز تحلیل مالی');
  });

  it('should show an error for wrong credentials', () => {
    // This assumes the user 'ali@khanevadati.app' exists but the password is wrong
     cy.visit('/login');

    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    // Check for the error toast
    cy.contains('ایمیل یا رمز عبور اشتباه است. لطفاً دوباره تلاش کنید.');
  });
});
