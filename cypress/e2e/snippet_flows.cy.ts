// E2E tests for snippet user flows using data-testid attributes

describe('Snippet Management', () => {
  const getSnippetListContainer = () => cy.get('[data-testid="snippet-list-container"]');
  const getSnippetItems = () => getSnippetListContainer().find('[data-testid="snippet-item"]');

  // Gets a snippet item by its unique ID (if snippet IDs are known/predictable)
  // or by its content if ID is not available/stable during test.
  // For newly created snippets, using .last() is often practical.
  const getSnippetItemById = (snippetId: string | number) =>
    cy.get(`[data-testid="snippet-item"][data-snippet-id="${snippetId}"]`);

  // Helper function to get a specific snippet item by its displayed code content
  // This is useful when the ID of a newly created snippet isn't immediately known.
  const findSnippetItemByCodeForVerification = (codeContent: string) => {
    return cy.get('[data-testid="snippet-body-display"]').contains(codeContent)
      .parents('[data-testid="snippet-item"]');
  };

  // Helper function to add a snippet with given code and tags using data-testid
  const addSnippet = (code: string, tags: string[], uniqueIdSuffix: string = ''): Cypress.Chainable<JQuery<HTMLElement>> => {
    cy.get('[data-testid="add-new-snippet-button"]').click();

    // The new snippet item should be the last one and in edit mode.
    // We'll give it a temporary unique identifier via its content if needed,
    // or rely on .last() and then verify its contents.
    const tempSnippetId = `temp-snippet-${uniqueIdSuffix || Date.now()}`; // For very basic distinction if needed

    return getSnippetItems().last().within(() => {
      cy.get('[data-testid="snippet-body-input"]').clear().type(code);

      tags.forEach(tag => {
        cy.get('[data-testid="add-tag-to-snippet-button"]').click();
        // Popover for tags will appear
        cy.get('[data-testid="tag-picker-popover-content"]').should('be.visible');
        cy.get('[data-testid="tag-picker-search-input"]').type(tag);

        // Check if tag exists in the list or create new
        cy.get('[data-testid="tag-picker-popover-content"]').then($popover => {
          const optionSelector = `[data-testid="tag-picker-option"][data-tag-name="${tag}"]`;
          if ($popover.find(optionSelector).length > 0) {
            cy.get(optionSelector).click();
          } else {
            cy.get('[data-testid="tag-picker-create-new-button"]').click();
          }
        });
        // Ensure popover closes or is ready for next action
        cy.get('[data-testid="tag-picker-popover-content"]').should('not.exist'); // Or specific close action
      });
      cy.get('[data-testid="save-snippet-button"]').click();
    }).then(($snippetItem) => {
      // After saving, verify its content.
      // The snippet item might re-render. We find it by its content now.
      return findSnippetItemByCodeForVerification(code).should('exist').within(() => {
        cy.get('[data-testid="snippet-body-display"]').should('contain.text', code);
        tags.forEach(tag => {
          cy.get(`[data-testid="snippet-tag"][data-tag-name="${tag}"]`).should('exist');
        });
      }).then(() => $snippetItem); // Return the jQuery object of the snippet item
    });
  };

  beforeEach(() => {
    cy.visit('/');
    // Consider adding a cy.intercept for API calls if needed for waiting or assertions.
    // e.g., cy.intercept('GET', '/api/snippets').as('getSnippets');
    // cy.wait('@getSnippets'); // if initial load needs to complete
  });

  it('should allow a user to create a new snippet', () => {
    const snippetCode = `// My new snippet with data-testid\nconsole.log("Created at ${new Date().toISOString()}");`;
    const snippetTags = ['new-semantic', 'test-attr', 'creation-flow'];

    cy.get('[data-testid="add-new-snippet-button"]').click();

    getSnippetItems().last().within(() => {
      cy.get('[data-testid="snippet-body-input"]')
        .should('be.visible')
        .clear()
        .type(snippetCode);

      snippetTags.forEach(tag => {
        cy.get('[data-testid="add-tag-to-snippet-button"]').click();
        cy.get('[data-testid="tag-picker-popover-content"]').should('be.visible');
        cy.get('[data-testid="tag-picker-search-input"]').type(tag);
        cy.get('[data-testid="tag-picker-popover-content"]').then($popover => {
          const optionSelector = `[data-testid="tag-picker-option"][data-tag-name="${tag}"]`;
          if ($popover.find(optionSelector).length > 0) {
            cy.get(optionSelector).click({ force: true }); // force:true if visibility issues with popover
          } else {
            cy.get('[data-testid="tag-picker-create-new-button"]').click({ force: true });
          }
        });
         cy.get('[data-testid="tag-picker-popover-content"]').should('not.exist'); // Wait for popover to close
      });
      cy.get('[data-testid="save-snippet-button"]').click();
    });

    findSnippetItemByCodeForVerification(snippetCode).within(() => {
      cy.get('[data-testid="snippet-body-display"]').should('contain.text', snippetCode);
      snippetTags.forEach(tag => {
        cy.get(`[data-testid="snippet-tag"][data-tag-name="${tag}"]`).should('exist');
      });
    });
  });

  it('should allow a user to filter snippets', () => {
    const reactSnippetCode = 'function MyReactComponent() { return <div data-testid="react-example">React Example</div>; }';
    const reactTags = ['react-semantic', 'frontend-attr'];
    const vueSnippetCode = '<template><div data-testid="vue-example">Vue Example</div></template>';
    const vueTags = ['vue-semantic', 'frontend-attr'];

    addSnippet(reactSnippetCode, reactTags, 'react');
    addSnippet(vueSnippetCode, vueTags, 'vue');

    const filterKeyword = 'React';
    cy.get('[data-testid="search-snippets-input"]').type(filterKeyword);

    getSnippetListContainer().within(() => {
      findSnippetItemByCodeForVerification(reactSnippetCode).should('be.visible');
      // Check that the Vue snippet is NOT present in the filtered list
      cy.get('[data-testid="snippet-body-display"]').contains(vueSnippetCode).should('not.exist');
    });

    cy.get('[data-testid="search-snippets-input"]').clear();

    getSnippetListContainer().within(() => {
      findSnippetItemByCodeForVerification(reactSnippetCode).should('be.visible');
      findSnippetItemByCodeForVerification(vueSnippetCode).should('be.visible');
    });
  });

  it('should allow a user to delete a snippet', () => {
    const snippetToDeleteCode = `// Snippet to be deleted (semantic) ${Date.now()}\nconsole.log('delete me semantically');`;
    const snippetToDeleteTags = ['test-delete-semantic', 'temporary-attr'];

    addSnippet(snippetToDeleteCode, snippetToDeleteTags, 'to-delete');

    findSnippetItemByCodeForVerification(snippetToDeleteCode).within(() => {
      cy.get('[data-testid="delete-snippet-button"]').click();
    });

    cy.get('[data-testid="delete-snippet-dialog-content"]').should('be.visible').within(() => {
      cy.get('[data-testid="confirm-delete-action"]').click();
    });

    cy.get('[data-testid="delete-snippet-dialog-content"]').should('not.exist');
    getSnippetListContainer().within(() => {
      cy.get('[data-testid="snippet-body-display"]').contains(snippetToDeleteCode).should('not.exist');
    });
  });
});
