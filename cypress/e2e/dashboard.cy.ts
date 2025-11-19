describe('Dashboard', () => {
  it('should load the dashboard and display summary cards', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();
    
    cy.url().should('include', '/');
    cy.contains('مرکز تحلیل مالی');

    // Check for summary cards
    cy.contains('دارایی خالص');
    cy.contains('کل دارایی');
    cy.contains('کل بدهی');
    cy.contains('کل درآمد');
    cy.contains('کل هزینه');
  });
});
