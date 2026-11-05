import {
    fromRemoteApplication,
    fromRemoteCompany,
    toRemoteApplication,
    toRemoteCompany,
} from "./record-mappers.js";
import { remoteId } from "../utils/id.js";

export function createSupabaseDataService({ getClient, getCurrentUserId }) {
    async function verifiedUserId(expectedUserId = getCurrentUserId()) {
        const client = getClient();
        if (!client || !expectedUserId) {
            throw new Error("Une session active est nécessaire.");
        }
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        const userId = data.session?.user?.id;
        if (!userId || userId !== expectedUserId) {
            throw new Error(
                "La session a expiré. Reconnecte-toi pour continuer.",
            );
        }
        return userId;
    }

    async function readAll(table, expectedUserId = getCurrentUserId()) {
        const client = getClient();
        const userId = await verifiedUserId(expectedUserId);
        const rows = [];
        for (let start = 0; ; start += 1000) {
            const { data: page, error } = await client
                .from(table)
                .select("*")
                .eq("user_id", userId)
                .order("updated_at", { ascending: false })
                .range(start, start + 999);
            if (error) throw error;
            if (!Array.isArray(page)) {
                throw new Error("Supabase a renvoyé une page de données invalide.");
            }
            rows.push(...page);
            if (page.length < 1000) return rows;
        }
    }

    async function persistPayload(table, payload, userId) {
        const client = getClient();
        const { data: existing, error: lookupError } = await client
            .from(table)
            .select("id")
            .eq("id", payload.id)
            .eq("user_id", userId)
            .maybeSingle();
        if (lookupError) throw lookupError;

        const query = existing
            ? client
                  .from(table)
                  .update(payload)
                  .eq("id", payload.id)
                  .eq("user_id", userId)
            : client.from(table).insert(payload);
        const { data, error } = await query.select("id").single();
        if (error) throw error;
        if (data?.id !== payload.id) {
            throw new Error("Supabase n’a confirmé aucun enregistrement.");
        }
        return { inserted: !existing };
    }

    async function saveRecord(
        table,
        record,
        expectedUserId = getCurrentUserId(),
    ) {
        const userId = await verifiedUserId(expectedUserId);
        const payload =
            table === "applications"
                ? toRemoteApplication(record, userId)
                : toRemoteCompany(record, userId);
        await persistPayload(table, payload, userId);
    }

    async function deleteRecord(
        table,
        id,
        expectedUserId = getCurrentUserId(),
    ) {
        const client = getClient();
        const userId = await verifiedUserId(expectedUserId);
        const recordId = remoteId(id);
        const { data, error } = await client
            .from(table)
            .delete()
            .eq("user_id", userId)
            .eq("id", recordId)
            .select("id");
        if (error) throw error;
        if (!Array.isArray(data) || !data.some((row) => row.id === recordId)) {
            throw new Error("Aucun enregistrement n’a été supprimé.");
        }
    }

    async function importRecords(table, records, userId) {
        const uniqueRecords = [];
        const seenIds = new Set();
        records.forEach((record) => {
            const id = remoteId(record.id);
            if (!seenIds.has(id)) {
                seenIds.add(id);
                uniqueRecords.push(record);
            }
        });

        let imported = 0;
        for (let start = 0; start < uniqueRecords.length; start += 100) {
            try {
                await verifiedUserId(userId);
                const batch = uniqueRecords.slice(start, start + 100);
                for (const record of batch) {
                    const payload =
                        table === "applications"
                            ? toRemoteApplication(record, userId)
                            : toRemoteCompany(record, userId);
                    const result = await persistPayload(table, payload, userId);
                    if (result.inserted) imported += 1;
                }
            } catch (error) {
                const failed = uniqueRecords.length - start;
                return {
                    imported,
                    ignored: records.length - imported - failed,
                    failed,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Erreur réseau inattendue.",
                };
            }
        }

        return {
            imported,
            ignored: records.length - imported,
            failed: 0,
            error: "",
        };
    }

    return {
        verifiedUserId,
        readAll,
        saveRecord,
        deleteRecord,
        importRecords,
        fromRemoteApplication,
        fromRemoteCompany,
    };
}
