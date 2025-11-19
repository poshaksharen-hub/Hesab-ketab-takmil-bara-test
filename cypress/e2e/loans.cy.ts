describe('Loan and Installment Management', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/');
  });

  it('should create a loan, pay an installment, and verify all balances and records', () => {
    const loanTitle = `وام تست ${Date.now()}`;
    const loanAmount = 100000;
    const installmentAmount = 10000;
    let initialBalance: number;
    let initialLoanCount: number;

    // --- 1. Get initial state ---
    cy.visit('/cards');
    cy.get('.font-mono.tracking-widest.font-bold').first().invoke('text').then(text => {
        initialBalance = parseFloat(text.replace(/,/g, ''));
    });
    cy.visit('/loans');
    cy.get('body').then($body => {
        initialLoanCount = $body.find('.grid.grid-cols-1.md\\:grid-cols-2.gap-6 > div').length;
    });

    // --- 2. Create a new Loan ---
    cy.visit('/loans');
    cy.contains('ثبت وام جدید').click();
    
    cy.get('input[name="title"]').type(loanTitle);
    cy.get('input[name="amount"]').type(loanAmount.toString());
    cy.get('input[name="installmentAmount"]').type(installmentAmount.toString());
    cy.get('input[name="numberOfInstallments"]').type('10');
    cy.get('input[name="paymentDay"]').type('15');
    
    cy.contains('ذخیره').click();
    cy.contains('وام جدید با موفقیت ثبت شد.').should('be.visible');
    cy.contains(loanTitle).should('be.visible');
    cy.contains('0 از 10 قسط پرداخت شده').should('be.visible');

    // --- 3. Pay one installment ---
    cy.contains(loanTitle).parents('div[class^="Card"]').within(() => {
        cy.contains('پرداخت قسط').click();
    });

    // In the dialog
    cy.get('button[aria-haspopup="listbox"]').click();
    cy.get('[role="option"]').first().click(); // Select the first bank account
    cy.contains('پرداخت و ثبت هزینه').click();

    cy.contains('قسط با موفقیت پرداخت و به عنوان هزینه ثبت شد.').should('be.visible');

    // --- 4. Verify loan status updated ---
    cy.contains(loanTitle).should('be.visible');
    cy.contains('1 از 10 قسط پرداخت شده').should('be.visible');
    cy.contains(`${(loanAmount - installmentAmount).toLocaleString('fa-IR')} تومان`).should('be.visible');


    // --- 5. Verify bank balance is updated ---
     cy.visit('/cards');
    cy.get('.font-mono.tracking-widest.font-bold').first().invoke('text').then(text => {
        const newBalance = parseFloat(text.replace(/,/g, ''));
        expect(newBalance).to.eq(initialBalance - installmentAmount);
    });

    // --- 6. Verify an expense has been created ---
    cy.visit('/transactions');
    cy.contains(`پرداخت قسط وام: ${loanTitle}`).should('be.visible');

    // --- 7. Cleanup: Delete the loan ---
    cy.visit('/loans');
    cy.contains(loanTitle).parents('div[class^="Card"]').within(() => {
        cy.get('button.text-destructive').click();
    });
    cy.contains('بله، حذف کن').click();
    cy.contains('وام و تمام سوابق پرداخت آن با موفقیت حذف شدند.').should('be.visible');
    
    cy.get('body').then($body => {
        const finalLoanCount = $body.find('.grid.grid-cols-1.md\\:grid-cols-2.gap-6 > div').length;
        if (finalLoanCount > 0 || initialLoanCount > 0) { // Avoid assertion error if there were no loans to begin with
            expect(finalLoanCount).to.eq(initialLoanCount);
        }
    });

  });
});
