import { safeUrl } from "../utils/html.js";
import { today } from "../utils/date.js";

export function normalizeBackupData(parsed) {
    if (
        !parsed ||
        !Array.isArray(parsed.applications) ||
        !Array.isArray(parsed.companies)
    ) {
        throw new Error(
            "Le fichier ne contient pas une sauvegarde Candidatech valide.",
        );
    }

    const normalizeRecords = (records, type) =>
        records.map((record, index) => {
            const label =
                type === "applications" ? "Candidature" : "Entreprise";
            if (
                !record ||
                typeof record !== "object" ||
                Array.isArray(record) ||
                typeof record.id !== "string" ||
                !record.id.trim()
            ) {
                throw new Error(`${label} ${index + 1} : identifiant invalide.`);
            }

            const normalized = { ...record, id: record.id.trim() };
            if (type === "applications") {
                if (
                    typeof record.company !== "string" ||
                    !record.company.trim() ||
                    typeof record.role !== "string" ||
                    !record.role.trim()
                ) {
                    throw new Error(
                        `${label} ${index + 1} : entreprise et poste obligatoires.`,
                    );
                }
                normalized.company = record.company.trim();
                normalized.role = record.role.trim();
                normalized.url = safeUrl(
                    typeof record.url === "string" ? record.url : "",
                );
            } else {
                if (typeof record.name !== "string" || !record.name.trim()) {
                    throw new Error(
                        `${label} ${index + 1} : nom obligatoire.`,
                    );
                }
                normalized.name = record.name.trim();
                normalized.career = safeUrl(
                    typeof record.career === "string" ? record.career : "",
                );
                normalized.linkedin = safeUrl(
                    typeof record.linkedin === "string"
                        ? record.linkedin
                        : "",
                );
            }

            if (
                normalized.createdAt &&
                Number.isNaN(new Date(normalized.createdAt).getTime())
            ) {
                throw new Error(
                    `${label} ${index + 1} : date de création invalide.`,
                );
            }
            return normalized;
        });

    return {
        applications: normalizeRecords(parsed.applications, "applications"),
        companies: normalizeRecords(parsed.companies, "companies"),
    };
}

function csvEscape(value) {
    const text = String(value ?? "");
    const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
}

function download(content, name, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createBackupService({
    getData,
    isSignedIn,
    verifyUser,
    importRemoteRecords,
    reloadRemoteData,
    setData,
    persist,
    refresh,
    notify,
}) {
    function exportJSON(
        source = getData(),
        filename = `candidatech-${today()}.json`,
    ) {
        download(
            JSON.stringify(
                {
                    schemaVersion: 1,
                    exportedAt: new Date().toISOString(),
                    ...source,
                },
                null,
                2,
            ),
            filename,
            "application/json",
        );
        notify("Sauvegarde JSON exportée.");
    }

    function exportCSV() {
        const keys = [
            "date",
            "company",
            "role",
            "url",
            "contract",
            "cv",
            "channel",
            "contact",
            "contactDate",
            "status",
            "followupDate",
            "followupDone",
            "nextAction",
            "dueDate",
            "notes",
        ];
        const headers = [
            "Date candidature",
            "Entreprise",
            "Intitulé du poste",
            "Lien de l'offre",
            "Type de contrat confirmé",
            "CV utilisé / version",
            "Canal",
            "Contact / recruteur",
            "Date de contact",
            "Statut",
            "Date de relance prévue",
            "Date de relance faite",
            "Prochaine action",
            "Échéance prochaine action",
            "Retour / notes",
        ];
        const csv = [
            headers,
            ...getData().applications.map((application) =>
                keys.map((key) => application[key] || ""),
            ),
        ]
            .map((row) => row.map(csvEscape).join(";"))
            .join("\r\n");
        download(
            `\ufeff${csv}`,
            `candidatures-${today()}.csv`,
            "text/csv;charset=utf-8",
        );
        notify("Export CSV prêt.");
    }

    function exportCompaniesCSV() {
        const keys = [
            "name",
            "sector",
            "location",
            "career",
            "teams",
            "offers",
            "contract",
            "contact",
            "linkedin",
            "verified",
            "action",
            "status",
            "notes",
        ];
        const headers = [
            "Entreprise",
            "Secteur",
            "Localisation",
            "Site carrière",
            "Équipes",
            "Offres",
            "Compatibilité du contrat",
            "Contact",
            "LinkedIn",
            "Vérifié le",
            "Prochaine action",
            "Statut de prospection",
            "Notes",
        ];
        const csv = [
            headers,
            ...getData().companies.map((company) =>
                keys.map((key) => company[key] || ""),
            ),
        ]
            .map((row) => row.map(csvEscape).join(";"))
            .join("\r\n");
        download(
            `\ufeff${csv}`,
            `entreprises-${today()}.csv`,
            "text/csv;charset=utf-8",
        );
        notify("Export CSV des entreprises prêt.");
    }

    async function importBackup(file) {
        const parsed = normalizeBackupData(JSON.parse(await file.text()));
        const applications = parsed.applications;
        const companies = parsed.companies;
        const summary = `${applications.length} candidature(s) et ${companies.length} entreprise(s)`;
        if (
            !confirm(
                `Importer ${summary} sans remplacer les données existantes ? Les identifiants déjà présents seront ignorés.`,
            )
        ) {
            return;
        }

        if (isSignedIn()) {
            const userId = await verifyUser();
            const [applicationResult, companyResult] = await Promise.all([
                importRemoteRecords("applications", applications, userId),
                importRemoteRecords("companies", companies, userId),
            ]);
            const errors = [
                applicationResult.error,
                companyResult.error,
            ].filter(Boolean);
            await reloadRemoteData(userId);
            const imported =
                applicationResult.imported + companyResult.imported;
            const ignored = applicationResult.ignored + companyResult.ignored;
            const failed = applicationResult.failed + companyResult.failed;
            notify(
                `Import distant : ${imported} ajouté(s), ${ignored} déjà présent(s), ${failed} en échec.${errors.length ? ` ${errors.join(" · ")}` : ""}`,
            );
            return;
        }

        const currentData = getData();
        const nextData = {
            applications: [...currentData.applications],
            companies: [...currentData.companies],
        };
        const addUnique = (existing, incoming) => {
            const ids = new Set(existing.map((record) => record.id));
            let added = 0;
            incoming.forEach((record) => {
                if (
                    record &&
                    typeof record === "object" &&
                    !ids.has(record.id)
                ) {
                    existing.push(record);
                    ids.add(record.id);
                    added += 1;
                }
            });
            return added;
        };
        const added =
            addUnique(nextData.applications, applications) +
            addUnique(nextData.companies, companies);
        setData(nextData);
        if (!persist()) {
            setData(currentData);
            throw new Error(
                "Le stockage local n’a pas pu enregistrer l’import.",
            );
        }
        refresh();
        notify(
            `${added} enregistrement(s) importé(s). Les données existantes sont conservées.`,
        );
    }

    return {
        exportJSON,
        exportCSV,
        exportCompaniesCSV,
        normalizeBackupData,
        importBackup,
    };
}
