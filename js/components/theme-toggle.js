const SUN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>';
const MOON_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 13.2A8.5 8.5 0 0 1 10.8 3.2 8.7 8.7 0 1 0 20.8 13.2Z"/></svg>';

/** Attaches an accessible theme switch to a button. */
export function createThemeToggle({
    service,
    selector = "#theme-toggle",
    root = document,
}) {
    const button = root.querySelector(selector);
    if (!button || !service) return { init: () => null, destroy: () => {} };

    function render() {
        const isDark = service.getTheme() === "dark";
        const label = isDark
            ? "Activer le thème clair"
            : "Activer le thème sombre";
        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);
        button.setAttribute("aria-pressed", String(isDark));
        button.innerHTML = isDark ? SUN_ICON : MOON_ICON;
    }

    function onClick() {
        service.toggle();
        render();
    }

    function init() {
        service.init();
        button.addEventListener("click", onClick);
        render();
        return service.getTheme();
    }

    function destroy() {
        button.removeEventListener("click", onClick);
    }

    return { init, destroy, render };
}
