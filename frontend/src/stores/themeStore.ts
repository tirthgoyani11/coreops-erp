import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeLocalStorage } from '../lib/safeStorage';

interface ThemeState {
    isDarkMode: boolean;
    toggleTheme: () => void;
    setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            isDarkMode: true,
            toggleTheme: () =>
                set((state) => {
                    const newIsDark = !state.isDarkMode;
                    // Apply class to document
                    if (newIsDark) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                    return { isDarkMode: newIsDark };
                }),
            setTheme: (isDark: boolean) =>
                set(() => {
                    if (isDark) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                    return { isDarkMode: isDark };
                }),
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => safeLocalStorage),
            onRehydrateStorage: () => (state) => {
                // Apply theme on rehydration
                if (state?.isDarkMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            },
        }
    )
);
