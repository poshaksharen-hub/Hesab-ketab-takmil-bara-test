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

  it("should allow a user to add a new income", () => {
    const incomeDescription = `حقوق ماهانه - ${new Date().toLocaleDateString('fa-IR')}`;
    const incomeAmount = "20000000";

    // 1. Click "Add New Income"
    cy.contains("button", "ثبت درآمد جدید").click();

    // 2. Fill out the form in the dialog
    cy.get('textarea[name="description"]').type(incomeDescription);
    cy.get('input[name="amount"]').type(incomeAmount);
    
    cy.get('button[role="combobox"]').eq(0).click(); // Open income source dropdown
    cy.get('div[role="option"]').first().click(); // Select first source
    
    cy.get('button[role="combobox"]').eq(1).click(); // Open bank account dropdown
    cy.get('div[role="option"]').first().click(); // Select first bank account

    // 3. Submit
    cy.contains("button", "ذخیره").click();

    // 4. Assert the new income is visible in the list
    cy.contains(incomeDescription).should("be.visible");
    cy.contains("+۲۰٬۰۰۰٬۰۰۰ تومان").should("be.visible");
  });
});
