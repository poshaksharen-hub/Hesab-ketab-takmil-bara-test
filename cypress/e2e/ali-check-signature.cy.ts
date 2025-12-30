
describe("Ali's Check Signature Flow", () => {
  beforeEach(() => {
    // Log in as Ali and navigate to the checks page
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");
    cy.visit("/checks");
    cy.contains("h1", "مدیریت چک‌ها").should("be.visible");
  });

  it("should display Ali's signature next to the check he created", () => {
    const payeeName = "فروشگاه زنجیره‌ای رفاه";
    const checkAmount = "1250000";
    // Using a unique Sayad ID to ensure we find the exact check
    const sayadId = `sig-test-${Date.now()}`;

    // --- Part 1: Add a new check as Ali ---
    cy.contains("button", "ثبت چک جدید").click();

    // Fill out the form
    cy.get('button[role="combobox"]').first().click(); // Open payee dropdown
    cy.get('div[role="option"]').contains(payeeName).click({ force: true });
    
    cy.get('input[name="amount"]').type(checkAmount);
    cy.get('input[name="sayadId"]').type(sayadId);
    cy.get('input[name="checkSerialNumber"]').type("123123");

    cy.get('button[role="combobox"]').eq(1).click(); // Bank Account
    // Select the first available bank account for Ali
    cy.get('div[role="option"]').first().click();

    cy.get('button[role="combobox"]').eq(2).click(); // Category
    cy.get('div[role="option"]').contains("خرید‌های روزمره").click();
    
    // The check is for Ali himself
    cy.get('button[role="combobox"]').eq(3).click(); 
    cy.get('div[role="option"]').contains("علی").click();

    cy.contains("button", "ثبت و امضا").click();

    // Confirm signature
    cy.get('button').contains('تایید و ذخیره امضا').click();

    // --- Part 2: Assert the new check is visible with the signature ---
    cy.contains("p", sayadId)
      .should("be.visible")
      .parents("[data-testid^='check-item-']") // Find the parent container of the check item
      .within(() => {
        // Assert that the signature image is present and has the correct src
        cy.get("img[alt*='امضای']")
          .should("be.visible")
          .and("have.attr", "src");

        // Optional: Also verify other details
        cy.contains("۱٬۲۵۰٬۰۰۰ تومان");
        cy.contains(payeeName);
      });
  });
});
