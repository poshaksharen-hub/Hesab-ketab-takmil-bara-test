
describe("Chat Transaction Notifications", () => {
  const uniqueId = new Date().getTime();
  const expenseDescription = `خرید قهوه تستی - ${uniqueId}`;
  const expenseAmount = "120000";

  it("should show a system message in chat for both users after a new transaction is created", () => {
    // --- Part 1: Ali creates a new expense ---
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");

    cy.visit("/transactions");
    cy.contains("button", "ثبت هزینه جدید").click();

    // Fill out the form
    cy.get('textarea[name="description"]').type(expenseDescription);
    cy.get('input[name="amount"]').type(expenseAmount);

    cy.get('button[role="combobox"]').first().click(); // Bank account
    cy.get('div[role="option"]').first().click(); 

    cy.get('button[role="combobox"]').eq(1).click(); // Category
    cy.get('div[role="option"]').contains("کافه و رستوران").click();
    
    cy.get('button[role="combobox"]').eq(3).click(); // Expense for
    cy.get('div[role="option"]').contains("مشترک").click(); 

    cy.contains("button", "ذخیره").click();

    // --- Part 2: Ali checks the chat for the system message ---
    cy.visit("/chat");
    
    // Assert that the system message card is visible
    cy.contains('div', 'دستیار هوشمند مالی').should('be.visible');
    cy.contains('h2', `ثبت هزینه: ${expenseDescription}`).should('be.visible');
    cy.contains('div', '۱۲۰۰۰۰ تومان').should('be.visible');
    cy.contains('div', 'کافه و رستوران').should('be.visible');

    // Logout Ali
    cy.get('button[aria-label="خروج"]').first().click();
    cy.url().should("eq", "http://localhost:3000/login");

    // --- Part 3: Fatemeh logs in and sees the same system message ---
    cy.get('input[name="email"]').type("fatemeh@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");

    // Check for unread indicator
    cy.get('a[href="/chat"]').find('span').should('contain.text', '1');

    cy.visit("/chat");

    // Assert that the system message card is visible for Fatemeh as well
    cy.contains('div', 'دستیار هوشمند مالی').should('be.visible');
    cy.contains('h2', `ثبت هزینه: ${expenseDescription}`).should('be.visible');
    cy.contains('div', '۱۲۰۰۰۰ تومان').should('be.visible');
    cy.contains('div', 'کافه و رستوران').should('be.visible');
  });
});
