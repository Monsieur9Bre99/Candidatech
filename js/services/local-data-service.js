const EMPTY_DATA = '{"applications":[],"companies":[]}';

/**
 * Provides isolated access to the browser's persisted application data.
 * @param {{key: string, notify: (message: string) => void}} options Service configuration.
 */
export function createLocalDataService({ key, notify }) {
    let lastError = "";

    function load() {
        try {
            const parsed = JSON.parse(localStorage.getItem(key) || EMPTY_DATA);
            if (
                !parsed ||
                !Array.isArray(parsed.applications) ||
                !Array.isArray(parsed.companies)
            ) {
                throw new Error("Le format de la sauvegarde locale est invalide.");
            }
            lastError = "";
            return {
                applications: parsed.applications,
                companies: parsed.companies,
            };
        } catch (error) {
            lastError =
                error instanceof Error
                    ? error.message
                    : "Erreur de lecture inconnue.";
            notify(
                "La sauvegarde locale est illisible ou inaccessible. Elle n’a pas été modifiée ; exporte ou récupère-la avant toute réinitialisation.",
            );
            return { applications: [], companies: [] };
        }
    }

    function save(data) {
        if (lastError) {
            notify(
                "Enregistrement local bloqué : la sauvegarde existante doit d’abord être récupérée ou réinitialisée explicitement.",
            );
            return false;
        }
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch {
            notify(
                "Enregistrement impossible : stockage local indisponible ou saturé.",
            );
            return false;
        }
    }

    function clear() {
        localStorage.removeItem(key);
        lastError = "";
    }

    return {
        load,
        save,
        clear,
        getLastError: () => lastError,
    };
}
