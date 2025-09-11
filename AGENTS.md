# Project Directory Structure

```
.
├── app
│   ├── src
│   │   ├── components
│   │   │   ├── ui
│   │   │   ├── SearchAndFilter.tsx
│   │   │   ├── SearchHistoryPanel.tsx
│   │   │   ├── SnippetItem.tsx
│   │   │   ├── SnippetList.tsx
│   │   │   ├── SnippetManager.tsx
│   │   │   └── TagManager.tsx
│   │   ├── config
│   │   │   ├── constants.ts
│   │   │   └── lemmatization.ts
│   │   ├── hooks
│   │   │   ├── use-mobile.tsx
│   │   │   └── use-toast.ts
│   │   ├── lib
│   │   │   ├── __tests__
│   │   │   ├── db.ts
│   │   │   ├── DocumentIDGenerator.ts
│   │   │   ├── mutators.ts
│   │   │   ├── schema.ts
│   │   │   ├── syncedQueries.ts
│   │   │   ├── TextPreprocessingService.ts
│   │   │   ├── utils.ts
│   │   │   ├── WordCountManager.ts
│   │   │   ├── WordSelectionStrategy.ts
│   │   │   ├── zero-schema.gen.ts
│   │   │   └── zero-schema.ts
│   │   ├── routes
│   │   │   ├── Index.tsx
│   │   │   └── NotFound.tsx
│   │   ├── server
│   │   │   ├── index.ts
│   │   │   ├── mutators.ts
│   │   │   └── queries.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── main.windmill.tsx
│   └── index.html
├── cypress
│   ├── downloads
│   ├── e2e
│   │   └── snippet_flows.cy.ts
│   ├── screenshots
│   │   └── snippet_flows.cy.ts
│   └── support
│       └── e2e.ts
├── docs
│   └── zero
│       ├── debug
│       │   ├── inspector.mdx
│       │   ├── otel.mdx
│       │   ├── permissions.mdx
│       │   ├── query-asts.mdx
│       │   ├── replication.mdx
│       │   └── slow-queries.mdx
│       ├── example
│       │   ├── src
│       │   ├── test
│       │   ├── package.json
│       │   ├── tsconfig.json
│       │   └── zero-schema.json
│       ├── llm
│       │   ├── auth.md
│       │   ├── mutators.md
│       │   ├── react.md
│       │   ├── schema.md
│       │   ├── setup.md
│       │   └── zql.md
│       ├── release-notes
│       │   └── index.mdx
│       ├── add-to-existing-project.mdx
│       ├── auth.mdx
│       ├── community.mdx
│       ├── connecting-to-postgres.mdx
│       ├── custom-mutators.mdx
│       ├── deployment.mdx
│       ├── errors.mdx
│       ├── introduction.mdx
│       ├── llms.mdx
│       ├── offline.mdx
│       ├── open-source.mdx
│       ├── permissions.mdx
│       ├── postgres-support.mdx
│       ├── quickstart.mdx
│       ├── react.mdx
│       ├── reading-data.mdx
│       ├── reporting-bugs.mdx
│       ├── roadmap.mdx
│       ├── samples.mdx
│       ├── solidjs.mdx
│       ├── status.mdx
│       ├── sync.mdx
│       ├── when-to-use.mdx
│       ├── writing-data.mdx
│       ├── zero-cache-config.mdx
│       ├── zero-schema.mdx
│       └── zql-on-the-server.mdx
├── migrations
│   ├── meta
│   │   ├── 0000_snapshot.json
│   │   ├── 0001_snapshot.json
│   │   ├── 0002_snapshot.json
│   │   └── _journal.json
│   ├── 0000_watery_master_mold.sql
│   ├── 0001_past_spencer_smythe.sql
│   └── 0002_clean_fat_cobra.sql
├── public
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── scripts
│   ├── config
│   ├── cli-parser.js
│   ├── computeAverageWordCount.js
│   ├── createDocumentIDs.js
│   ├── debugDocumentIDs.js
│   ├── diffDocumentIDs.js
│   └── import-snippets.ts
├── CLAUDE.md
├── components.json
├── cypress.config.ts
├── drizzle.config.ts
├── package.json
├── pnpm-workspace.yaml
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── vitest.setup.ts
```
