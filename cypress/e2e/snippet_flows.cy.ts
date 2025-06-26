// This file will contain the E2E tests for snippet user flows.
// We will add tests for creating, filtering, and deleting snippets.

describe('Snippet Management', () => {
  beforeEach(() => {
    // Optional: Add any setup steps needed before each test.
    // For example, resetting the database or ensuring the server is running.
    // For now, we'll assume the server is running and the database is in a known state.
    cy.visit('/'); // Visit the base URL (http://localhost:5173)
  });

  it('should allow a user to create a new snippet', () => {
    const snippetTitle = 'My Test Snippet';
    const snippetCode = 'console.log("Hello, Cypress!");';
    const snippetTags = 'test,javascript,cypress';

    // Fill out the form in the SnippetManager component
    cy.get('input[name="title"]').type(snippetTitle);
    cy.get('textarea[name="code"]').type(snippetCode);
    cy.get('input[name="tags"]').type(snippetTags);

    // Submit the form
    cy.get('form').find('button[type="submit"]').click(); // Assuming the submit button is within the form

    // Verify that the new snippet appears correctly in the SnippetList
    cy.get('[data-testid="snippet-list"]') // Assuming a data-testid for the list
      .should('contain.text', snippetTitle)
      .and('contain.text', snippetCode)
      .and('contain.text', snippetTags.split(',')[0]); // Check for the first tag

    // More specific assertions can be added if elements within the snippet item have data-testids
    cy.get('[data-testid="snippet-item"]').last().within(() => {
      cy.get('[data-testid="snippet-title"]').should('have.text', snippetTitle);
      cy.get('[data-testid="snippet-code"]').should('contain.text', snippetCode); // or .should('have.text', snippetCode) if it's exact
      cy.get('[data-testid="snippet-tags"]').should('contain.text', snippetTags.split(',')[0]);
      cy.get('[data-testid="snippet-tags"]').should('contain.text', snippetTags.split(',')[1]);
      cy.get('[data-testid="snippet-tags"]').should('contain.text', snippetTags.split(',')[2]);
    });
  });

  it('should allow a user to filter snippets', () => {
    // For this test to be robust, we should ensure specific snippets exist.
    // We can either rely on beforeEach to set up a known state,
    // or create them programmatically here.
    // For now, let's assume two snippets are present:
    // 1. Title: "React Component Example", Code: "...", Tags: "react,component"
    // 2. Title: "Vue Directive Usage", Code: "...", Tags: "vue,directive"

    // To make this test self-contained, let's create them.
    // Snippet 1: React
    cy.get('input[name="title"]').type('React Component Example');
    cy.get('textarea[name="code"]').type('function MyComponent() { return <div>React</div>; }');
    cy.get('input[name="tags"]').type('react,component,example');
    cy.get('form').find('button[type="submit"]').click();
    cy.wait(500); // Give a moment for the UI to update, ideally use .should()

    // Snippet 2: Vue
    cy.get('input[name="title"]').type('Vue Directive Usage');
    cy.get('textarea[name="code"]').type('<div v-if="show">Vue</div>');
    cy.get('input[name="tags"]').type('vue,directive,example');
    cy.get('form').find('button[type="submit"]').click();
    cy.wait(500); // Give a moment for the UI to update

    // Use the search input in the SearchAndFilter component
    const filterKeyword = 'React';
    cy.get('input[placeholder*="Search"]').type(filterKeyword); // Assuming a placeholder like "Search snippets..."

    // Assert that only the snippets matching the keyword are visible
    cy.get('[data-testid="snippet-list"]').within(() => {
      cy.get('[data-testid="snippet-item"]')
        .should('have.length', 1) // Only one snippet should match
        .and('contain.text', 'React Component Example');

      // Assert that the non-matching snippet is not visible
      cy.contains('[data-testid="snippet-item"]', 'Vue Directive Usage').should('not.exist');
    });

    // Clear the search to verify both are visible again (optional cleanup)
    cy.get('input[placeholder*="Search"]').clear();
    cy.get('[data-testid="snippet-list"]').find('[data-testid="snippet-item"]').should('have.length.gte', 2);
  });

  it('should allow a user to delete a snippet', () => {
    const snippetTitleToDelete = 'Snippet to Delete';
    const snippetCodeToDelete = 'This will be deleted.';
    const snippetTagsToDelete = 'delete,test';

    // Create a snippet to delete
    cy.get('input[name="title"]').type(snippetTitleToDelete);
    cy.get('textarea[name="code"]').type(snippetCodeToDelete);
    cy.get('input[name="tags"]').type(snippetTagsToDelete);
    cy.get('form').find('button[type="submit"]').click();

    // Wait for the snippet to appear in the list and ensure it's there
    cy.get('[data-testid="snippet-list"]')
      .contains('[data-testid="snippet-item"]', snippetTitleToDelete)
      .should('be.visible');

    // Find the snippet we just created and click its delete button
    // This assumes the delete button is within the snippet item and can be identified
    cy.contains('[data-testid="snippet-item"]', snippetTitleToDelete)
      .find('button[aria-label*="Delete"], button:contains("Delete")') // Adjust selector as needed
      .click();

    // Handle the confirmation dialog
    // Cypress automatically handles window.confirm by clicking "OK".
    // If it's a custom dialog, specific commands to interact with it would be needed here.
    // For example: cy.get('[data-testid="confirm-delete-button"]').click();

    // Verify that the snippet is removed from the list
    cy.get('[data-testid="snippet-list"]')
      .should('not.contain.text', snippetTitleToDelete);

    // Also, specifically check that the item is gone
    cy.contains('[data-testid="snippet-item"]', snippetTitleToDelete)
      .should('not.exist');
  });
});
