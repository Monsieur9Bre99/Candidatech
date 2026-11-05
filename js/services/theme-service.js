const DEFAULT_THEME_KEY = "candidatech.v0.theme";
const THEMES = new Set(["light", "dark"]);

/**
 * Reads a value from storage, returning null if the value is not a valid theme or if storage is unavailable.
 */
function readStorage(storage, key) {
    try {
        const value = storage?.getItem(key);
        return THEMES.has(value) ? value : null;
    } catch {
        return null;
    }
}

// Writes a value to storage, ignoring any errors if storage is unavailable.
function writeStorage(storage, key, value) {
    try {
        storage?.setItem(key, value);
    } catch {
        // The visual preference still applies when storage is unavailable.
    }
}

// Returns the default storage object, or null if storage is unavailable.
function defaultStorage() {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

/**
 * Controls the theme for every Candidatech surface.
 * @param {{key?: string, root?: HTMLElement, storage?: Storage, matchMedia?: typeof window.matchMedia}} [options]
 */
export function createThemeService({
    key = DEFAULT_THEME_KEY,
    root = document.documentElement,
    storage = defaultStorage(),
    matchMedia = window.matchMedia?.bind(window),
} = {}) {
    function systemTheme() {
        return matchMedia?.("(prefers-color-scheme: dark)")?.matches
            ? "dark"
            : "light";
    }

    function apply(theme, { persist = true } = {}) {
        const nextTheme = THEMES.has(theme) ? theme : systemTheme();
        root.dataset.theme = nextTheme;
        root.style.colorScheme = nextTheme;
        if (persist) writeStorage(storage, key, nextTheme);
        return nextTheme;
    }

    function init() {
        return apply(readStorage(storage, key) || systemTheme(), {
            persist: false,
        });
    }

    function getTheme() {
        return THEMES.has(root.dataset.theme)
            ? root.dataset.theme
            : systemTheme();
    }

    function setTheme(theme) {
        return apply(theme);
    }

    function toggle() {
        return setTheme(getTheme() === "dark" ? "light" : "dark");
    }

    return { getTheme, init, setTheme, toggle };
}
