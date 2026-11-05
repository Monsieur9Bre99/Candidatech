/**
 * Sélectionne le premier élément correspondant au sélecteur CSS.
 * @param {string} selector Sélecteur CSS.
 * @param {ParentNode} [root=document] Élément ou document où chercher.
 * @returns {Element|null} Élément trouvé, ou null si aucun ne correspond.
 */
export const $ = (selector, root = document) => root.querySelector(selector);

/**
 * Retourne tous les éléments correspondant au sélecteur CSS.
 * @param {string} selector Sélecteur CSS.
 * @param {ParentNode} [root=document] Élément ou document où chercher.
 * @returns {Element[]} Éléments trouvés.
 */
export const $$ = (selector, root = document) => [
    ...root.querySelectorAll(selector),
];
