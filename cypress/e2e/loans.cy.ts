
describe("Loans Flow", () => {
  beforeEach(() => {
    // Log in and navigate to the loans page
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");
    cy.visit("/loans");
    cy.contains("h1", "مدیریت وام‌ها").should("be.visible");
  });

  it("should allow a user to add a new loan, pay an installment, and view details", () => {
    const loanTitle = `وام خرید خودرو - ${Math.floor(Math.random() * 1000)}`;
    const loanAmount = "50000000";
    const installmentAmount = "2000000";

    // --- Part 1: Add a new loan ---
    
    // 1. Click "Add New Loan"
    cy.contains("button", "ثبت وام جدید").click();

    // 2. Fill out the form
    cy.get('input[name="title"]').type(loanTitle);
    cy.get('input[name="amount"]').type(loanAmount);
    cy.get('input[name="installmentAmount"]').type(installmentAmount);
    cy.get('input[name="numberOfInstallments"]').type("25");

    cy.get('button[role="combobox"]').eq(1).click(); // Owner
    cy.get('div[role="option"]').contains("مشترک").click();

    // 3. Submit
    cy.contains("button", "ذخیره").click();

    // 4. Assert the new loan is visible
    cy.contains(loanTitle).should("be.visible");
    cy.contains("۵۰٬۰۰۰٬۰۰۰ تومان").should("be.visible");

    // --- Part 2: Pay an installment ---
    
    // 5. Find the loan and click "Pay Installment"
    cy.contains(loanTitle).parents('.group').contains("button", "پرداخت قسط").click();
    
    // 6. Confirm payment in the dialog
    cy.get('button[role="combobox"]').last().click();
    cy.get('div[role="option"]').first().click();
    cy.contains("button", "پرداخت و ثبت هزینه").click();

    // 7. Assert the remaining amount is updated
    cy.contains(loanTitle).parents('.group').contains("۴۸٬۰۰۰٬۰۰۰ تومان").should("be.visible");
    cy.contains(loanTitle).parents('.group').contains("۱ از ۲۵ قسط").should("be.visible");

    // --- Part 3: View Details ---
    // 8. Click on the loan to view its details
    cy.contains(loanTitle).parents('.group').click();
    cy.url().should('include', '/loans/');
    cy.contains('h1', loanTitle).should('be.visible');
    cy.contains('مبلغ باقی‌مانده: ۴۸٬۰۰۰٬۰۰۰ تومان').should('be.visible');
    cy.contains('td', '۲٬۰۰۰٬۰۰۰ تومان').should('be.visible'); // Check for payment in history table
  });
});
