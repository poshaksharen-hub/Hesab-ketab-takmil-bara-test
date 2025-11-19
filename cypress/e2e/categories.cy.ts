describe('Categories (CRUD)', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[type="email"]').type('ali@khanevadati.app');
    cy.get('input[type="password"]').type('123456');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/');
    cy.visit('/categories');
  });

  it('should create, edit, and delete a category', () => {
    const categoryName = `دسته تست ${Date.now()}`;
    const editedCategoryName = `${categoryName} (ویرایش شده)`;

    // --- Create ---
    cy.contains('افزودن دسته‌بندی').click();
    
    cy.get('input[name="name"]').type(categoryName);
    cy.get('textarea[name="description"]').type('این یک توضیحات تستی است.');
    
    cy.contains('ذخیره').click();
    
    cy.contains('دسته‌بندی جدید با موفقیت اضافه شد.').should('be.visible');
    cy.contains('td', categoryName).should('be.visible');

    // --- Edit ---
    cy.contains('td', categoryName)
      .parent('tr')
      .within(() => {
        cy.get('button[aria-label="Edit"]').click();
      });

    cy.get('input[name="name"]').clear().type(editedCategoryName);
    cy.contains('ذخیره').click();

    cy.contains('دسته‌بندی با موفقیت ویرایش شد.').should('be.visible');
    cy.contains('td', editedCategoryName).should('be.visible');

    // --- Delete ---
    cy.contains('td', editedCategoryName)
      .parent('tr')
      .within(() => {
        cy.get('button[aria-label="Delete"]').click();
      });
      
    cy.contains('بله، حذف کن').click();
    
    cy.contains('دسته‌بندی با موفقیت حذف شد.').should('be.visible');
    cy.contains('td', editedCategoryName).should('not.exist');
  });
});
