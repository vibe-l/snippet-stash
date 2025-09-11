# Project Overview

This is a code snippet management application. It allows users to store, tag, and search for code snippets. The application is built with a modern web stack, including React, Vite, Tailwind CSS, and a Node.js backend with Hono and `@rocicorp/zero` for real-time data synchronization.

## Key Technologies

*   **Frontend:**
    *   React
    *   Vite
    *   Tailwind CSS
    *   wouter (for routing)
    *   `@rocicorp/zero/react` (for real-time data synchronization)
*   **Backend:**
    *   Node.js
    *   Hono (for the web server)
    *   `@rocicorp/zero/pg` (for real-time data synchronization)
    *   PostgreSQL (for the database)
    *   Drizzle ORM (for database access)
*   **Testing:**
    *   Vitest (for unit and integration tests)
    *   Cypress (for end-to-end tests)

## Architecture

The application is divided into a frontend and a backend. The frontend is a single-page application (SPA) built with React and Vite. It communicates with the backend via a real-time data synchronization layer provided by `@rocicorp/zero`. The backend is a Node.js server built with Hono that handles API requests and database operations. The database is a PostgreSQL database, and Drizzle is used as the ORM.

# Building and Running

## Prerequisites

*   Node.js and pnpm
*   Docker and Docker Compose (for running a local PostgreSQL database)

## Installation

1.  Install the dependencies:
    ```bash
    pnpm install
    ```

## Running the Application

1.  Start the database:
    ```bash
    docker-compose up -d
    ```
2.  Run the database migrations:
    ```bash
    pnpm drizzle:migrate
    ```
3.  Start the backend server:
    ```bash
    pnpm dev:server
    ```
4.  Start the frontend development server:
    ```bash
    pnpm dev:ui
    ```

The application will be available at `http://localhost:5173`.

## Running Tests

*   **Unit and Integration Tests:**
    ```bash
    pnpm test
    ```
*   **End-to-End Tests:**
    ```bash
    pnpm cy:open
    ```

# Development Conventions

*   **Code Style:** The project uses Prettier for code formatting.
*   **Linting:** The project uses ESLint for linting.
*   **Commits:** The project follows the Conventional Commits specification.
*   **Branching:** The project uses the GitFlow branching model.
*   **Testing:** All new features should be accompanied by unit and integration tests. End-to-end tests should be added for all major user flows.
