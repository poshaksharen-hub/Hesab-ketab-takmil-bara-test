describe("Expenses Flow", () => {
  beforeEach(() => {
    // Log in before each test
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");

    // Navigate to the expenses page
    cy.visit("/transactions");
    cy.contains("h1", "مدیریت هزینه‌ها").should("be.visible");
  });

  it("should allow a user to add and then delete an expense", () => {
    const expenseDescription = `هزینه تستی حذف - ${new Date().getTime()}`;
    const expenseAmount = "5000";

    // --- Part 1: Add Expense ---
    cy.contains("button", "ثبت هزینه جدید").click();

    // Fill out the form
    cy.get('textarea[name="description"]').type(expenseDescription);
    cy.get('input[name="amount"]').type(expenseAmount);

    cy.get('button[role="combobox"]').first().click(); 
    cy.get('div[role="option"]').first().click(); 

    cy.get('button[role="combobox"]').eq(1).click(); 
    cy.get('div[role="option"]').first().click(); 
    
    cy.contains("button", "ذخیره").click();

    // Assert the new expense is visible
    cy.contains("p", expenseDescription).should("be.visible");
    cy.contains("p", "+۵٬۰۰۰ تومان").should("not.exist");
    cy.contains("p", "-۵٬۰۰۰ تومان").should("be.visible");

    // --- Part 2: Delete Expense ---
    cy.contains("p", expenseDescription)
      .parents('.flex.flex-col')
      .find('button[aria-label="حذف هزینه"]')
      .click();

    // Confirm deletion in the dialog
    cy.get('button').contains('بله، حذف کن').click();

    // Assert the expense is no longer visible
    cy.contains("p", expenseDescription).should("not.exist");
  });
});
