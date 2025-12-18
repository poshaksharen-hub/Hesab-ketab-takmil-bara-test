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

  it("should allow a user to add a new expense", () => {
    const expenseDescription = `هزینه تستی - ${new Date().getTime()}`;
    const expenseAmount = "5000";

    // 1. Click the "Add New Expense" button
    cy.contains("button", "ثبت هزینه جدید").click();

    // 2. Fill out the form
    cy.get('textarea[name="description"]').type(expenseDescription);
    cy.get('input[name="amount"]').type(expenseAmount);

    // Select from dropdowns
    cy.get('button[role="combobox"]').first().click(); // Open bank account dropdown
    cy.get('div[role="option"]').first().click(); // Select the first bank account

    cy.get('button[role="combobox"]').eq(1).click(); // Open category dropdown
    cy.get('div[role="option"]').first().click(); // Select the first category
    
    // 3. Submit the form
    cy.contains("button", "ذخیره").click();

    // 4. Assert the new expense is visible in the list
    cy.contains("p", expenseDescription).should("be.visible");
    cy.contains("p", "+۵٬۰۰۰ تومان").should("not.exist"); // Make sure it's an expense
    cy.contains("p", "-۵٬۰۰۰ تومان").should("be.visible");
  });
});
