describe("Internal Transfers Flow", () => {
  beforeEach(() => {
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");

    cy.visit("/transfers");
    cy.contains("h1", "انتقال داخلی").should("be.visible");
  });

  it("should allow a user to transfer money between two accounts", () => {
    const transferAmount = "150000";

    cy.contains("button", "ثبت انتقال جدید").click();

    // Select source account (from)
    cy.get('button[role="combobox"]').eq(0).click();
    cy.get('div[role="option"]').first().click();

    // Select destination account (to)
    cy.get('button[role="combobox"]').eq(1).click();
    cy.get('div[role="option"]').eq(1).click(); // Select the second available account

    cy.get('input[name="amount"]').type(transferAmount);
    cy.get('textarea[name="description"]').type("انتقال تستی بین دو حساب");
    
    cy.contains("button", "تایید و انتقال").click();

    // Assert the transfer is visible in the list
    cy.contains("۱۵۰٬۰۰۰ تومان").should("be.visible");
    cy.contains("انتقال تستی بین دو حساب").should("be.visible");
  });
});
