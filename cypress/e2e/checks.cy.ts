describe("Checks Flow", () => {
  beforeEach(() => {
    // Log in and navigate to the checks page
    cy.visit("/login");
    cy.get('input[name="email"]').type("fatemeh@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");
    cy.visit("/checks");
    cy.contains("h1", "مدیریت چک‌ها").should("be.visible");
  });

  it("should allow a user to add a new check and then clear it", () => {
    const payeeName = "فروشگاه لوازم خانگی سعادت";
    const checkAmount = "2500000";
    const sayadId = `123456${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // --- Part 1: Add a new check ---

    // 1. Click "Add New Check"
    cy.contains("button", "ثبت چک جدید").click();

    // 2. Fill out the form
    cy.get('button[role="combobox"]').eq(0).click(); // Open payee dropdown
    cy.get('div[role="option"]').contains(payeeName).click({ force: true });
    
    cy.get('input[name="amount"]').type(checkAmount);
    cy.get('input[name="sayadId"]').type(sayadId);
    cy.get('input[name="checkSerialNumber"]').type("987654");

    cy.get('button[role="combobox"]').eq(1).click(); // Bank Account
    cy.get('div[role="option"]').first().click();

    cy.get('button[role="combobox"]').eq(2).click(); // Category
    cy.get('div[role="option"]').contains("خرید لوازم منزل").click();
    
    cy.get('button[role="combobox"]').eq(3).click(); // Expense For
    cy.get('div[role="option"]').contains("مشترک").click();

    // Submit
    cy.contains("button", "ذخیره").click();

    // 3. Assert the new check is visible
    cy.contains(sayadId).should("be.visible");
    cy.contains("۲٬۵۰۰٬۰۰۰ تومان").should("be.visible");

    // --- Part 2: Clear the check ---

    // 4. Find the newly created check and open its action menu
    cy.contains(sayadId).parents('.group').find('button[aria-label="Actions"]').click();

    // 5. Click the "Clear Check" option
    cy.contains("div", "پاس کردن چک").click();

    // 6. Confirm the action in the dialog
    cy.get('button').contains("تایید و پاس کردن").click();

    // 7. Assert the check is now marked as "Cleared"
    cy.contains(sayadId).parents('.group').find('.opacity-60').should('exist');
    cy.contains(sayadId).parents('.group').contains("پاس شد").should('be.visible');
  });
});
