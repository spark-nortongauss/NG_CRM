import { useAppStore } from "@/providers/app-store-provider";
import { useShallow } from "zustand/react/shallow";
import type { AppStore } from "@/lib/stores/store";

/**
 * Hook to access auth state and actions from the store
 */
export const useAuth = () => {
    return useAppStore(
        useShallow((state: AppStore) => ({
            user: state.user,
            isLoading: state.isLoading,
            error: state.error,
            setUser: state.setUser,
            setLoading: state.setLoading,
            setError: state.setError,
            clearAuth: state.clearAuth,
        }))
    );
};

/**
 * Hook to access UI state and actions from the store
 */
export const useUI = () => {
    return useAppStore(
        useShallow((state: AppStore) => ({
            openMenus: state.openMenus,
            toggleMenu: state.toggleMenu,
            setMenuOpen: state.setMenuOpen,
            closeAllMenus: state.closeAllMenus,
        }))
    );
};

/**
 * Hook to access organizations state and actions from the store
 */
export const useOrganizations = () => {
    return useAppStore(
        useShallow((state: AppStore) => ({
            organizations: state.organizations,
            selectedOrganization: state.selectedOrganization,
            isLoading: state.isLoading,
            error: state.error,
            setOrganizations: state.setOrganizations,
            addOrganization: state.addOrganization,
            updateOrganization: state.updateOrganization,
            deleteOrganization: state.deleteOrganization,
            setSelectedOrganization: state.setSelectedOrganization,
            setLoading: state.setLoading,
            setError: state.setError,
        }))
    );
};
