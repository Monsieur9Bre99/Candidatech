/**
 * Échappe les caractères spéciaux avant l’insertion d’une valeur en HTML.
 * @param {*} value Valeur à afficher.
 * @returns {string} Texte sûr pour une insertion dans du HTML.
 */
export function escapeHtml(value = "") {
    return String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[character],
    );
}

/**
 * Valide une URL et ne conserve que les liens HTTP ou HTTPS.
 * @param {string} value URL à valider.
 * @returns {string} URL normalisée, ou une chaîne vide si elle est invalide.
 */
export function safeUrl(value = "") {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}
