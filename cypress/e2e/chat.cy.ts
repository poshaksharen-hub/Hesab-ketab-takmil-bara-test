
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

  it("should allow a user to send and see a message", () => {
    const messageText = `این یک پیام تستی است - ${new Date().getTime()}`;

    // 1. Type a message in the input
    cy.get('input[type="text"]').type(messageText);

    // 2. Click the send button
    cy.contains("button", "ارسال").click();

    // 3. Assert the new message is visible in the list
    cy.contains(messageText).should("be.visible");
  });
});

