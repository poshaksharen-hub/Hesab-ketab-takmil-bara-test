o
describe("Data Migration Tool", () => {
  beforeEach(() => {
    // Log in before each test
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");

    // Navigate to the data migration page
    cy.visit("/data-migration");
    cy.contains("h1", "ابزار اصلاح داده‌های قدیمی").should("be.visible");
  });

  it("should allow a user to run the migration and see a success message", () => {
    // 1. Click the migration button
    cy.contains("button", "شروع اصلاح داده‌ها").click();

    // 2. Assert that the loading state is visible
    cy.contains("button", "در حال اصلاح...").should("be.visible");

    // 3. Wait for the operation to complete and assert the success message
    // The timeout is increased because the migration might take a few seconds
    cy.contains("عملیات با موفقیت انجام شد!", { timeout: 10000 }).should("be.visible");

    // 4. Assert that the log contains expected output
    cy.contains("گزارش عملیات:").should("be.visible");
    cy.contains("با موفقیت اصلاح شد").should("be.visible");
  });
});
