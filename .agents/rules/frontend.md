---
trigger: model_decision
description: Apply when working on the React frontend — covers project structure, component design, state management, API handling with axios/React Query, routing, forms, performance optimization, and testing.
---

# frontend.md — React Rules

## Project Structure

- MUST organize source files under `src/` with the following top-level folders:
  ```
  src/
    components/   # Reusable UI components
    pages/        # Route-level page components
    hooks/        # Custom React hooks
    services/     # API call functions
    store/        # Global state (Redux / Zustand / Context)
    utils/        # Pure utility functions
    types/        # TypeScript type/interface definitions
    constants/    # App-wide constants
  ```
- MUST NOT place API call logic inside component files
- MUST NOT place business logic inside page or component files — extract to hooks or utils

## Component Design Rules

- MUST use functional components exclusively — MUST NOT use class components
- MUST define one component per file
- MUST name component files using `PascalCase` (e.g., `JobCard.tsx`)
- MUST NOT exceed 200 lines per component file — split into subcomponents if exceeded
- MUST separate presentational components (pure UI) from container components (data-fetching/logic)
- MUST define PropTypes or TypeScript interfaces for all component props
- MUST NOT use inline styles — use CSS modules, Tailwind utility classes, or a styled-component system
- MUST mark components as `React.memo` only when profiling shows a performance benefit — MUST NOT apply it by default
- MUST NOT hardcode text strings visible to users — use a constants file or i18n module

## State Management

- MUST use local `useState` for component-local state
- MUST use a global store (Redux / Zustand) only for state shared across multiple unrelated components
- MUST NOT store server-fetched data in global store if a data-fetching library (React Query / SWR) is used
- MUST NOT duplicate state that can be derived from existing state

## API Handling Rules

- MUST place all API call functions inside `src/services/`
- MUST NOT call `fetch` or `axios` directly inside components or hooks — proxy through a service function
- MUST use a single configured `axios` instance with base URL and interceptors
- MUST handle loading, success, and error states for every API call
- MUST display user-facing error messages on API failure — MUST NOT silently fail
- MUST NOT expose raw API error objects to the user interface
- MUST use React Query or SWR for server-state fetching, caching, and synchronization
- MUST NOT re-fetch data on every render — use caching and stale-while-revalidate strategies

## Routing

- MUST use React Router for all client-side routing
- MUST define all routes in a single central route config file
- MUST protect authenticated routes using a `PrivateRoute` or equivalent guard component
- MUST NOT use inline route definitions scattered across component files

## Forms

- MUST use React Hook Form or Formik for all form state management
- MUST NOT use uncontrolled inputs without a form library
- MUST validate all form fields client-side before submission
- MUST disable the submit button while a form submission is in progress

## Performance

- MUST use `React.lazy` and `Suspense` for route-level code splitting
- MUST NOT import entire libraries when only a subset is needed (use named imports)
- MUST NOT trigger unnecessary re-renders by passing new object/array literals as props inline

## Testing

- MUST write tests using React Testing Library
- MUST test component behavior (user interactions, conditional rendering) — MUST NOT test implementation details
- MUST mock all API service functions in component tests
