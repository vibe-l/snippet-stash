// E2E tests for snippet user flows based on actual component structure

describe('Snippet Management', () => {
  // Helper function to get the snippet list container.
  // Assumes SnippetList renders items directly or within one level of nesting.
  // This might need adjustment if the DOM structure is more complex.
  const getSnippetList = () => {
    // Attempt to find a div that likely wraps all snippet items (Card components)
    // This is heuristic. A data-testid on the list container would be best.
    return cy.get('div.p-4.space-y-4').parent().parent();
  };

  // Helper function to get all snippet items (Card components)
  const getSnippetItems = () => {
    return cy.get('div.p-4.space-y-4:has(textarea, div.font-mono)'); // Heuristic for snippet item cards
  };

  // Helper function to get a specific snippet item by its displayed code content
  const getSnippetItemByCode = (codeContent: string) => {
    return cy.contains('div.font-mono.text-sm.whitespace-pre-wrap', codeContent).closest('div.p-4.space-y-4');
  };

  // Helper function to add a snippet with given code and tags
  const addSnippet = (code: string, tags: string[]) => {
    cy.contains('button', 'Add Snippet').click();

    // The new snippet item should be the last one and in edit mode
    getSnippetItems().last().within(() => {
      cy.get('textarea[placeholder="Enter your snippet here..."]').clear().type(code);

      tags.forEach(tag => {
        cy.contains('button', 'Add tag...').click();
        // Popover containing tag input appears
        cy.get('input[placeholder="Search or create tag..."]').type(tag);
        // Check if tag exists in the list first
        cy.get('body').then($body => { // Use body to check existence of popover content
          if ($body.find(`[cmdk-list] [role="option"]:contains("${tag}")`).length > 0) {
            cy.get('[cmdk-list]').contains('[role="option"]', tag).click();
          } else {
            // Button to create new tag
            cy.contains('button', new RegExp(`Create "${tag}"`)).click();
          }
        });
      });
      cy.contains('button', 'Save').click();
    });

    // Verification that it was added
    getSnippetItemByCode(code).should('exist');
    getSnippetItemByCode(code).within(() => {
      tags.forEach(tag => {
        cy.contains('span', tag).should('exist');
      });
    });
  };

  beforeEach(() => {
    cy.visit('/'); // Visit the base URL (http://localhost:5173)
    // Optional: Clear all existing snippets before each test for a clean state
    // This would require a custom Cypress command or UI interaction if possible
    // For now, we assume tests can run independently or clean up after themselves.
    // A more robust solution would be to reset DB state via API call if available.
  });

  it('should allow a user to create a new snippet', () => {
    const snippetCode = `// My new snippet\nconsole.log("Created at ${new Date().toISOString()}");`;
    const snippetTags = ['new', 'test', 'creation'];

    // Click the "Add Snippet" button in SnippetManager
    cy.contains('button', 'Add Snippet').click();

    // A new snippet item appears, automatically in edit mode. It's usually the last one.
    // If there are many snippets, this might need a more robust selector.
    getSnippetItems().last().within(() => {
      // Fill in the code/body
      cy.get('textarea[placeholder="Enter your snippet here..."]')
        .should('be.visible')
        .clear() // It starts empty but good practice
        .type(snippetCode);

      // Add tags
      snippetTags.forEach(tag => {
        cy.contains('button', 'Add tag...').click(); // Open tag popover
        // The popover is rendered at the body level, not within the snippet item usually
        // So we escape .within() for these commands if needed, or use global cy.get
        cy.get('input[placeholder="Search or create tag..."]').type(tag);
        // Check if tag exists in the list or create new
        // Using 'body' to ensure Cypress searches the entire DOM for the popover content
        cy.get('body').then($body => {
          if ($body.find(`[cmdk-list] [role="option"]:contains("${tag}")`).length > 0) {
            cy.get('[cmdk-list]').contains('[role="option"]', tag).click();
          } else {
            cy.contains('button', new RegExp(`Create "${tag}"`)).click();
          }
        });
        // Popover should close or we select another tag
      });

      // Click the "Save" button
      cy.contains('button', 'Save').click();
    });

    // Verify the snippet appears in the list with the correct content (now in display mode)
    getSnippetItemByCode(snippetCode).within(() => {
      cy.get('div.font-mono.text-sm.whitespace-pre-wrap').should('contain.text', snippetCode);
      snippetTags.forEach(tag => {
        cy.contains('span', tag).should('exist'); // Assumes tags are in a span or similar
      });
    });
  });

  it('should allow a user to filter snippets', () => {
    const reactSnippetCode = 'function MyReactComponent() { return <div>React Example</div>; }';
    const reactTags = ['react', 'frontend', 'example'];
    const vueSnippetCode = '<template><div>Vue Example</div></template>';
    const vueTags = ['vue', 'frontend', 'example'];

    // Create snippets needed for filtering
    addSnippet(reactSnippetCode, reactTags);
    addSnippet(vueSnippetCode, vueTags);

    // Use the search input
    const filterKeyword = 'React';
    cy.get('input[placeholder="Search snippets... (Press Enter to save to history)"]').type(filterKeyword);

    // Assert that only the React snippet is visible
    getSnippetList().within(() => {
        getSnippetItemByCode(reactSnippetCode).should('be.visible');
        getSnippetItemByCode(vueSnippetCode).should('not.exist'); // Or .should('not.be.visible') if it's hidden by CSS
    });

    // Clear the search
    cy.get('input[placeholder="Search snippets... (Press Enter to save to history)"]').clear();

    // Assert both are visible again
    getSnippetList().within(() => {
        getSnippetItemByCode(reactSnippetCode).should('be.visible');
        getSnippetItemByCode(vueSnippetCode).should('be.visible');
    });
  });

  it('should allow a user to delete a snippet', () => {
    const snippetToDeleteCode = `// Snippet to be deleted ${Date.now()}\nconsole.log('delete me');`;
    const snippetToDeleteTags = ['test-delete', 'temporary'];

    // Create a snippet to delete
    addSnippet(snippetToDeleteCode, snippetToDeleteTags);

    // Find the snippet and click its delete button
    getSnippetItemByCode(snippetToDeleteCode).within(() => {
      cy.get('button:has(svg.lucide-delete)').click();
    });

    // Confirm the deletion in the AlertDialog
    // The dialog is rendered at the body level
    cy.get('div[role="alertdialog"]').should('be.visible').within(() => {
      cy.contains('h2', 'Delete Snippet').should('be.visible'); // AlertDialogTitle is h2
      cy.contains('button', 'Delete').click();
    });

    // Verify the snippet is removed from the list
    getSnippetList().contains(snippetToDeleteCode).should('not.exist');
    // Ensure no snippet item contains this text
    cy.contains('div.font-mono.text-sm.whitespace-pre-wrap', snippetToDeleteCode).should('not.exist');
  });
});
