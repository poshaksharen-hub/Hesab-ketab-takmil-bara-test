
describe("Checks Flow", () => {
  beforeEach(() => {
    // Log in and navigate to the checks page
    cy.visit("/login");
    cy.get('input[name="email"]').type("fatemeh@khanevadati.app");
    cy.get('input[name="password"]').type("password123");
    cy.get('button[type="submit"]').click();
    cy.url().should("eq", "http://localhost:3000/");
    cy.visit("/checks");
    cy.contains("h1", "مدیریت چک‌ها").should("be.visible");
  });

  it("should allow a user to add a new check, view details, and then clear it", () => {
    const payeeName = "فروشگاه لوازم خانگی سعادت";
    const checkAmount = "2500000";
    const sayadId = `123456${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    // --- Part 1: Add a new check ---
    cy.contains("button", "ثبت چک جدید").click();

    // Fill out the form
    cy.get('button[role="combobox"]').eq(0).click(); // Open payee dropdown
    cy.get('div[role="option"]').contains(payeeName).click({ force: true });
    
    cy.get('input[name="amount"]').type(checkAmount);
    cy.get('input[name="sayadId"]').type(sayadId);
    cyget('input[name="checkSerialNumber"]').type("987654");

    cy.get('button[role="combobox"]').eq(1).click(); // Bank Account
    cy.get('div[role="option"]').first().click();

    cy.get('button[role="combobox"]').eq(2).click(); // Category
    cy.get('div[role="option"]').contains("خرید لوازم منزل").click();
    
    cy.get('button[role="combobox"]').eq(3).click(); // Expense For
    cy.get('div[role="option"]').contains("مشترک").click();

    cy.contains("button", "ذخیره").click();

    // Assert the new check is visible
    cy.contains(sayadId).should("be.visible");
    cy.contains("۲٬۵۰۰٬۰۰۰ تومان").should("be.visible");

    // --- Part 2: View Details ---
    cy.contains(sayadId).parents('.group').click();
    cy.url().should('include', '/checks/');
    cy.contains('h1', 'جزئیات چک').should('be.visible');
    cy.contains(sayadId).should('be.visible');
    cy.contains('در انتظار پاس').should('be.visible');

    // --- Part 3: Clear the check from the detail page ---
    cy.contains('button', 'پاس کردن چک').click();

    cy.get('button').contains("تایید و پاس کردن").click();

    // Assert the check is now marked as "Cleared"
    cy.contains('پاس شده').should('be.visible');
    cy.contains('موجودی حساب برای پاس کردن این چک کافی نیست').should('not.exist');
    cy.contains('پاس کردن چک').should('not.exist'); // Button should disappear
    cy.go('back'); // Go back to the list page

    // --- Part 4: Delete the cleared check ---
    cy.contains(sayadId).parents('.group').find('button[aria-label="Actions"]').click();
    cy.contains('div', 'حذف چک').click({force: true});
    cy.get('button').contains('بله، حذف کن').click();

    // Assert check is gone
    cy.contains(sayadId).should('not.exist');

  });

  it('should show an error when trying to clear a check with insufficient funds', () => {
    const payeeName = "تست موجودی ناکافی";
    const checkAmount = "999999999999"; // An impossibly large amount
    const sayadId = `999999${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    cy.contains("button", "ثبت چک جدید").click();

    // Add a new payee for this test
    cy.get('button[role="combobox"]').eq(0).click();
    cy.get('div[role="option"]').contains('افزودن طرف حساب جدید').click();
    cy.get('input[name="name"]').type(payeeName);
    cy.get('button').contains('ذخیره').click();
    
    // Continue filling the check form
    cy.get('input[name="amount"]').type(checkAmount);
    cy.get('input[name="sayadId"]').type(sayadId);
    cy.get('input[name="checkSerialNumber"]').type("111111");
    cy.get('button[role="combobox"]').eq(1).click();
    cy.get('div[role="option"]').first().click();
    cy.get('button[role="combobox"]').eq(2).click();
    cy.get('div[role="option"]').first().click();
    cy.get('button[role="combobox"]').eq(3).click();
    cy.get('div[role="option"]').contains("مشترک").click();
    cy.contains("button", "ذخیره").click();

    // Attempt to clear the check from the list view
    cy.contains(sayadId).parents('.group').find('button[aria-label="Actions"]').click();
    cy.contains('div[role="menuitem"]', 'پاس کردن چک').click();
    cy.get('button').contains('تایید و پاس کردن').click();

    // Assert that an error toast is shown
    cy.contains('موجودی قابل استفاده حساب برای پاس کردن چک کافی نیست').should('be.visible');
  });
});
