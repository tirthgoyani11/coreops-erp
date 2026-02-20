import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeLocalStorage } from '../lib/safeStorage';

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
            storage: createJSONStorage(() => safeLocalStorage),
            partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }), // Don't persist mobile state
        }
    )
);
