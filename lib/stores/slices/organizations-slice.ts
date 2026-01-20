import { StateCreator } from "zustand";

export interface Organization {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    created_at: string;
    updated_at: string;
}

export interface OrganizationsSlice {
    organizations: Organization[];
    selectedOrganization: Organization | null;
    isLoading: boolean;
    error: string | null;
    setOrganizations: (organizations: Organization[]) => void;
    addOrganization: (organization: Organization) => void;
    updateOrganization: (id: string, updates: Partial<Organization>) => void;
    deleteOrganization: (id: string) => void;
    setSelectedOrganization: (organization: Organization | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
}

export const createOrganizationsSlice: StateCreator<OrganizationsSlice> = (
    set
) => ({
    organizations: [],
    selectedOrganization: null,
    isLoading: false,
    error: null,
    setOrganizations: (organizations) => set({ organizations, error: null }),
    addOrganization: (organization) =>
        set((state) => ({
            organizations: [...state.organizations, organization],
        })),
    updateOrganization: (id, updates) =>
        set((state) => ({
            organizations: state.organizations.map((org) =>
                org.id === id ? { ...org, ...updates } : org
            ),
        })),
    deleteOrganization: (id) =>
        set((state) => ({
            organizations: state.organizations.filter((org) => org.id !== id),
            selectedOrganization:
                state.selectedOrganization?.id === id
                    ? null
                    : state.selectedOrganization,
        })),
    setSelectedOrganization: (organization) =>
        set({ selectedOrganization: organization }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false }),
});
