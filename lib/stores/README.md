# Zustand Store Organization

This project uses Zustand for state management, organized following best practices for Next.js App Router.

## Structure

```
lib/
├── stores/
│   ├── slices/
│   │   ├── auth-slice.ts       # Authentication state
│   │   ├── ui-slice.ts         # UI state (menus, modals, etc.)
│   │   └── organizations-slice.ts  # Organizations data
│   └── store.ts                # Main store combining all slices
├── hooks/
│   └── use-store.ts            # Custom hooks for store access
providers/
└── app-store-provider.tsx      # Store provider for Next.js App Router
```

## Usage

### 1. Using Custom Hooks (Recommended)

```typescript
import { useAuth, useUI, useOrganizations } from "@/lib/hooks/use-store";

function MyComponent() {
  // Access auth state
  const { user, isLoading, setUser } = useAuth();
  
  // Access UI state
  const { openMenus, toggleMenu } = useUI();
  
  // Access organizations state
  const { organizations, addOrganization } = useOrganizations();
  
  return <div>...</div>;
}
```

### 2. Using the Store Directly

```typescript
import { useAppStore } from "@/providers/app-store-provider";

function MyComponent() {
  // Select specific state
  const user = useAppStore((state) => state.user);
  
  // Select multiple values
  const { isLoading, error } = useAppStore((state) => ({
    isLoading: state.isLoading,
    error: state.error,
  }));
  
  return <div>...</div>;
}
```

## Store Slices

### Auth Slice
Manages authentication state:
- `user`: Current user object
- `isLoading`: Loading state for auth operations
- `error`: Error messages
- `setUser()`: Set current user
- `setLoading()`: Set loading state
- `setError()`: Set error message
- `clearAuth()`: Clear all auth state

### UI Slice
Manages UI state:
- `openMenus`: Object tracking which menus are open
- `toggleMenu()`: Toggle a menu open/closed
- `setMenuOpen()`: Set a menu's open state
- `closeAllMenus()`: Close all menus

### Organizations Slice
Manages organization data:
- `organizations`: Array of organizations
- `selectedOrganization`: Currently selected organization
- `isLoading`: Loading state
- `error`: Error messages
- `setOrganizations()`: Set organizations list
- `addOrganization()`: Add a new organization
- `updateOrganization()`: Update an organization
- `deleteOrganization()`: Delete an organization
- `setSelectedOrganization()`: Set selected organization

## Adding New Slices

1. Create a new slice file in `lib/stores/slices/`:

```typescript
// lib/stores/slices/my-slice.ts
import { StateCreator } from "zustand";

export interface MySlice {
  data: any;
  setData: (data: any) => void;
}

export const createMySlice: StateCreator<MySlice> = (set) => ({
  data: null,
  setData: (data) => set({ data }),
});
```

2. Add the slice to the main store in `lib/stores/store.ts`:

```typescript
import { MySlice, createMySlice } from "./slices/my-slice";

export type AppStore = AuthSlice & UISlice & MySlice;

export const createAppStore = () => {
  return createStore<AppStore>()((...a) => ({
    ...createAuthSlice(...a),
    ...createUISlice(...a),
    ...createMySlice(...a),
  }));
};
```

3. (Optional) Create a custom hook in `lib/hooks/use-store.ts`:

```typescript
export const useMySlice = () => {
  return useAppStore((state) => ({
    data: state.data,
    setData: state.setData,
  }));
};
```

## Best Practices

1. **Use selectors**: Always use selectors to prevent unnecessary re-renders
2. **Keep slices focused**: Each slice should manage a specific domain
3. **Use custom hooks**: Create custom hooks for commonly used state combinations
4. **Avoid global stores**: The store is created per-request in the provider
5. **Type safety**: All slices are fully typed with TypeScript

## Next.js App Router Compatibility

This setup is fully compatible with Next.js App Router:
- Store is created per-request (no shared state across requests)
- Provider is a client component
- Server components don't interact with the store
- Follows Next.js architectural principles
