import { StateCreator } from "zustand";

export interface UISlice {
    openMenus: Record<string, boolean>;
    toggleMenu: (key: string) => void;
    setMenuOpen: (key: string, isOpen: boolean) => void;
    closeAllMenus: () => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    openMenus: {
        organizations: false,
        contacts: false,
    },
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
});
