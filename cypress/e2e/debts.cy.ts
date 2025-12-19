
describe("Debts Flow", () => {
  beforeEach(() => {
    // Log in and navigate to the debts page
    cy.visit("/login");
    cy.get('input[name="email"]').type("fatemeh@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");
    cy.visit("/debts");
    cy.contains("h1", "مدیریت بدهی‌ها").should("be.visible");
  });

  it("should allow a user to add a new installment-based debt and pay it", () => {
    const debtDescription = `بدهی تستی قسطی - ${new Date().getTime()}`;
    const debtAmount = "1000000";
    const installmentAmount = "200000";

    // --- Part 1: Add a new debt ---

    // 1. Click "Add New Debt"
    cy.contains("button", "ثبت بدهی جدید").click();

    // 2. Fill out the form
    cy.get('textarea[name="description"]').type(debtDescription);
    cy.get('input[name="amount"]').type(debtAmount);

    cy.get('button[role="combobox"]').eq(0).click(); // Payee
    cy.get('div[role="option"]').first().click();

    cy.get('button[role="combobox"]').eq(1).click(); // Owner
    cy.get('div[role="option"]').contains("مشترک").click();
    
    // Select installment-based payment
    cy.get('button[role="switch"]').click();

    cy.get('input[name="installmentAmount"]').type(installmentAmount);
    cy.get('input[name="numberOfInstallments"]').type("5");

    // 3. Submit
    cy.contains("button", "ذخیره").click();

    // 4. Assert the new debt is visible
    cy.contains(debtDescription).should("be.visible");
    cy.contains("۱٬۰۰۰٬۰۰۰ تومان").should("be.visible");

    // --- Part 2: Pay an installment ---
    
    // 5. Find the debt and click "Pay Debt"
    cy.contains(debtDescription).parents('.group').contains("button", "پرداخت بدهی").click();
    
    // 6. Confirm payment in the dialog
    cy.get('button[role="combobox"]').last().click();
    cy.get('div[role="option"]').first().click();
    cy.contains("button", "پرداخت و ثبت هزینه").click();

    // 7. Assert the remaining amount is updated
    cy.contains(debtDescription).parents('.group').contains("۸۰۰٬۰۰۰ تومان").should("be.visible");
  });
});
