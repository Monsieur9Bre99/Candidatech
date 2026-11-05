export function createSupabaseAuthService({ getSdk, getClient }) {
    function createClient(url, publishableKey) {
        const sdk = getSdk();
        if (!sdk?.createClient) {
            throw new Error("La bibliothèque Supabase n’est pas disponible.");
        }
        return sdk.createClient(url, publishableKey);
    }

    function getSession() {
        const client = getClient();
        if (!client) throw new Error("Le client Supabase n’est pas disponible.");
        return client.auth.getSession();
    }

    function onAuthStateChange(callback) {
        const client = getClient();
        if (!client) throw new Error("Le client Supabase n’est pas disponible.");
        return client.auth.onAuthStateChange(callback);
    }

    function signOut() {
        const client = getClient();
        if (!client) throw new Error("Le client Supabase n’est pas disponible.");
        return client.auth.signOut();
    }

    function signUp(email, password, displayName) {
        const client = getClient();
        if (!client) throw new Error("Le client Supabase n’est pas disponible.");
        return client.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } },
        });
    }

    function signIn(email, password) {
        const client = getClient();
        if (!client) throw new Error("Le client Supabase n’est pas disponible.");
        return client.auth.signInWithPassword({ email, password });
    }

    return {
        createClient,
        getSession,
        onAuthStateChange,
        signOut,
        signUp,
        signIn,
    };
}

export function authErrorMessage(error, mode) {
    const code = String(error?.code || "").toLowerCase();
    const message = String(error?.message || "").toLowerCase();
    const details = `${code} ${message}`;

    if (
        details.includes("invalid login credentials") ||
        details.includes("invalid_credentials")
    ) {
        return "Adresse e-mail ou mot de passe incorrect.";
    }
    if (
        details.includes("email_not_confirmed") ||
        details.includes("email not confirmed")
    ) {
        return "Confirme ton adresse e-mail avec le lien reçu avant de te connecter.";
    }
    if (
        details.includes("weak_password") ||
        details.includes("password should be")
    ) {
        return "Le mot de passe ne respecte pas les exigences de sécurité. Choisis-en un autre.";
    }
    if (
        details.includes("user_already_exists") ||
        details.includes("user already registered") ||
        details.includes("email already registered")
    ) {
        return "Création impossible avec ces informations. Si tu as déjà un compte, essaie de te connecter.";
    }
    if (
        error?.status === 429 ||
        details.includes("rate limit") ||
        details.includes("too many requests")
    ) {
        return "Trop de tentatives. Attends quelques minutes avant de réessayer.";
    }
    if (
        details.includes("failed to fetch") ||
        details.includes("network") ||
        details.includes("fetch error")
    ) {
        return "Impossible de joindre Supabase. Vérifie ta connexion internet et réessaie.";
    }
    const action =
        mode === "signup"
            ? "Création du compte impossible."
            : "Connexion impossible.";
    const diagnostic = String(error?.message || "")
        .replace(/\s+/g, " ")
        .trim();
    return diagnostic
        ? `${action} ${diagnostic}`
        : `${action} Une erreur inattendue est survenue.`;
}
