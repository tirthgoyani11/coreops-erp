import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
    isSidebarCollapsed: boolean;
    isMobileSidebarOpen: boolean;
    toggleSidebar: () => void;
    setMobileSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            isSidebarCollapsed: false,
            isMobileSidebarOpen: false,
            toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
            setMobileSidebarOpen: (open: boolean) => set({ isMobileSidebarOpen: open }),
        }),
        {
            name: 'ui-storage',
            partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }), // Don't persist mobile state
        }
    )
);
