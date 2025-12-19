
describe("Chat Flow", () => {
  beforeEach(() => {
    // Log in before each test
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");

    // Navigate to the chat page
    cy.visit("/chat");
    cy.contains("h1", "گفتگوی مشترک").should("be.visible");
  });

  it("should allow a user to send a message, reply to it, and see both messages correctly", () => {
    const firstMessageText = `این یک پیام تستی است - ${new Date().getTime()}`;
    const replyMessageText = `این یک پاسخ به پیام تستی است.`;

    // --- Part 1: Send the initial message ---
    cy.get('input[type="text"]').type(firstMessageText);
    cy.contains("button", "ارسال").click();
    cy.contains('p', firstMessageText).should("be.visible");

    // --- Part 2: Reply to the message ---
    // Find the message we just sent and click on it to trigger the reply action
    cy.contains('p', firstMessageText).click();

    // The reply context bar should appear
    cy.contains("در پاسخ به:").should("be.visible");
    cy.contains(firstMessageText).should("be.visible");

    // Type and send the reply
    cy.get('input[type="text"]').type(replyMessageText);
    cy.contains("button", "ارسال").click();
    
    // --- Part 3: Assert the reply is visible and correctly formatted ---
    // The new message should be visible
    cy.contains('p', replyMessageText).should("be.visible");
    // And it should contain a quote of the original message
    cy.contains('p', replyMessageText)
      .parents('[class*="rounded-lg"]') // Go up to the message bubble
      .find('[class*="border-l-2"]') // Find the reply quote block
      .should('contain', firstMessageText);
  });
});
