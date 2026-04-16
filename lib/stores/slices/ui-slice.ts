import { StateCreator } from "zustand";

export interface UISlice {
    openMenus: Record<string, boolean>;
    isSidebarOpen: boolean;
    toggleMenu: (key: string) => void;
    setMenuOpen: (key: string, isOpen: boolean) => void;
    closeAllMenus: () => void;
    toggleSidebar: () => void;
    setSidebarOpen: (isOpen: boolean) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    openMenus: {
        organizations: false,
        contacts: false,
    },
    isSidebarOpen: true, // Default to true, logic will handle mobile override
    toggleMenu: (key) =>
        set((state) => ({
            openMenus: { ...state.openMenus, [key]: !state.openMenus[key] },
        })),
    setMenuOpen: (key, isOpen) =>
        set((state) => ({
            openMenus: { ...state.openMenus, [key]: isOpen },
        })),
    closeAllMenus: () =>
        set({
            openMenus: {
                organizations: false,
                contacts: false,
            },
        }),
    toggleSidebar: () => 
        set((state) => ({
            isSidebarOpen: !state.isSidebarOpen,
        })),
    setSidebarOpen: (isOpen) => 
        set({
            isSidebarOpen: isOpen,
        }),
});
