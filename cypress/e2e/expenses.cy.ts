describe('Expense Transactions', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/');
    cy.visit('/transactions');
  });

  it('should create a new expense and correctly update the bank balance', () => {
    const expenseDescription = `هزینه تستی ${Date.now()}`;
    const expenseAmount = 15000;
    
    let initialBalance: number;

    // --- 1. Get initial balance of the first card ---
    cy.visit('/cards');
    cy.get('.font-mono.tracking-widest.font-bold')
      .first()
      .invoke('text')
      .then(text => {
        initialBalance = parseFloat(text.replace(/,/g, ''));
      });
    
    // --- 2. Create new expense ---
    cy.visit('/transactions');
    cy.contains('ثبت هزینه جدید').click();

    cy.get('input[name="description"]').type(expenseDescription);
    cy.get('input[name="amount"]').type(expenseAmount.toString());

    // Select the first bank account
    cy.get('button[aria-haspopup="listbox"]').first().click(); 
    cy.get('[role="option"]').first().click();

    // Select the first category
    cy.get('button[aria-haspopup="listbox"]').eq(1).click();
    cy.get('[role="option"]').first().click();

    cy.contains('ذخیره').click();

    cy.contains('هزینه جدید با موفقیت ثبت شد.').should('be.visible');
    cy.contains('td', expenseDescription).should('be.visible');

    // --- 3. Verify bank balance is updated ---
    cy.visit('/cards');
    cy.get('.font-mono.tracking-widest.font-bold')
      .first()
      .invoke('text')
      .then(text => {
        const newBalance = parseFloat(text.replace(/,/g, ''));
        expect(newBalance).to.eq(initialBalance - expenseAmount);
      });
      
    // --- 4. Cleanup: Delete the expense ---
    cy.visit('/transactions');
    cy.contains('td', expenseDescription)
      .parent('tr')
      .within(() => {
        cy.get('button[aria-label="Delete"]').click();
      });
    cy.contains('بله، حذف کن').click();
    cy.contains('هزینه با موفقیت حذف شد.').should('be.visible');
  });
});
