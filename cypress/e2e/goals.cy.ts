describe("Financial Goals Flow", () => {
  beforeEach(() => {
    // Log in and navigate to the goals page
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");
    cy.visit("/goals");
    cy.contains("h1", "اهداف مالی").should("be.visible");
  });

  it("should allow a user to create a new goal and add funds to it", () => {
    const goalName = `سفر به کیش - ${new Date().getTime()}`;
    const targetAmount = "15000000";
    const initialAmount = "1000000";
    const contributionAmount = "500000";

    // --- Part 1: Create a new goal ---
    
    // 1. Click "Add New Goal"
    cy.contains("button", "افزودن هدف جدید").click();

    // 2. Fill out the form
    cy.get('input[name="name"]').type(goalName);
    cy.get('input[name="targetAmount"]').type(targetAmount);

    cy.get('button[role="combobox"]').eq(2).click(); // Bank account for initial contribution
    cy.get('div[role="option"]').first().click();

    cy.get('input[name="initialContributionAmount"]').type(initialAmount);

    // 3. Submit
    cy.contains("button", "افزودن هدف").click();

    // 4. Assert the new goal is in the list
    cy.contains(goalName).should("be.visible");
    cy.contains("۱٬۰۰۰٬۰۰۰ تومان").should("be.visible");

    // --- Part 2: Add more funds to the goal ---

    // 5. Find the goal and click "Add to Savings"
    cy.contains(goalName).parents('.group').contains("button", "افزودن به پس‌انداز").click();

    // 6. Fill the contribution dialog
    cy.get('input[name="amount"]').last().type(contributionAmount);
    
    // 7. Submit contribution
    cy.contains("button", "افزودن و مسدود کردن").click();
    
    // 8. Assert the new total is updated
    cy.contains(goalName).parents('.group').contains("۱٬۵۰۰٬۰۰۰ تومان").should("be.visible");
  });
});
