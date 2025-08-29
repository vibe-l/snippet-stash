// E2E tests for snippet user flows using data-testid attributes

describe('Snippet Management', () => {
  // --- Helper Functions ---

  const getSnippetListContainer = () => cy.get('[data-testid="snippet-list-container"]');
  const getSnippetItems = () => getSnippetListContainer().find('[data-testid="snippet-item"]');

  // Finds a snippet item by its unique code content. This is robust against re-renders.
  const findSnippetItemByCode = (codeContent: string) => {
    return cy.get('[data-testid="snippet-body-display"]').contains(codeContent)
      .parents('[data-testid="snippet-item"]');
  };

  // Adds a snippet and verifies it was created successfully.
  const addSnippet = (code: string, tags: string[]): Cypress.Chainable<JQuery<HTMLElement>> => {
    cy.get('[data-testid="add-new-snippet-button"]').click();

    // Alias the new snippet item to avoid stale elements after re-renders
    getSnippetItems().first().as('newSnippet');

    cy.get('@newSnippet').find('[data-testid="snippet-body-input"]').clear().type(code);

    tags.forEach(tag => {
      cy.get('@newSnippet').find('[data-testid="add-tag-to-snippet-button"]').click();
      cy.get('[data-testid="tag-picker-popover-content"]').should('be.visible');
      cy.get('[data-testid="tag-picker-search-input"]').type(tag);

      // Check if tag exists in the list or create a new one
      cy.get('[data-testid="tag-picker-popover-content"]').then($popover => {
        const optionSelector = `[data-testid="tag-picker-option"][data-tag-name="${tag}"]`;
        if ($popover.find(optionSelector).length > 0) {
          cy.get(optionSelector).click({ force: true });
        } else {
          cy.get('[data-testid="tag-picker-create-new-button"]').click({ force: true });
        }
      });
      cy.get('[data-testid="tag-picker-popover-content"]').should('not.exist');
    });
    cy.get('@newSnippet').find('[data-testid="save-snippet-button"]').click();

    // After saving, find the snippet by its content to ensure we have the final, rendered element
    findSnippetItemByCode(code).as('addedSnippet');

    // Assert that the creation was successful
    cy.get('@addedSnippet').should('be.visible');
    cy.get('@addedSnippet').find('[data-testid="snippet-body-display"]').should('contain.text', code);
    tags.forEach(tag => {
      cy.get('@addedSnippet').find(`[data-testid="snippet-tag"][data-tag-name="${tag}"]`).should('exist');
    });

    return cy.get('@addedSnippet');
  };

  // Deletes a snippet and verifies it was removed.
  const deleteSnippet = (codeContent: string) => {
    const snippetItem = findSnippetItemByCode(codeContent);
    snippetItem.find('[data-testid="delete-snippet-button"]').click();

    cy.get('[data-testid="delete-snippet-dialog-content"]').should('be.visible').within(() => {
      cy.get('[data-testid="confirm-delete-action"]').click();
    });

    cy.get('[data-testid="delete-snippet-dialog-content"]').should('not.exist');
    getSnippetListContainer().within(() => {
      cy.get('[data-testid="snippet-body-display"]').contains(codeContent).should('not.exist');
    });
  };

  // --- Test Setup ---

  beforeEach(() => {
    cy.visit('/');
    // Consider adding cy.intercept for API calls if needed for waiting or assertions.
  });

  // --- E2E User Flow Test ---

  it('should allow a user to create, filter, and then delete a snippet in a continuous flow', () => {
    // --- 1. SETUP ---
    // Define unique data for the snippets to avoid collisions between test runs.
    const timestamp = new Date().toISOString();
    const mainSnippetCode = `// Main Snippet (for create/filter/delete)\nconsole.log("Main snippet created at ${timestamp}");`;
    const mainSnippetTags = ['e2e-flow', 'main-snippet'];
    const secondarySnippetCode = `// Secondary Snippet (for filtering)\nconsole.log("Secondary snippet for filtering at ${timestamp}");`;
    const secondarySnippetTags = ['e2e-flow', 'secondary-snippet'];

    // --- 2. CREATE STEP ---
    cy.log('**--- Step 1: Create Snippets ---**');
    addSnippet(mainSnippetCode, mainSnippetTags);
    addSnippet(secondarySnippetCode, secondarySnippetTags);

    // --- 3. FILTER STEP ---
    cy.log('**--- Step 2: Filter Snippets ---**');
    const filterKeyword = 'Main Snippet'; // A keyword unique to the main snippet
    cy.get('[data-testid="search-snippets-input"]').type(filterKeyword);

    // Assert that only the main snippet is visible after filtering
    getSnippetListContainer().within(() => {
      findSnippetItemByCode(mainSnippetCode).should('be.visible');
      cy.get('[data-testid="snippet-body-display"]').contains(secondarySnippetCode).should('not.exist');
    });

    // Clear the filter and assert both snippets are visible again
    cy.get('[data-testid="search-snippets-input"]').clear();
    getSnippetListContainer().within(() => {
      findSnippetItemByCode(mainSnippetCode).should('be.visible');
      findSnippetItemByCode(secondarySnippetCode).should('be.visible');
    });

    // --- 4. DELETE & CLEANUP STEP ---
    cy.log('**--- Step 3: Delete Snippets ---**');
    // Delete the main snippet created at the start of the flow
    deleteSnippet(mainSnippetCode);

    // For good practice, clean up the secondary snippet as well
    deleteSnippet(secondarySnippetCode);

    // Final check to ensure the list is clean of our test data
    getSnippetItems().should('not.contain.text', timestamp);
  });
});