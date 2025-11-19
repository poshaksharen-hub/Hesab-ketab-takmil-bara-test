describe('Payees (CRUD)', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/');
    cy.visit('/payees');
  });

  it('should create, edit, and delete a payee', () => {
    const payeeName = `طرف حساب تست ${Date.now()}`;
    const editedPayeeName = `${payeeName} (ویرایش شده)`;

    // --- Create ---
    cy.contains('افزودن طرف حساب').click();
    
    cy.get('input[name="name"]').type(payeeName);
    cy.get('input[name="phoneNumber"]').type('09120000000');
    
    cy.contains('ذخیره').click();
    
    cy.contains('طرف حساب جدید با موفقیت اضافه شد.').should('be.visible');
    cy.contains('td', payeeName).should('be.visible');

    // --- Edit ---
    cy.contains('td', payeeName)
      .parent('tr')
      .within(() => {
        cy.get('button[aria-label="Edit"]').click();
      });

    cy.get('input[name="name"]').clear().type(editedPayeeName);
    cy.contains('ذخیره').click();

    cy.contains('طرف حساب با موفقیت ویرایش شد.').should('be.visible');
    cy.contains('td', editedPayeeName).should('be.visible');

    // --- Delete ---
    cy.contains('td', editedPayeeName)
      .parent('tr')
      .within(() => {
        cy.get('button[aria-label="Delete"]').click();
      });
      
    cy.contains('بله، حذف کن').click();
    
    cy.contains('طرف حساب با موفقیت حذف شد.').should('be.visible');
    cy.contains('td', editedPayeeName).should('not.exist');
  });
});
