import { useEffect } from 'react';

type ShortcutCallback = (e: KeyboardEvent) => void;

interface ShortcutOptions {
    preventDefault?: boolean;
    ignoreInInputs?: boolean;
}

export function useShortcut(
    keys: string[],
    callback: ShortcutCallback,
    options: ShortcutOptions = { preventDefault: true, ignoreInInputs: true }
) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if we should ignore the press
            if (options.ignoreInInputs) {
                const target = e.target as HTMLElement;
                const isInput =
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable;

                if (isInput) return;
            }

            // Check if key combo matches
            const keyMatches = keys.every(key => {
                if (key === 'ctrl' || key === 'cmd') return e.ctrlKey || e.metaKey;
                if (key === 'alt') return e.altKey;
                if (key === 'shift') return e.shiftKey;
                return e.key.toLowerCase() === key.toLowerCase();
            });

            if (keyMatches) {
                if (options.preventDefault) {
                    e.preventDefault();
                }
                callback(e);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keys, callback, options]);
}
