describe("Income Flow", () => {
  beforeEach(() => {
    // Log in and navigate to the income page
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");
    cy.visit("/income");
    cy.contains("h1", "مدیریت درآمدها").should("be.visible");
  });

  it("should allow a user to add and then delete an income", () => {
    const incomeDescription = `حقوق ماهانه تستی (حذف) - ${new Date().toLocaleDateString('fa-IR')}`;
    const incomeAmount = "20000000";

    // --- Part 1: Add Income ---
    cy.contains("button", "ثبت درآمد جدید").click();

    cy.get('textarea[name="description"]').type(incomeDescription);
    cy.get('input[name="amount"]').type(incomeAmount);
    
    cy.get('button[role="combobox"]').eq(0).click();
    cy.get('div[role="option"]').first().click();
    
    cy.get('button[role="combobox"]').eq(1).click();
    cy.get('div[role="option"]').first().click();

    cy.contains("button", "ذخیره").click();

    cy.contains(incomeDescription).should("be.visible");
    cy.contains("+۲۰٬۰۰۰٬۰۰۰ تومان").should("be.visible");
    
    // --- Part 2: Delete Income ---
    cy.contains(incomeDescription)
      .parents('.flex.flex-col')
      .find('button[aria-label="حذف درآمد"]')
      .click();

    // Confirm deletion in the dialog
    cy.get('button').contains('بله، حذف کن').click();

    // Assert the income is no longer visible
    cy.contains(incomeDescription).should("not.exist");
  });
});
