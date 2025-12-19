
describe("Categories Flow", () => {
  beforeEach(() => {
    // Log in before each test
    cy.visit("/login");
    cy.get('input[name="email"]').type("ali@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");

    // Navigate to the categories page
    cy.visit("/categories");
    cy.contains("h1", "مدیریت دسته‌بندی‌ها").should("be.visible");
  });

  it("should allow a user to add a new category and view its details", () => {
    const categoryName = `تست دسته‌بندی - ${new Date().getTime()}`;

    // 1. Click the "Add New Category" button
    cy.contains("button", "افزودن دسته‌بندی").click();

    // 2. Fill out the form
    cy.get('input[name="name"]').type(categoryName);
    cy.get('textarea[name="description"]').type("این یک توضیحات تستی است.");
    
    // 3. Submit the form
    cy.contains("button", "ذخیره").click();

    // 4. Assert the new category is visible in the list
    cy.contains("td", categoryName).should("be.visible");

    // 5. Click on the new category to go to details page
    cy.contains("td", categoryName).click();

    // 6. Assert navigation and details
    cy.url().should("include", "/categories/");
    cy.contains("h1", categoryName).should("be.visible");
    cy.contains("این یک توضیحات تستی است.").should("be.visible");
  });
});
