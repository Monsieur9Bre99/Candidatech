/**
 * Fournit la date du jour au format ISO court dans le fuseau local.
 * @returns {string} Date au format AAAA-MM-JJ, adaptée aux champs date.
 */
export const today = () => {
    const now = new Date();
    const localDate = new Date(
        now.getTime() - now.getTimezoneOffset() * 60_000,
    );
    return localDate.toISOString().slice(0, 10);
};

/**
 * Formate une date pour l’affichage en français.
 * @param {string} value Date au format attendu par les champs date.
 * @returns {string} Date lisible, ou un tiret si aucune date n’est fournie.
 */
export function fmtDate(value) {
    if (!value) return "—";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          }).format(date);
}

/**
 * Calcule le nombre de jours entre aujourd’hui et une date donnée.
 * @param {string} value Date à comparer.
 * @returns {number|null} Écart en jours, ou null si aucune date n’est fournie.
 */
export function daysFromToday(value) {
    if (!value) return null;
    const start = new Date(`${today()}T12:00:00`);
    const end = new Date(`${value}T12:00:00`);
    return Math.round((end - start) / 86_400_000);
}

/**
 * Résume une échéance avec un libellé relatif à la date du jour.
 * @param {string} value Date de l’échéance.
 * @returns {string} Libellé tel que « Aujourd’hui », « Demain » ou « En retard ».
 */
export function dueLabel(value) {
    const days = daysFromToday(value);
    if (days === null) return "Sans échéance";
    if (days < 0) return `En retard de ${Math.abs(days)} j`;
    if (days === 0) return "Aujourd’hui";
    if (days === 1) return "Demain";
    return `Dans ${days} jours`;
}
