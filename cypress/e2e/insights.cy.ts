
describe("AI Insights Page", () => {
  beforeEach(() => {
    // Log in before each test
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");

    // Navigate to the insights page
    cy.visit("/insights");
    cy.contains("h1", "تحلیلگر هوشمند مالی").should("be.visible");
  });

  it("should allow a user to ask a question and see a loading state", () => {
    const questionText = 'یک تحلیل کلی از وضعیت مالی ما ارائه بده.';

    // 1. Click on one of the suggestion buttons
    cy.contains("button", "یک تحلیل کلی به من بده").click();

    // 2. Assert that the user's message appears in the chat list
    cy.contains(questionText).should("be.visible");

    // 3. Assert that the "thinking" or "loading" indicator is visible
    cy.contains("در حال تحلیل و آماده‌سازی پاسخ...").should("be.visible");

    // We cannot reliably test for the AI's response as it's asynchronous
    // and depends on an external service, but we've confirmed the UI interaction.
  });
});

