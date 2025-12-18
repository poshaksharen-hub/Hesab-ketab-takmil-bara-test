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

  it("should allow a user to add a new payee", () => {
    const payeeName = `تست طرف حساب - ${new Date().getTime()}`;
    const phoneNumber = `0912${Math.floor(1000000 + Math.random() * 9000000)}`;

    cy.contains("button", "افزودن طرف حساب").click();

    cy.get('input[name="name"]').type(payeeName);
    cy.get('input[name="phoneNumber"]').type(phoneNumber);
    
    cy.contains("button", "ذخیره").click();

    cy.contains("td", payeeName).should("be.visible");
    cy.contains("td", phoneNumber).should("be.visible");
  });
});
