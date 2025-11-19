describe('Bank Cards (CRUD)', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/');
    cy.visit('/cards');
  });

  const generateCardNumber = () => Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();


  it('should create, edit, and delete a personal bank card', () => {
    const personalCardNumber = generateCardNumber();

    // --- Create Personal Card ---
    cy.contains('افزودن کارت جدید').click();
    
    cy.get('input[name="bankName"]').type('بانک تست شخصی');
    cy.get('input[name="accountNumber"]').type('123456789');
    cy.get('input[name="cardNumber"]').type(personalCardNumber);
    cy.get('input[name="expiryDate"]').type('12/29');
    cy.get('input[name="cvv2"]').type('123');
    cy.get('input[name="initialBalance"]').type('500000');
    // Owner is 'me' by default
    
    cy.contains('ذخیره').click();
    cy.contains('کارت بانکی جدید با موفقیت اضافه شد.').should('be.visible');
    cy.contains(personalCardNumber.replace(/(\d{4})/g, '$1 ').trim()).should('be.visible');

    // --- Edit Card ---
    cy.contains(personalCardNumber.replace(/(\d{4})/g, '$1 ').trim())
      .parents('.relative')
      .find('button[aria-label="Actions"]')
      .click();

    cy.contains('ویرایش').click();
    
    cy.get('input[name="bankName"]').clear().type('بانک تست شخصی (ویرایش شده)');
    cy.contains('ذخیره').click();

    cy.contains('کارت بانکی با موفقیت ویرایش شد.').should('be.visible');
    cy.contains('بانک تست شخصی (ویرایش شده)').should('be.visible');

    // --- Delete Card ---
     cy.contains(personalCardNumber.replace(/(\d{4})/g, '$1 ').trim())
      .parents('.relative')
      .find('button[aria-label="Actions"]')
      .click();
      
    cy.get('[data-cy="delete-card-trigger"]').click();
    cy.contains('بله، حذف کن').click();
    
    cy.contains('کارت بانکی با موفقیت حذف شد.').should('be.visible');
    cy.contains(personalCardNumber.replace(/(\d{4})/g, '$1 ').trim()).should('not.exist');
  });

  it('should create and delete a shared bank card', () => {
    const sharedCardNumber = generateCardNumber();

    // --- Create Shared Card ---
    cy.contains('افزودن کارت جدید').click();

    cy.get('input[name="bankName"]').type('بانک تست مشترک');
    cy.get('input[name="accountNumber"]').type('987654321');
    cy.get('input[name="cardNumber"]').type(sharedCardNumber);
    cy.get('input[name="expiryDate"]').type('11/28');
    cy.get('input[name="cvv2"]').type('456');
    cy.get('input[name="initialBalance"]').type('1200000');
    cy.get('input[name="isShared"]').parent().find('button[role="switch"]').click();
    
    cy.contains('ذخیره').click();
    
    cy.contains('کارت بانکی مشترک جدید با موفقیت اضافه شد.').should('be.visible');
    cy.contains('حساب مشترک').should('be.visible');

     // --- Delete Card ---
     cy.contains(sharedCardNumber.replace(/(\d{4})/, '$1 '))
      .parents('.relative')
      .find('button[aria-label="Actions"]')
      .click();
      
    cy.get('[data-cy="delete-card-trigger"]').click();
    cy.contains('بله، حذف کن').click();
    
    cy.contains('کارت بانکی با موفقیت حذف شد.').should('be.visible');
    cy.contains(sharedCardNumber.replace(/(\d{4})/g, '$1 ').trim()).should('not.exist');
  });
});
