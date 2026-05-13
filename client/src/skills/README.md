---
name: react-development
description: Build production-grade React applications and components. Use this skill whenever the user wants to create, scaffold, refactor, or improve a React app or component — including hooks, state management, routing, forms, data fetching, testing, or TypeScript integration. Trigger for requests like "build a React app", "create a component", "set up React Router", "add context/redux", "fix my hook", or any task where the deliverable is React code. Also trigger when the user is building a full-stack app and needs help with the frontend layer specifically.
---

# React Development Skill

Produce clean, idiomatic, production-ready React code. Always match modern React conventions (hooks, functional components, concurrent features where appropriate).

## Project Setup

When scaffolding a new React project, default to **Vite** unless the user specifies otherwise:

```bash
npm create vite@latest my-app -- --template react
# or TypeScript:
npm create vite@latest my-app -- --template react-ts
cd my-app && npm install
```

For full-stack setups with an Express backend, configure Vite's dev proxy so `/api` requests forward to the backend:

```js
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
}
```

## Component Patterns

**Prefer**:
- Functional components with hooks — never class components unless maintaining legacy code
- Named exports for components (default export only for page-level components)
- Co-locate component + its styles + its tests in one folder

```
src/
  components/
    UserCard/
      UserCard.jsx
      UserCard.module.css   (or UserCard.test.jsx)
  pages/
  hooks/
  services/      ← API call abstractions
  context/
```

**Hooks discipline**:
- `useState` for local UI state only
- `useEffect` — always specify the dependency array; document why deps are omitted if ever
- Extract reusable logic into custom hooks (`use` prefix, lives in `src/hooks/`)
- Avoid `useEffect` for derived state — compute it inline or with `useMemo`

## State Management

| Scope | Solution |
|---|---|
| Local component state | `useState` / `useReducer` |
| Shared UI state (theme, auth) | `useContext` + `useReducer` |
| Server state / caching | **React Query** (`@tanstack/react-query`) — strongly preferred |
| Complex global state | Zustand (lightweight) or Redux Toolkit (large apps) |

Avoid prop-drilling beyond 2 levels — introduce context or lift state.

## Data Fetching

Use **React Query** for all server data. It handles caching, loading states, refetching, and invalidation automatically:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(r => r.json())
});

// Mutate + invalidate
const qc = useQueryClient();
const { mutate } = useMutation({
  mutationFn: (newUser) => fetch('/api/users', { method: 'POST', body: JSON.stringify(newUser) }),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] })
});
```

Encapsulate fetch logic in `src/services/`:
```js
// services/userService.js
export const getUsers = () => fetch('/api/users').then(r => r.json());
export const createUser = (data) => fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
}).then(r => r.json());
```

## Routing

Use **React Router v6**:

```jsx
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Protect routes with a wrapper component:
```jsx
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}
```

## Forms

Use **React Hook Form** for non-trivial forms:

```jsx
import { useForm } from 'react-hook-form';

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const onSubmit = (data) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email', { required: true, pattern: /^\S+@\S+$/ })} />
      {errors.email && <span>Valid email required</span>}
      <button type="submit">Login</button>
    </form>
  );
}
```

## TypeScript

When using TypeScript, always type props explicitly:

```tsx
interface UserCardProps {
  user: { id: number; name: string; email: string };
  onSelect?: (id: number) => void;
}

export function UserCard({ user, onSelect }: UserCardProps) { ... }
```

Use `zod` for runtime validation aligned with TypeScript types.

## Performance

- Wrap expensive computations in `useMemo`, callbacks passed as props in `useCallback`
- Use `React.lazy` + `Suspense` for route-level code splitting
- Use `key` props correctly in lists — stable IDs, never array index for dynamic lists
- Profile with React DevTools before optimizing

## Error Handling

Add an error boundary at the app root and around major sections:

```jsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

## Testing

Prefer **Vitest** + **React Testing Library**:

```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('shows user name', async () => {
  render(<UserCard user={{ id: 1, name: 'Alice', email: 'a@b.com' }} />);
  expect(screen.getByText('Alice')).toBeInTheDocument();
});
```

## Common Packages Reference

| Need | Package |
|---|---|
| Routing | `react-router-dom` |
| Server state | `@tanstack/react-query` |
| Forms | `react-hook-form` |
| Validation | `zod` |
| Global state | `zustand` |
| Animation | `framer-motion` |
| Icons | `lucide-react` |
| Dates | `date-fns` |
| HTTP client | `axios` or native `fetch` |
| Styling | CSS Modules, Tailwind, or `styled-components` |

## Full-Stack Integration Notes

When building with an Express backend (see `express-api` skill):
- Keep all API calls in `src/services/` — never call `fetch` directly in components
- Use the Vite proxy for local dev; use environment variables for production (`VITE_API_URL`)
- Handle auth tokens: store in memory or `httpOnly` cookies (never `localStorage` for sensitive tokens)
- For auth flows, read the `express-api` skill's JWT section for the expected request/response shapes