// Re-export all store-related items for easier imports
export { AppStoreProvider, useAppStore } from "@/providers/app-store-provider";
export { useAuth, useUI, useOrganizations } from "@/lib/hooks/use-store";
export type { AppStore } from "@/lib/stores/store";
export type { AuthSlice } from "@/lib/stores/slices/auth-slice";
export type { UISlice } from "@/lib/stores/slices/ui-slice";
export type { OrganizationsSlice, Organization } from "@/lib/stores/slices/organizations-slice";
