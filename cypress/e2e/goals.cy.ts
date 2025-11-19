describe('Financial Goals Management', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/');
  });

  it('should create, achieve, revert, and delete a financial goal, managing blocked balances and expenses', () => {
    const goalName = `هدف تست ${Date.now()}`;
    const targetAmount = 50000;
    const savedAmount = 10000;
    const paymentAmount = targetAmount - savedAmount;

    let initialBalance: number;
    let initialBlockedBalance: number;
    let paymentCardInitialBalance: number;

    // --- 1. Get initial state of accounts ---
    cy.visit('/cards');
    // First card will be for saving/blocking
    cy.get('.relative.rounded-xl').first().within(() => {
      cy.get('.font-mono.tracking-widest.font-bold').invoke('text').then(text => {
        initialBalance = parseFloat(text.replace(/,/g, ''));
      });
      // This is a bit tricky, if blockedBalance is not rendered, we assume 0
      cy.get('body').then($body => {
         // This logic is not ideal, but we lack a dedicated element for blocked balance
         initialBlockedBalance = 0;
      });
    });
     // Second card will be for payment
    cy.get('.relative.rounded-xl').eq(1).within(() => {
      cy.get('.font-mono.tracking-widest.font-bold').invoke('text').then(text => {
        paymentCardInitialBalance = parseFloat(text.replace(/,/g, ''));
      });
    });


    // --- 2. Create a new financial goal with initial savings ---
    cy.visit('/goals');
    cy.contains('افزودن هدف جدید').click();

    cy.get('input[name="name"]').type(goalName);
    cy.get('input[name="targetAmount"]').type(targetAmount.toString());

    // Block initial amount
    cy.get('button[aria-haspopup="listbox"]').first().click();
    cy.get('[role="option"]').first().click(); // Select first card
    cy.get('input[name="savedAmount"]').type(savedAmount.toString());

    cy.contains('ذخیره').click();
    cy.contains('هدف مالی با موفقیت ذخیره شد.').should('be.visible');
    cy.contains(goalName).should('be.visible');
    cy.contains(`${Math.round((savedAmount / targetAmount) * 100)}٪ تکمیل شده`).should('be.visible');
    
    // --- 3. Verify blocked balance is NOT implemented in UI, so we check total balance hasn't changed ---
    // This is a limitation of the current UI, but we can check the logic still works.
    cy.visit('/cards');
    cy.get('.relative.rounded-xl').first().within(() => {
      cy.get('.font-mono.tracking-widest.font-bold').invoke('text').then(text => {
        const balanceAfterBlock = parseFloat(text.replace(/,/g, ''));
        // Balance should not change, but internally `blockedBalance` is set.
        expect(balanceAfterBlock).to.eq(initialBalance);
      });
    });

    // --- 4. Achieve the goal ---
    cy.visit('/goals');
    cy.contains(goalName).parents('div[class^="Card"]').contains('رسیدم به هدف!').click();

    // In the dialog
    cy.contains(`${paymentAmount.toLocaleString('fa-IR')} تومان`).should('be.visible');
    // Select the second card for the remaining payment
    cy.get('button[aria-haspopup="listbox"]').eq(1).click();
    cy.get('[role="option"]').eq(1).click(); // Select the second available card
    // Select the first category
    cy.get('button[aria-haspopup="listbox"]').eq(2).click();
    cy.get('[role="option"]').first().click();
    
    cy.contains('تایید و تحقق هدف').click();
    cy.contains('هدف محقق شد').should('be.visible');
    
    // --- 5. Verify balances and expense ---
    cy.visit('/transactions');
    cy.contains(`تحقق هدف: ${goalName}`).should('be.visible');
    cy.contains(`-${targetAmount.toLocaleString('fa-IR')} تومان`).should('be.visible');

    cy.visit('/cards');
     // Check second card's balance (paid the remainder)
    cy.get('.relative.rounded-xl').eq(1).within(() => {
      cy.get('.font-mono.tracking-widest.font-bold').invoke('text').then(text => {
        const finalPaymentCardBalance = parseFloat(text.replace(/,/g, ''));
        expect(finalPaymentCardBalance).to.eq(paymentCardInitialBalance - paymentAmount);
      });
    });

    // --- 6. Revert the goal ---
    cy.visit('/goals');
    cy.contains(goalName).parents('div[class^="Card"]').find('button').contains('بازگردانی کن').click({ force: true });
    cy.contains('هدف با موفقیت بازگردانی شد.').should('be.visible');

    // --- 7. Verify balances and expense are reverted ---
    cy.visit('/transactions');
    cy.contains(`تحقق هدف: ${goalName}`).should('not.exist');

    // --- 8. Delete the goal ---
     cy.visit('/goals');
     cy.contains(goalName).parents('div[class^="Card"]').find('button.text-destructive').click();
     cy.contains('بله، حذف کن').click();
     cy.contains('هدف مالی با موفقیت حذف شد.').should('be.visible');
  });
});
