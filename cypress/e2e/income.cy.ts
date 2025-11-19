describe('Income Transactions', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/');
    cy.visit('/income');
  });

  it('should create a new income and correctly update the bank balance', () => {
    const incomeDescription = `درآمد تستی ${Date.now()}`;
    const incomeAmount = 50000;
    
    let initialBalance: number;

    // --- 1. Get initial balance of the first card ---
    cy.visit('/cards');
    cy.get('.font-mono.tracking-widest.font-bold')
      .first()
      .invoke('text')
      .then(text => {
        initialBalance = parseFloat(text.replace(/,/g, ''));
      });
    
    // --- 2. Create new income ---
    cy.visit('/income');
    cy.contains('ثبت درآمد جدید').click();

    cy.get('input[name="description"]').type(incomeDescription);
    cy.get('input[name="amount"]').type(incomeAmount.toString());

    // Select source
    cy.get('button[aria-haspopup="listbox"]').first().click(); 
    cy.get('[role="option"]').contains('شغل مشترک').click();

    // Select bank account
    cy.get('button[aria-haspopup="listbox"]').eq(1).click();
    cy.get('[role="option"]').first().click();

    cy.contains('ذخیره').click();

    cy.contains('درآمد جدید با موفقیت ثبت شد.').should('be.visible');
    cy.contains('td', incomeDescription).should('be.visible');

    // --- 3. Verify bank balance is updated ---
    cy.visit('/cards');
    cy.get('.font-mono.tracking-widest.font-bold')
      .first()
      .invoke('text')
      .then(text => {
        const newBalance = parseFloat(text.replace(/,/g, ''));
        expect(newBalance).to.eq(initialBalance + incomeAmount);
      });
      
    // --- 4. Cleanup: Delete the income ---
    cy.visit('/income');
    cy.contains('td', incomeDescription)
      .parent('tr')
      .within(() => {
        cy.get('button[aria-label="Delete"]').click();
      });
    cy.contains('بله، حذف کن').click();
    cy.contains('درآمد با موفقیت حذف شد.').should('be.visible');
  });
});
