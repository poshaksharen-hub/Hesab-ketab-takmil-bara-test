
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

  it("should show an error when source and destination accounts are the same", () => {
    cy.contains("button", "ثبت انتقال جدید").click();

    // Select the same account for both source and destination
    cy.get('button[role="combobox"]').eq(0).click();
    cy.get('div[role="option"]').first().click();

    cy.get('button[role="combobox"]').eq(1).click();
    // The first item in the 'to' list should now be the second overall account,
    // so clicking the first one here should still result in a different account.
    // To properly test this, we need to find the same account name.
    // Let's get the text of the first selected account.
    cy.get('button[role="combobox"]').eq(0).invoke('text').then((fromAccountText) => {
        cy.get('button[role="combobox"]').eq(1).click();
        // This is tricky because the list re-renders. We'll have to find it by text.
        // And since the 'from' list is a different component, we just select the first one again,
        // which after the 'from' selection is now the same account.
        cy.get('button[role="combobox"]').eq(0).click();
        cy.get('div[role="option"]').first().click();

        cy.get('input[name="amount"]').type("1000");
        cy.contains("button", "تایید و انتقال").click();

        // We expect a toast message for this error
        cy.contains("حساب مبدا و مقصد نمی‌توانند یکسان باشند.").should("be.visible");
    });
  });
});
