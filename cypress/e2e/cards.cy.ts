describe("Bank Cards Flow", () => {
  beforeEach(() => {
    // Log in before each test
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");

    // Navigate to the cards page
    cy.visit("/cards");
    cy.contains("h1", "مدیریت کارت‌های بانکی").should("be.visible");
  });

  it("should allow a user to add a new bank card", () => {
    const cardNumber = `60379910${Math.floor(10000000 + Math.random() * 90000000)}`;

    // 1. Click the "Add New Card" button
    cy.contains("button", "افزودن کارت جدید").click();

    // 2. Fill out the form
    cy.get('button[role="combobox"]').first().click(); // Open bank name dropdown
    cy.get('div[role="option"]').contains("بانک ملی ایران").click();

    cy.get('input[name="accountNumber"]').type(`1234567${Math.floor(Math.random() * 1000)}`);
    cy.get('input[name="cardNumber"]').type(cardNumber);
    cy.get('input[name="expiryDate"]').type("12/07");
    cy.get('input[name="cvv2"]').type("123");
    cy.get('input[name="initialBalance"]').type("500000");

    cy.get('button[role="combobox"]').eq(1).click(); // Open account type
    cy.get('div[role="option"]').contains("پس‌انداز").click();
    
    // 3. Submit the form
    cy.contains("button", "ذخیره").click();

    // 4. Assert the new card is visible in the list
    cy.contains(cardNumber.replace(/(\d{4})/g, '$1 ')).should("be.visible");
    cy.contains("۵۰۰٬۰۰۰ تومان").should("be.visible");
  });
});
