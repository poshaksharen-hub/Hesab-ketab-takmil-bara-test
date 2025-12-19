
describe("Payees Flow", () => {
  beforeEach(() => {
    cy.visit("/login");
    cy.get('input[name="email"]').type("fatemeh@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");

    cy.visit("/payees");
    cy.contains("h1", "مدیریت طرف حساب‌ها").should("be.visible");
  });

  it("should allow a user to add a new payee, view their details, and then delete them", () => {
    const payeeName = `تست حذف طرف حساب - ${new Date().getTime()}`;
    const phoneNumber = `0912${Math.floor(1000000 + Math.random() * 9000000)}`;

    // --- Part 1: Add Payee ---
    cy.contains("button", "افزودن طرف حساب").click();

    cy.get('input[name="name"]').type(payeeName);
    cy.get('input[name="phoneNumber"]').type(phoneNumber);
    
    cy.contains("button", "ذخیره").click();

    // Assert it's in the list
    cy.contains("td", payeeName).should("be.visible");
    cy.contains("td", phoneNumber).should("be.visible");

    // --- Part 2: View Details ---
    cy.contains("td", payeeName).click();

    cy.url().should("include", "/payees/");
    cy.contains("h1", `دفتر حساب: ${payeeName}`).should("be.visible");
    cy.contains("هیچ تراکنشی برای این طرف حساب ثبت نشده است.").should("be.visible");
    cy.visit("/payees"); // Go back to the list

    // --- Part 3: Delete Payee ---
    cy.contains("td", payeeName)
      .parents("tr")
      .find('button[aria-label="Delete"]')
      .click();

    // Confirm deletion in the dialog
    cy.get('button').contains('بله، حذف کن').click();

    // Assert the payee is no longer visible
    cy.contains("td", payeeName).should("not.exist");
  });
});
