/**
 * Crée un identifiant unique pour un nouvel enregistrement.
 * @returns {string} Identifiant de l’enregistrement.
 */
export const uid = () =>
    crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isUuid = (value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value || ""),
    );

/**
 * Crée un UUID déterministe pour conserver les identifiants locaux lors de la synchronisation.
 * @param {string} value Identifiant d’origine.
 * @returns {string} UUID déterministe.
 */
export function stableUuid(value) {
    const input = String(value || "");
    const hashes = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b];
    for (let index = 0; index < input.length; index += 1) {
        const code = input.charCodeAt(index);
        for (let hashIndex = 0; hashIndex < hashes.length; hashIndex += 1) {
            hashes[hashIndex] = Math.imul(
                hashes[hashIndex] ^ (code + hashIndex * 31),
                0x01000193,
            );
        }
    }
    const hex = hashes
        .map((hash) => (hash >>> 0).toString(16).padStart(8, "0"))
        .join("")
        .split("");
    hex[12] = "5";
    hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
    const valueHex = hex.join("");
    return `${valueHex.slice(0, 8)}-${valueHex.slice(8, 12)}-${valueHex.slice(12, 16)}-${valueHex.slice(16, 20)}-${valueHex.slice(20)}`;
}

/**
 * Convertit un identifiant local en UUID utilisable dans Supabase.
 * @param {string} id Identifiant local ou distant.
 * @returns {string} UUID valide.
 */
export const remoteId = (id) => (isUuid(id) ? id : stableUuid(id));
