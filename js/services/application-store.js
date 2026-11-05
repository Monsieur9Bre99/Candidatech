/**
 * Owns the application data lifecycle: local storage, authenticated remote
 * data, and the transitions between both sources.
 */
export function createApplicationStore({
    localDataService,
    supabaseDataService,
    supabaseAuthService,
    notify,
    onChange = () => {},
}) {
    let data = { applications: [], companies: [] };
    let client = null;
    let currentUser = null;
    let dataOwnerId = null;
    let remoteLoadError = "";
    let remoteLoading = false;
    let localDataError = "";

    function getState() {
        return {
            data,
            client,
            currentUser,
            dataOwnerId,
            remoteLoadError,
            remoteLoading,
            localDataError,
        };
    }

    function changed() {
        onChange(getState());
    }

    function loadLocalData() {
        data = localDataService.load();
        localDataError = localDataService.getLastError();
        changed();
        return data;
    }

    function persist() {
        return localDataService.save(data);
    }

    function setClient(nextClient) {
        client = nextClient;
        changed();
    }

    async function loadRemoteData(userId, { force = false } = {}) {
        if (!force && dataOwnerId === userId && !remoteLoadError) return;
        currentUser = { ...currentUser, id: userId };
        dataOwnerId = userId;
        remoteLoadError = "";
        remoteLoading = true;
        data = { applications: [], companies: [] };
        changed();

        try {
            const [applications, companies] = await Promise.all([
                supabaseDataService.readAll("applications", userId),
                supabaseDataService.readAll("companies", userId),
            ]);
            if (currentUser?.id !== userId) return;
            data = {
                applications: applications.map(
                    supabaseDataService.fromRemoteApplication,
                ),
                companies: companies.map(
                    supabaseDataService.fromRemoteCompany,
                ),
            };
            remoteLoading = false;
            changed();
        } catch (error) {
            if (currentUser?.id !== userId) return;
            remoteLoading = false;
            remoteLoadError =
                error instanceof Error
                    ? error.message
                    : "Erreur réseau inattendue.";
            changed();
            notify(`Chargement Supabase impossible : ${remoteLoadError}`);
        }
    }

    async function applySessionUser(user) {
        if (!user) {
            if (client) {
                const { data: sessionData, error } =
                    await supabaseAuthService.getSession();
                if (error) {
                    remoteLoadError = error.message;
                    remoteLoading = false;
                    changed();
                    notify(
                        `Vérification de session impossible : ${error.message}`,
                    );
                    return;
                }
                if (sessionData.session?.user) {
                    await applySessionUser(sessionData.session.user);
                    return;
                }
            }
            currentUser = null;
            dataOwnerId = null;
            remoteLoadError = "";
            remoteLoading = false;
            loadLocalData();
            return;
        }

        if (!client) return;
        if (currentUser?.id !== user.id) {
            currentUser = null;
            dataOwnerId = null;
            remoteLoadError = "";
            remoteLoading = true;
            data = { applications: [], companies: [] };
            changed();
        }

        try {
            const userId = await supabaseDataService.verifiedUserId(user.id);
            if (userId !== user.id) {
                throw new Error(
                    "La session active ne correspond pas au compte reçu.",
                );
            }
            currentUser = user;
            await loadRemoteData(userId);
        } catch (error) {
            remoteLoading = false;
            currentUser = null;
            dataOwnerId = null;
            data = loadLocalData();
            remoteLoadError =
                error instanceof Error
                    ? error.message
                    : "Vérification de session impossible.";
            changed();
            notify(`Connexion Supabase non vérifiée : ${remoteLoadError}`);
        }
    }

    async function upsertRecord(type, record) {
        const key = type === "applications" ? "applications" : "companies";
        if (currentUser) {
            const ownerId = await supabaseDataService.verifiedUserId(
                currentUser.id,
            );
            await supabaseDataService.saveRecord(key, record, ownerId);
            if (currentUser?.id !== ownerId) {
                throw new Error("Le compte a changé pendant l’enregistrement.");
            }
            const records = [...data[key]];
            const index = records.findIndex((item) => item.id === record.id);
            if (index >= 0) records[index] = record;
            else records.push(record);
            data = { ...data, [key]: records };
            changed();
            return true;
        }

        const previous = data;
        const records = [...data[key]];
        const index = records.findIndex((item) => item.id === record.id);
        if (index >= 0) records[index] = record;
        else records.push(record);
        data = { ...data, [key]: records };
        if (persist()) {
            changed();
            return true;
        }
        data = previous;
        changed();
        return false;
    }

    async function removeRecord(type, record) {
        const key = type === "applications" ? "applications" : "companies";
        if (currentUser) {
            const ownerId = await supabaseDataService.verifiedUserId(
                currentUser.id,
            );
            await supabaseDataService.deleteRecord(key, record.id, ownerId);
            if (currentUser?.id !== ownerId) {
                throw new Error("Le compte a changé pendant la suppression.");
            }
        }
        const previous = data;
        data = {
            ...data,
            [key]: data[key].filter((item) => item.id !== record.id),
        };
        if (!currentUser && !persist()) {
            data = previous;
            changed();
            return false;
        }
        changed();
        return true;
    }

    async function resetRemoteData() {
        if (!currentUser) return [];
        const userId = await supabaseDataService.verifiedUserId(
            currentUser.id,
        );
        const results = await Promise.all(
            ["applications", "companies"].map((table) =>
                client
                    .from(table)
                    .delete()
                    .eq("user_id", userId)
                    .select("id"),
            ),
        );
        const errors = results.flatMap((result, index) => {
            const label = index === 0 ? "Candidatures" : "Entreprises";
            if (result.error) return [`${label} : ${result.error.message}`];
            if (!Array.isArray(result.data)) {
                return [`${label} : Supabase n’a pas confirmé la suppression.`];
            }
            return [];
        });
        dataOwnerId = null;
        await loadRemoteData(userId);
        return errors;
    }

    function setData(nextData) {
        data = nextData;
        changed();
    }

    function clearLocalData() {
        localDataService.clear();
        localDataError = "";
        if (!currentUser) data = { applications: [], companies: [] };
        changed();
    }

    loadLocalData();

    return {
        applySessionUser,
        clearLocalData,
        getClient: () => client,
        getCurrentUser: () => currentUser,
        getData: () => data,
        getState,
        loadLocalData,
        loadRemoteData,
        persist,
        removeRecord,
        resetRemoteData,
        setClient,
        setData,
        upsertRecord,
        verifiedUserId: (expectedUserId = currentUser?.id) =>
            supabaseDataService.verifiedUserId(expectedUserId),
    };
}
