import { today } from "./utils/date.js";
import { $, $$ } from "./utils/dom.js";
import { escapeHtml, safeUrl } from "./utils/html.js";
import { uid } from "./utils/id.js";
import { createToast } from "./components/toast.js";
import { createThemeToggle } from "./components/theme-toggle.js";
import { createLocalDataService } from "./services/local-data-service.js";
import {
    createBackupService,
    normalizeBackupData,
} from "./services/backup-service.js";
import {
    authErrorMessage,
    createSupabaseAuthService,
} from "./services/supabase-auth-service.js";
import { createSupabaseDataService } from "./services/supabase-data-service.js";
import { createApplicationStore } from "./services/application-store.js";
import { createThemeService } from "./services/theme-service.js";
import { createDashboardView } from "./views/dashboard-view.js";
import { createRecordListView } from "./views/record-list-view.js";
import {
    appRows,
    companyRows,
    renderApplicationDetails,
    renderCompanyDetails,
} from "./views/record-view.js";

// Initialisation de l’application
export function initializeApplication() {
    // Strict mode
    "use strict";

    // ----------------  Variables et constantes ---------------- \\

    // Clé pour le stockage local des données
    const KEY = "candidatech.v0.data";

    // Clé pour le statut de la barre latérale
    const SIDEBAR_KEY = "candidatech.sidebar-collapsed";

    // Status de candidatures considérés
    const STATUSES = [
        "À préparer",
        "À envoyer",
        "Envoyée",
        "Contacté",
        "Relance à faire",
        "Entretien",
        "Refus",
        "Sans réponse",
        "Offre obtenue",
        "Clôturée",
    ];

    // Statuss actifs
    const ACTIVE = new Set([
        "À préparer",
        "À envoyer",
        "Envoyée",
        "Contacté",
        "Relance à faire",
        "Entretien",
        "Sans réponse",
    ]);

    const notify = createToast();
    const localDataService = createLocalDataService({
        key: KEY,
        notify,
    });
    let data = { applications: [], companies: [] };
    let activeView = "dashboard";
    const appDialog = $("#record-dialog"),
        companyDialog = $("#company-dialog");
    const detailDialog = $("#detail-dialog");
    const authDialog = $("#auth-dialog");
    let supabaseClient = null;
    let currentUser = null;
    let localDataError = "";
    let dataOwnerId = null;
    let remoteLoadError = "";
    let remoteLoading = false;
    let migrationPreview = null;
    let authMode = "signin";
    let detailSelection = null;
    let authUnavailableReason =
        "configuration manquante, veuillez renseigner l’URL et la clé publique";
    const supabaseDataService = createSupabaseDataService({
        getClient: () => supabaseClient,
        getCurrentUserId: () => currentUser?.id,
    });
    const supabaseAuthService = createSupabaseAuthService({
        getSdk: () => window.supabase,
        getClient: () => supabaseClient,
    });
    let applicationReady = false;
    const applicationStore = createApplicationStore({
        localDataService,
        supabaseDataService,
        supabaseAuthService,
        notify,
        onChange: (state) => {
            data = state.data;
            currentUser = state.currentUser;
            dataOwnerId = state.dataOwnerId;
            remoteLoadError = state.remoteLoadError;
            remoteLoading = state.remoteLoading;
            localDataError = state.localDataError;
            if (applicationReady) {
                refresh();
                updateAccountUI();
            }
        },
    });
    data = applicationStore.getData();
    localDataError = applicationStore.getState().localDataError;
    const themeToggle = createThemeToggle({
        service: createThemeService(),
    });
    const dashboardView = createDashboardView({
        getData: () => data,
        statuses: STATUSES,
        activeStatuses: ACTIVE,
        updateNavigationCount,
        renderApplicationRows: appRows,
    });
    const recordListView = createRecordListView({
        getData: () => data,
        activeStatuses: ACTIVE,
        renderApplicationRows: appRows,
        renderCompanyRows: companyRows,
        updateNavigationCount,
    });
    const backupService = createBackupService({
        getData: () => data,
        isSignedIn: () => Boolean(currentUser),
        verifyUser: () => applicationStore.verifiedUserId(),
        importRemoteRecords: supabaseDataService.importRecords,
        reloadRemoteData: async (userId) => {
            await applicationStore.loadRemoteData(userId, { force: true });
        },
        setData: (nextData) => applicationStore.setData(nextData),
        persist: () => applicationStore.persist(),
        refresh,
        notify,
    });
    const { exportJSON, exportCSV, exportCompaniesCSV, importBackup } =
        backupService;

    /**
     * Charge les candidatures et les entreprises enregistrées dans le navigateur.
     * Les anciennes données invalides sont ignorées au démarrage.
     * @returns {{ applications: object[], companies: object[] }}
     */
    function loadData() {
        return applicationStore.loadLocalData();
    }
    async function applySessionUser(user) {
        if (!user) migrationPreview = null;
        return applicationStore.applySessionUser(user);
    }
    async function upsertRecord(type, record) {
        return applicationStore.upsertRecord(type, record);
    }
    async function removeRecord(type, record) {
        return applicationStore.removeRecord(type, record);
    }
    /** Remplit les listes de statuts à partir des valeurs de référence. */
    function populateStatuses() {
        $("#f-status").innerHTML = STATUSES.map(
            (s) => `<option>${escapeHtml(s)}</option>`,
        ).join("");
        $("#status-filter").innerHTML =
            '<option value="">Tous les statuts</option>' +
            STATUSES.map((s) => `<option>${escapeHtml(s)}</option>`).join("");
    }
    /**
     * Affiche la vue demandée, actualise son titre et ramène la page en haut.
     * @param {string} name Identifiant de la vue à afficher.
     */
    function showView(name) {
        activeView = name;
        $$(".view").forEach((v) =>
            v.classList.toggle("is-visible", v.id === `view-${name}`),
        );
        $$("[data-view]").forEach((item) => {
            const isActive = item.dataset.view === name;
            if (item.classList.contains("nav-link")) {
                item.classList.toggle("is-active", isActive);
            }
            if (isActive) {
                item.setAttribute("aria-current", "page");
            } else {
                item.removeAttribute("aria-current");
            }
        });
        const titles = {
            dashboard: "Vue d’ensemble",
            applications: "Candidatures",
            companies: "Entreprises cibles",
            settings: "Données & paramètres",
        };
        $("#page-title").textContent = titles[name] || titles.dashboard;
        updatePrimaryAction();
        if (name === "dashboard") renderDashboard();
        if (name === "applications") renderApplications();
        if (name === "companies") renderCompanies();
        window.scrollTo({
            top: 0,
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "auto"
                : "smooth",
        });
    }
    /** Adapte l’action principale à la vue affichée. */
    function updatePrimaryAction() {
        const button = $("#quick-add");
        const label = $("#quick-add-label");
        const isSettings = activeView === "settings";
        button.hidden = isSettings;
        const isCompanyView = activeView === "companies";
        label.textContent = isCompanyView
            ? "Nouvelle entreprise"
            : "Nouvelle candidature";
        button.setAttribute(
            "aria-label",
            isCompanyView
                ? "Ajouter une entreprise"
                : "Ajouter une candidature",
        );
    }
    /** Affiche le mode de stockage et l’état courant de la synchronisation. */
    function updateAccountUI() {
        const status = $("#account-status");
        const name = $("#account-name");
        const email = $("#account-email");
        const action = $("#account-action");
        const isSignedIn = Boolean(currentUser);
        const displayName =
            currentUser?.user_metadata?.display_name ||
            currentUser?.user_metadata?.name ||
            currentUser?.email ||
            "Utilisateur";
        const settingsAction = $("#settings-account-action");
        const settingsDescription = $("#account-settings-description");

        status.textContent = remoteLoading
            ? "Chargement…"
            : isSignedIn
              ? remoteLoadError
                  ? "Synchronisation en erreur"
                  : displayName
              : "Mode local";
        email.textContent = isSignedIn
            ? `${currentUser.email || "Session active"}`
            : "Compte facultatif";
        name.textContent = isSignedIn ? displayName : "";
        action.setAttribute(
            "aria-label",
            isSignedIn ? "Se déconnecter" : "Se connecter",
        );
        action.setAttribute(
            "title",
            isSignedIn ? "Se déconnecter" : "Se connecter",
        );
        action.innerHTML = isSignedIn
            ? '<i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>'
            : '<i class="fa-solid fa-arrow-right-to-bracket" aria-hidden="true"></i>';
        settingsAction.textContent = isSignedIn
            ? "Se déconnecter"
            : "Se connecter ou créer un compte";
        settingsDescription.textContent = remoteLoading
            ? "Vérification de la session et chargement des données distantes…"
            : isSignedIn
              ? remoteLoadError
                  ? `Connecté avec ${currentUser.email || "ton compte"}. Les données distantes n’ont pas pu être chargées : ${remoteLoadError}`
                  : `Connecté avec ${currentUser.email || "ton compte"}. Les données affichées sont stockées dans la base de données.`
              : localDataError
                ? "La sauvegarde locale est illisible ou inaccessible. Récupère-la ou réinitialise-la explicitement avant de continuer."
                : "Sans connexion, tes données sont enregistrées dans ce navigateur.";
        $("#footer-storage-label").textContent = remoteLoading
            ? "Connexion à la base de données…"
            : isSignedIn
              ? remoteLoadError
                  ? "Synchronisation indisponible"
                  : "utilisateur connecté"
              : "Mode local";
        $("#migration-panel").hidden =
            !isSignedIn || Boolean(remoteLoading || remoteLoadError);
        $("#reset-remote-panel").hidden = !isSignedIn;
        $("#retry-remote-load").hidden = !isSignedIn || !remoteLoadError;
        $("#quick-add").disabled = Boolean(
            remoteLoading ||
            (isSignedIn && remoteLoadError) ||
            (!isSignedIn && localDataError),
        );
        ["export-json", "export-csv", "export-companies-csv"].forEach((id) => {
            $(`#${id}`).disabled = Boolean(
                remoteLoading ||
                (isSignedIn && remoteLoadError) ||
                (!isSignedIn && localDataError),
            );
        });
    }
    /** Ouvre la connexion ou termine la session Supabase en cours. */
    async function handleAccountAction() {
        if (!currentUser) {
            openAuthDialog();
            return;
        }
        if (!supabaseClient) {
            notify(
                "Déconnexion impossible : le client Supabase n’est pas disponible.",
            );
            return;
        }
        try {
            const { error } = await supabaseAuthService.signOut();
            if (error) {
                notify(`Déconnexion impossible : ${error.message}`);
                return;
            }
            await applySessionUser(null);
            notify("Déconnexion réussie.");
        } catch (error) {
            notify(
                error instanceof Error
                    ? `Déconnexion impossible : ${error.message}`
                    : "Déconnexion impossible : une erreur inattendue est survenue.",
            );
        }
    }
    /** Restaure l’état replié de la navigation lorsqu’il est disponible. */
    function initSidebar() {
        const sidebar = $(".sidebar");
        const shell = $(".app-shell");
        const toggle = $("#sidebar-toggle");
        try {
            const isCollapsed = localStorage.getItem(SIDEBAR_KEY) === "true";
            sidebar.classList.toggle("is-collapsed", isCollapsed);
            shell.classList.toggle("is-sidebar-collapsed", isCollapsed);
        } catch {
            sidebar.classList.remove("is-collapsed");
            shell.classList.remove("is-sidebar-collapsed");
        }
        const isExpanded = !sidebar.classList.contains("is-collapsed");
        toggle.setAttribute("aria-expanded", String(isExpanded));
        toggle.setAttribute(
            "aria-label",
            isExpanded ? "Réduire la navigation" : "Développer la navigation",
        );
        toggle.title = isExpanded
            ? "Réduire la navigation"
            : "Développer la navigation";
    }
    /** Configure le client Supabase uniquement lorsque les deux valeurs publiques sont renseignées. */
    async function initAuth() {
        const config = window.CANDIDATECH_SUPABASE_CONFIG;
        const url = config?.url?.trim();
        const publishableKey = config?.publishableKey?.trim();
        const isConfigured =
            Boolean(url && publishableKey) &&
            !url.includes("your-project-ref") &&
            !publishableKey.includes("your-public-publishable-key");

        if (!isConfigured) {
            updateAccountUI();
            return;
        }
        authUnavailableReason = "";
        if (!window.supabase?.createClient) {
            authUnavailableReason =
                "Le chargement n'a pas pu aboutir. Veuillez vérifier votre connexion internet et recharger la page.";
            $("#auth-message").textContent = authUnavailableReason;
            return;
        }

        try {
            new URL(url);
        } catch {
            authUnavailableReason = "L’URL n’est pas valide.";
            $("#auth-message").textContent = authUnavailableReason;
            return;
        }

        try {
            supabaseClient = supabaseAuthService.createClient(
                url,
                publishableKey,
            );
            applicationStore.setClient(supabaseClient);
            supabaseAuthService.onAuthStateChange((_event, session) => {
                queueMicrotask(
                    () => void applySessionUser(session?.user || null),
                );
            });

            const { data: sessionData, error } =
                await supabaseAuthService.getSession();
            if (error) {
                authUnavailableReason = `Impossible de vérifier la session : ${error.message}`;
                $("#auth-message").textContent = authUnavailableReason;
                return;
            }
            await applySessionUser(sessionData.session?.user || null);
        } catch (error) {
            authUnavailableReason =
                error instanceof Error
                    ? `Initialisation Supabase impossible : ${error.message}`
                    : "Initialisation Supabase impossible : une erreur inattendue est survenue.";
            $("#auth-message").textContent = authUnavailableReason;
        }
    }
    /** Bascule entre les formulaires de connexion et de création de compte. */
    function setAuthMode(mode) {
        authMode = mode;
        const isSignup = mode === "signup";
        $("#auth-title").textContent = isSignup
            ? "Créer un compte"
            : "Se connecter";
        $("#auth-submit").textContent = isSignup
            ? "Créer mon compte"
            : "Se connecter";
        $("#auth-name-field").hidden = !isSignup;
        $("#auth-name").required = isSignup;
        $("#auth-password").autocomplete = isSignup
            ? "new-password"
            : "current-password";
        $$("[data-auth-mode]").forEach((button) => {
            const selected = button.dataset.authMode === mode;
            button.classList.toggle("is-active", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
        $("#auth-message").textContent = "";
        $("#auth-message").classList.remove("is-error");
    }
    /** Ouvre le formulaire d’accès au compte et explique si la configuration manque. */
    function openAuthDialog() {
        setAuthMode("signin");
        $("#auth-message").textContent = authUnavailableReason;
        $("#auth-message").classList.toggle(
            "is-error",
            Boolean(authUnavailableReason),
        );
        authDialog.showModal();
    }
    /** Soumet une demande d’inscription ou de connexion Supabase. */
    async function submitAuth(event) {
        event.preventDefault();
        const message = $("#auth-message");
        if (!supabaseClient) {
            message.textContent = "Connexion indisponible";
            message.classList.add("is-error");
            return;
        }

        const email = $("#auth-email").value.trim();
        const password = $("#auth-password").value;
        const mode = authMode;
        const submitButton = $("#auth-submit");
        submitButton.disabled = true;
        submitButton.textContent =
            mode === "signup" ? "Création du compte…" : "Connexion en cours…";
        $$("[data-auth-mode]").forEach((button) => {
            button.disabled = true;
        });
        message.textContent = "";
        message.classList.remove("is-error");

        try {
            const result =
                mode === "signup"
                    ? await supabaseAuthService.signUp(
                          email,
                          password,
                          $("#auth-name").value.trim(),
                      )
                    : await supabaseAuthService.signIn(email, password);

            if (result.error) {
                message.textContent = authErrorMessage(result.error, mode);
                message.classList.add("is-error");
            } else if (mode === "signup" && !result.data.session) {
                message.textContent =
                    "Si l’inscription peut aboutir pour cette adresse, un e-mail de confirmation sera envoyé. Vérifie aussi les courriers indésirables. Si tu as déjà un compte, choisis « Connexion ». Si aucun e-mail n’arrive, vérifie la configuration e-mail du projet.";
            } else {
                if (!result.data.user || !result.data.session) {
                    throw new Error(
                        "La réponse d’authentification est incomplète.",
                    );
                }
                currentUser = result.data.user;
                await applySessionUser(currentUser);
                authDialog.close();
                notify(
                    mode === "signup"
                        ? "Compte Candidatech créé."
                        : "Connexion réussie.",
                );
            }
        } catch (error) {
            message.textContent = authErrorMessage(error, mode);
            message.classList.add("is-error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent =
                mode === "signup" ? "Créer mon compte" : "Se connecter";
            $$("[data-auth-mode]").forEach((button) => {
                button.disabled = false;
            });
        }
    }
    /**
     * Ouvre le formulaire de candidature, vierge ou prérempli pour modification.
     * @param {object|null} [record=null] Candidature à modifier, le cas échéant.
     */
    function openApp(record = null) {
        $("#record-form").reset();
        $("#record-id").value = record?.id || "";
        $("#dialog-title").textContent = record
            ? "Modifier la candidature"
            : "Nouvelle candidature";
        const fields = {
            company: "company",
            role: "role",
            date: "date",
            url: "url",
            contract: "contract",
            cv: "cv",
            channel: "channel",
            contact: "contact",
            status: "status",
            contactDate: "contact-date",
            followupDate: "followup-date",
            followupDone: "followup-done",
            nextAction: "next-action",
            dueDate: "due-date",
            notes: "notes",
        };
        Object.entries(fields).forEach(([key, id]) => {
            if (record && record[key] != null)
                $(`#f-${id}`).value = record[key];
        });
        if (!record) {
            $("#f-date").value = today();
            $("#f-status").value = "À préparer";
            $("#f-next-action").value = "Vérifier la compatibilité du contrat";
        }
        appDialog.showModal();
        $("#f-company").focus();
    }
    /**
     * Ouvre le formulaire d’entreprise, vierge ou prérempli pour modification.
     * @param {object|null} [record=null] Entreprise à modifier, le cas échéant.
     */
    function openCompany(record = null) {
        $("#company-form").reset();
        $("#company-id").value = record?.id || "";
        $("#company-dialog-title").textContent = record
            ? "Modifier l’entreprise"
            : "Nouvelle entreprise";
        const fields = {
            name: "name",
            sector: "sector",
            location: "location",
            career: "career",
            teams: "teams",
            offers: "offers",
            contract: "contract",
            contact: "contact",
            linkedin: "linkedin",
            verified: "verified",
            action: "action",
            status: "status",
            notes: "notes",
        };
        Object.entries(fields).forEach(([key, id]) => {
            if (record && record[key] != null)
                $(`#c-${id}`).value = record[key];
        });
        if (!record) {
            $("#c-contract").value = "À vérifier";
            $("#c-status").value = "À rechercher";
            $("#c-action").value = "Identifier une offre ou un contact";
        }
        companyDialog.showModal();
        $("#c-name").focus();
    }
    /**
     * Construit un enregistrement de candidature à partir du formulaire.
     * @returns {object} Données de candidature prêtes à être enregistrées.
     */
    function appFromForm() {
        const old = data.applications.find(
            (a) => a.id === $("#record-id").value,
        );
        return {
            id: old?.id || uid(),
            createdAt: old?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            company: $("#f-company").value.trim(),
            role: $("#f-role").value.trim(),
            date: $("#f-date").value,
            url: safeUrl($("#f-url").value.trim()),
            contract: $("#f-contract").value,
            cv: $("#f-cv").value.trim(),
            channel: $("#f-channel").value,
            contact: $("#f-contact").value.trim(),
            status: $("#f-status").value,
            contactDate: $("#f-contact-date").value,
            followupDate: $("#f-followup-date").value,
            followupDone: $("#f-followup-done").value,
            nextAction: $("#f-next-action").value.trim(),
            dueDate: $("#f-due-date").value,
            notes: $("#f-notes").value.trim(),
        };
    }
    /**
     * Construit un enregistrement d’entreprise à partir du formulaire.
     * @returns {object} Données de prospection prêtes à être enregistrées.
     */
    function companyFromForm() {
        const old = data.companies.find((c) => c.id === $("#company-id").value);
        return {
            id: old?.id || uid(),
            createdAt: old?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            name: $("#c-name").value.trim(),
            sector: $("#c-sector").value.trim(),
            location: $("#c-location").value.trim(),
            career: safeUrl($("#c-career").value.trim()),
            teams: $("#c-teams").value.trim(),
            offers: $("#c-offers").value.trim(),
            contract: $("#c-contract").value,
            contact: $("#c-contact").value.trim(),
            linkedin: safeUrl($("#c-linkedin").value.trim()),
            verified: $("#c-verified").value,
            action: $("#c-action").value.trim(),
            status: $("#c-status").value,
            notes: $("#c-notes").value.trim(),
        };
    }
    function openRecordDetails(type, record) {
        detailSelection = { type, id: record.id };
        $("#detail-title").textContent =
            type === "applications"
                ? `${record.company} — ${record.role}`
                : record.name;
        $("#detail-content").innerHTML =
            type === "applications"
                ? renderApplicationDetails(record)
                : renderCompanyDetails(record);
        detailDialog.showModal();
        $("#detail-dialog-close").focus();
    }
    async function deleteRecordAfterConfirmation(type, id) {
        const records =
            type === "applications" ? data.applications : data.companies;
        const record = records.find((item) => item.id === id);
        if (!record) return;
        const name =
            type === "applications"
                ? `la candidature chez « ${record.company} »`
                : `l’entreprise « ${record.name} »`;
        if (!confirm(`Supprimer ${name} ?`)) return;
        try {
            if (await removeRecord(type, record)) {
                if (detailDialog.open) detailDialog.close();
                detailSelection = null;
                refresh();
                const label =
                    type === "applications" ? "Candidature" : "Entreprise";
                notify(
                    currentUser
                        ? `${label} supprimée de la base de données.`
                        : `${label} supprimée.`,
                );
            } else {
                notify(
                    "La suppression n’a pas été enregistrée ; les données sont conservées.",
                );
            }
        } catch (error) {
            notify(
                `Suppression impossible : ${error instanceof Error ? error.message : "erreur inattendue"}`,
            );
        }
    }
    /** Actualise le total des candidatures actives et des entreprises. */
    function updateNavigationCount(count) {
        $("#nav-company-count").textContent = data.companies.length;
        $('[data-view="companies"].nav-link').setAttribute(
            "aria-label",
            `Entreprises cibles, ${data.companies.length} enregistrée(s)`,
        );

        $("#nav-app-count").textContent = count;
        $('[data-view="applications"].nav-link').setAttribute(
            "aria-label",
            `Candidatures, ${count} en cours`,
        );
    }
    const renderDashboard = dashboardView;
    const { renderApplications, renderCompanies } = recordListView;
    function prepareMigration() {
        if (!currentUser || remoteLoading || remoteLoadError) return;
        let snapshot;
        try {
            const localData = loadData();
            if (localDataError) throw new Error(localDataError);
            snapshot = normalizeBackupData(localData);
        } catch (error) {
            notify(
                `Aperçu de migration impossible : ${error instanceof Error ? error.message : "données locales invalides"}`,
            );
            return;
        }
        migrationPreview = {
            snapshot,
            serialized: JSON.stringify(snapshot),
        };
        const applications = snapshot.applications.length;
        const companies = snapshot.companies.length;
        $("#migration-preview").textContent =
            `Aperçu : ${applications} candidature${applications === 1 ? "" : "s"} et ${companies} entreprise${companies === 1 ? "" : "s"} seront proposées à l’import. Les enregistrements déjà présents avec le même identifiant seront ignorés. La sauvegarde locale sera conservée.`;
        $("#migration-preview").hidden = false;
        $("#confirm-migration").hidden = applications + companies === 0;
        $("#migration-result").textContent = "";
    }
    async function confirmMigration() {
        if (!migrationPreview || !currentUser) return;
        let currentLocalSnapshot;
        try {
            const localData = loadData();
            if (localDataError) throw new Error(localDataError);
            currentLocalSnapshot = normalizeBackupData(localData);
        } catch (error) {
            notify(
                `Migration impossible : ${error instanceof Error ? error.message : "données locales invalides"}`,
            );
            return;
        }
        if (
            JSON.stringify(currentLocalSnapshot) !== migrationPreview.serialized
        ) {
            prepareMigration();
            notify("Les données locales ont changé. Vérifie le nouvel aperçu.");
            return;
        }
        const button = $("#confirm-migration");
        button.disabled = true;
        let userId = "";
        try {
            userId = await applicationStore.verifiedUserId();
            const [applications, companies] = await Promise.all([
                supabaseDataService.importRecords(
                    "applications",
                    migrationPreview.snapshot.applications,
                    userId,
                ),
                supabaseDataService.importRecords(
                    "companies",
                    migrationPreview.snapshot.companies,
                    userId,
                ),
            ]);
            const result = [
                `Candidatures : ${applications.imported} importée(s), ${migrationPreview.snapshot.applications.length - applications.imported - applications.failed} déjà présente(s), ${applications.failed} en échec.`,
                `Entreprises : ${companies.imported} importée(s), ${migrationPreview.snapshot.companies.length - companies.imported - companies.failed} déjà présente(s), ${companies.failed} en échec.`,
            ];
            const errors = [applications.error, companies.error].filter(
                Boolean,
            );
            if (errors.length) result.push(`Détail : ${errors.join(" · ")}`);
            $("#migration-result").textContent = result.join(" ");
            migrationPreview = null;
            $("#migration-preview").hidden = true;
            $("#confirm-migration").hidden = true;
            dataOwnerId = null;
            await applicationStore.loadRemoteData(userId, { force: true });
            notify(
                errors.length
                    ? "Migration partielle : consulte le détail dans les paramètres. La sauvegarde locale est conservée."
                    : "Migration terminée. La sauvegarde locale est conservée.",
            );
        } catch (error) {
            const detail =
                error instanceof Error ? error.message : "Erreur inattendue.";
            $("#migration-result").textContent =
                `Migration impossible : ${detail}. Les données locales sont conservées.`;
            notify("Migration impossible. La sauvegarde locale est conservée.");
        } finally {
            button.disabled = false;
        }
    }
    async function resetRemoteData() {
        if (!currentUser) return;
        if (
            !confirm(
                `Supprimer définitivement ${data.applications.length} candidature(s) et ${data.companies.length} entreprise(s) de la base de données pour ce compte ? Les données locales sur cet appareil ne seront pas supprimées.`,
            )
        ) {
            return;
        }
        try {
            const errors = await applicationStore.resetRemoteData();
            if (errors.length) {
                notify(
                    `Suppression distante partielle : ${errors.join(" · ")}. Vérifie les données affichées.`,
                );
                return;
            }
            notify(
                "Les données de ce compte ont été supprimées. La sauvegarde locale est conservée.",
            );
        } catch (error) {
            notify(
                `Réinitialisation distante impossible : ${error instanceof Error ? error.message : "erreur inattendue"}`,
            );
        }
    }
    /** Applique le thème enregistré ou, à défaut, la préférence du système. */
    function initTheme() {
        themeToggle.init();
    }
    /** Relie les contrôles de l’interface à leurs actions. */
    function bindEvents() {
        $$("[data-view]").forEach((b) =>
            b.addEventListener("click", () => showView(b.dataset.view)),
        );
        $$("[data-go]").forEach((b) =>
            b.addEventListener("click", () => showView(b.dataset.go)),
        );
        $("#quick-add").addEventListener("click", () => {
            if (activeView === "companies") openCompany();
            else openApp();
        });
        $("#sidebar-toggle").addEventListener("click", () => {
            const sidebar = $(".sidebar");
            const isCollapsed = sidebar.classList.toggle("is-collapsed");
            $(".app-shell").classList.toggle(
                "is-sidebar-collapsed",
                isCollapsed,
            );
            const isExpanded = !isCollapsed;
            $("#sidebar-toggle").setAttribute(
                "aria-expanded",
                String(isExpanded),
            );
            $("#sidebar-toggle").setAttribute(
                "aria-label",
                isExpanded
                    ? "Réduire la navigation"
                    : "Développer la navigation",
            );
            $("#sidebar-toggle").title = isExpanded
                ? "Réduire la navigation"
                : "Développer la navigation";
            try {
                localStorage.setItem(SIDEBAR_KEY, String(isCollapsed));
            } catch {
                notify(
                    "La navigation est repliée, mais ce choix ne peut pas être mémorisé.",
                );
            }
        });
        $("#account-action").addEventListener("click", handleAccountAction);
        $("#settings-account-action").addEventListener(
            "click",
            handleAccountAction,
        );
        $("#retry-remote-load").addEventListener("click", () => {
            if (currentUser) {
                dataOwnerId = null;
                void applySessionUser(currentUser);
            }
        });
        $("#auth-dialog-close").addEventListener("click", () =>
            authDialog.close(),
        );
        $("#auth-form").addEventListener("submit", submitAuth);
        $$("[data-auth-mode]").forEach((button) =>
            button.addEventListener("click", () =>
                setAuthMode(button.dataset.authMode),
            ),
        );
        $("#dialog-close").addEventListener("click", () => appDialog.close());
        $("#dialog-cancel").addEventListener("click", () => appDialog.close());
        $("#company-dialog-close").addEventListener("click", () =>
            companyDialog.close(),
        );
        $("#company-dialog-cancel").addEventListener("click", () =>
            companyDialog.close(),
        );
        $("#detail-dialog-close").addEventListener("click", () =>
            detailDialog.close(),
        );
        $("#detail-dialog-cancel").addEventListener("click", () =>
            detailDialog.close(),
        );
        detailDialog.addEventListener("close", () => {
            detailSelection = null;
        });
        $("#detail-edit").addEventListener("click", () => {
            if (!detailSelection) return;
            const { type, id } = detailSelection;
            const records =
                type === "applications" ? data.applications : data.companies;
            const record = records.find((item) => item.id === id);
            detailDialog.close();
            if (!record) return;
            if (type === "applications") openApp(record);
            else openCompany(record);
        });
        $("#detail-delete").addEventListener("click", () => {
            if (detailSelection) {
                void deleteRecordAfterConfirmation(
                    detailSelection.type,
                    detailSelection.id,
                );
            }
        });
        $("#record-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!$("#record-form").reportValidity()) return;
            const record = appFromForm();
            const submit = $("#record-form").querySelector('[type="submit"]');
            submit.disabled = true;
            try {
                if (await upsertRecord("applications", record)) {
                    appDialog.close();
                    refresh();
                    notify(
                        currentUser
                            ? "Candidature enregistrée dans la base de données."
                            : "Candidature enregistrée en local sur cet appareil.",
                    );
                }
            } catch (error) {
                notify(
                    `Enregistrement de la candidature impossible : ${error instanceof Error ? error.message : "erreur inattendue"}`,
                );
            } finally {
                submit.disabled = false;
            }
        });
        $("#company-form").addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!$("#company-form").reportValidity()) return;
            const record = companyFromForm();
            const submit = $("#company-form").querySelector('[type="submit"]');
            submit.disabled = true;
            try {
                if (await upsertRecord("companies", record)) {
                    companyDialog.close();
                    refresh();
                    notify(
                        currentUser
                            ? "Entreprise enregistrée dans la base de données."
                            : "Entreprise enregistrée en local sur cet appareil.",
                    );
                }
            } catch (error) {
                notify(
                    `Enregistrement de l’entreprise impossible : ${error instanceof Error ? error.message : "erreur inattendue"}`,
                );
            } finally {
                submit.disabled = false;
            }
        });
        $("#app-search").addEventListener("input", renderApplications);
        $("#status-filter").addEventListener("change", renderApplications);
        $("#contract-filter").addEventListener("change", renderApplications);
        $("#company-search").addEventListener("input", renderCompanies);
        $("#company-contract-filter").addEventListener(
            "change",
            renderCompanies,
        );
        document.addEventListener("click", async (e) => {
            if (!(e.target instanceof Element)) return;
            const viewApp = e.target.closest("[data-view-app]");
            if (viewApp) {
                const r = data.applications.find(
                    (a) => a.id === viewApp.dataset.viewApp,
                );
                if (r) openRecordDetails("applications", r);
                return;
            }
            const editApp = e.target.closest("[data-edit-app]");
            if (editApp) {
                const record = data.applications.find(
                    (item) => item.id === editApp.dataset.editApp,
                );
                if (record) openApp(record);
                return;
            }
            const del = e.target.closest("[data-delete-app]");
            if (del) {
                await deleteRecordAfterConfirmation(
                    "applications",
                    del.dataset.deleteApp,
                );
                return;
            }
            const viewCompany = e.target.closest("[data-view-company]");
            if (viewCompany) {
                const r = data.companies.find(
                    (c) => c.id === viewCompany.dataset.viewCompany,
                );
                if (r) openRecordDetails("companies", r);
                return;
            }
            const editCompany = e.target.closest("[data-edit-company]");
            if (editCompany) {
                const record = data.companies.find(
                    (item) => item.id === editCompany.dataset.editCompany,
                );
                if (record) openCompany(record);
                return;
            }
            const delC = e.target.closest("[data-delete-company]");
            if (delC) {
                await deleteRecordAfterConfirmation(
                    "companies",
                    delC.dataset.deleteCompany,
                );
            }
        });
        $("#export-json").addEventListener("click", exportJSON);
        $("#export-local-json").addEventListener("click", () => {
            const localData = loadData();
            if (localDataError) {
                notify(
                    "Export local impossible : la sauvegarde est illisible ou inaccessible.",
                );
                return;
            }
            exportJSON(localData, `candidatech-local-${today()}.json`);
        });
        $("#export-csv").addEventListener("click", exportCSV);
        $("#export-companies-csv").addEventListener(
            "click",
            exportCompaniesCSV,
        );
        $("#import-json").addEventListener("change", async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                await importBackup(file);
            } catch (err) {
                notify(
                    `Import impossible : ${err instanceof Error ? err.message : "fichier invalide ou incompatible"}`,
                );
            } finally {
                e.target.value = "";
            }
        });
        $("#reset-local-data").addEventListener("click", () => {
            if (
                confirm(
                    "Supprimer uniquement la sauvegarde locale de ce navigateur ? Les données distantes ne seront pas modifiées.",
                )
            ) {
                try {
                    applicationStore.clearLocalData();
                    notify(
                        "La sauvegarde locale de cet appareil a été supprimée.",
                    );
                } catch (error) {
                    notify(
                        `Suppression locale impossible : ${error instanceof Error ? error.message : "stockage inaccessible"}`,
                    );
                }
            }
        });
        $("#prepare-migration").addEventListener("click", prepareMigration);
        $("#confirm-migration").addEventListener("click", confirmMigration);
        $("#reset-remote-data").addEventListener("click", resetRemoteData);
    }
    /** Réactualise les vues qui présentent les données de l’application. */
    function refresh() {
        renderDashboard();
        renderApplications();
        renderCompanies();
    }
    /** Prépare les listes et le thème, branche les interactions puis affiche les données. */
    function init() {
        populateStatuses();
        initTheme();
        initSidebar();
        updatePrimaryAction();
        updateAccountUI();
        bindEvents();
        $("#today-label").textContent = new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        })
            .format(new Date())
            .toLocaleUpperCase("fr");
        refresh();
        applicationReady = true;
        void initAuth().finally(() => {
            if (window.location.hash === "#signup" && !currentUser) {
                openAuthDialog();
                setAuthMode("signup");
            }
        });
    }
    init();
}
