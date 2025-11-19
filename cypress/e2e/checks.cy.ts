describe('Check Management', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/');
  });

  it('should create, clear, and delete a check, updating balances and expenses correctly', () => {
    const checkAmount = 25000;
    const payeeName = `طرف حساب چک ${Date.now()}`;
    let initialBalance: number;

    // --- 1. Create a Payee and a Category first ---
    cy.visit('/payees');
    cy.contains('افزودن طرف حساب').click();
    cy.get('input[name="name"]').type(payeeName);
    cy.contains('ذخیره').click();
    cy.contains(payeeName).should('be.visible');

    // --- 2. Get initial balance of the checking account ---
    cy.visit('/cards');
    // Find the first card with accountType 'checking'
    cy.contains('دسته چک').parents('.relative').within(() => {
        cy.get('.font-mono.tracking-widest.font-bold').invoke('text').then(text => {
            initialBalance = parseFloat(text.replace(/,/g, ''));
        });
    });

    // --- 3. Create a new pending check ---
    cy.visit('/checks');
    cy.contains('ثبت چک جدید').click();
    
    cy.get('button[aria-haspopup="listbox"]').first().click();
    cy.get('[role="option"]').contains(payeeName).click();
    cy.get('input[name="amount"]').type(checkAmount.toString());
    
    cy.get('button[aria-haspopup="listbox"]').eq(1).click();
    cy.get('[role="option"]').contains('دسته چک').click(); // Select the checking account
    
    cy.get('button[aria-haspopup="listbox"]').eq(2).click();
    cy.get('[role="option"]').first().click(); // Select first category

    cy.get('input[name="description"]').type('تست چک');
    
    cy.contains('ذخیره').click();
    cy.contains('چک جدید با موفقیت ثبت شد.').should('be.visible');
    cy.contains('td', payeeName).should('be.visible');
    cy.contains('در انتظار پاس').should('be.visible');

    // --- 4. Verify balance has NOT changed yet ---
     cy.visit('/cards');
     cy.contains('دسته چک').parents('.relative').within(() => {
        cy.get('.font-mono.tracking-widest.font-bold').invoke('text').then(text => {
            const newBalance = parseFloat(text.replace(/,/g, ''));
            expect(newBalance).to.eq(initialBalance);
        });
    });

    // --- 5. Clear the check ---
    cy.visit('/checks');
    cy.contains('td', payeeName).parent('tr').within(() => {
      cy.get('button[title="پاس کردن چک"]').click();
    });
    cy.contains('بله، پاس کن').click();
    cy.contains('چک با موفقیت پاس شد').should('be.visible');
    cy.contains('پاس شده').should('be.visible');
    
    // --- 6. Verify balance has been DEDUCTED ---
    cy.visit('/cards');
     cy.contains('دسته چک').parents('.relative').within(() => {
        cy.get('.font-mono.tracking-widest.font-bold').invoke('text').then(text => {
            const newBalance = parseFloat(text.replace(/,/g, ''));
            expect(newBalance).to.eq(initialBalance - checkAmount);
        });
    });

    // --- 7. Verify an expense has been created ---
    cy.visit('/transactions');
    cy.contains(`پاس کردن چک به: ${payeeName}`).should('be.visible');
    cy.contains(`-${checkAmount.toLocaleString('fa-IR')} تومان`).should('be.visible');


    // --- 8. Delete the cleared check ---
    cy.visit('/checks');
    cy.contains('td', payeeName).parent('tr').within(() => {
      cy.get('button.text-destructive').click();
    });
    cy.contains('بله، حذف کن').click();
    cy.contains('چک با موفقیت حذف شد.').should('be.visible');
    cy.contains('td', payeeName).should('not.exist');
    
    // --- 9. Verify balance is RESTORED ---
    cy.visit('/cards');
    cy.contains('دسته چک').parents('.relative').within(() => {
        cy.get('.font-mono.tracking-widest.font-bold').invoke('text').then(text => {
            const finalBalance = parseFloat(text.replace(/,/g, ''));
            expect(finalBalance).to.eq(initialBalance);
        });
    });

     // --- 10. Verify the expense is DELETED ---
    cy.visit('/transactions');
    cy.contains(`پاس کردن چک به: ${payeeName}`).should('not.exist');
  });
});
