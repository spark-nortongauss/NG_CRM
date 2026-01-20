import { createStore } from "zustand/vanilla";
import { AuthSlice, createAuthSlice } from "./slices/auth-slice";
import { UISlice, createUISlice } from "./slices/ui-slice";
import {
    OrganizationsSlice,
    createOrganizationsSlice,
} from "./slices/organizations-slice";

export type AppStore = AuthSlice & UISlice & OrganizationsSlice;

export const createAppStore = () => {
    return createStore<AppStore>()((...a) => ({
        ...createAuthSlice(...a),
        ...createUISlice(...a),
        ...createOrganizationsSlice(...a),
    }));
};
