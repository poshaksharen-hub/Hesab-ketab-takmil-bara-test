describe('Internal Transfers', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/');
  });

  it('should correctly transfer funds between two accounts', () => {
    const transferAmount = 10000;
    let fromAccountInitialBalance: number;
    let toAccountInitialBalance: number;

    // We need at least two cards to perform a transfer
    cy.visit('/cards');
    cy.get('.font-mono.tracking-widest.font-bold').should('have.length.gte', 2);
    
    // --- 1. Get initial balances ---
    cy.get('.font-mono.tracking-widest.font-bold').first().invoke('text').then(text => {
      fromAccountInitialBalance = parseFloat(text.replace(/,/g, ''));
    });
    cy.get('.font-mono.tracking-widest.font-bold').eq(1).invoke('text').then(text => {
      toAccountInitialBalance = parseFloat(text.replace(/,/g, ''));
    });

    // --- 2. Perform transfer ---
    cy.visit('/transfers');
    
    // Select first account as source
    cy.get('button[aria-haspopup="listbox"]').first().click();
    cy.get('[role="option"]').first().click();
    
    // Select second account as destination
    cy.get('button[aria-haspopup="listbox"]').eq(1).click();
    cy.get('[role="option"]').first().click(); // After filtering, the first one is the second account overall

    cy.get('input[name="amount"]').type(transferAmount.toString());
    cy.contains('تایید و انتقال').click();

    cy.contains('انتقال وجه با موفقیت انجام شد.').should('be.visible');

    // --- 3. Verify balances are updated ---
    cy.visit('/cards');
    
    cy.get('.font-mono.tracking-widest.font-bold').first().invoke('text').then(text => {
      const newFromBalance = parseFloat(text.replace(/,/g, ''));
      expect(newFromBalance).to.eq(fromAccountInitialBalance - transferAmount);
    });

    cy.get('.font-mono.tracking-widest.font-bold').eq(1).invoke('text').then(text => {
      const newToBalance = parseFloat(text.replace(/,/g, ''));
      expect(newToBalance).to.eq(toAccountInitialBalance + transferAmount);
    });
  });
});
