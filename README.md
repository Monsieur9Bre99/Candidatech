
<p style="text-align: center; margin:" align="center">
  <pre style="background-color:#267a61; ; color:white; padding:24px 12px; border-radius:8px; font-family:'Lucida Console',Monaco,monospace; font-size:18px; line-height:12px; letter-spacing: 2px; overflow-x:auto;">
╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋

╭━━━╮━━━╮━╮╋╭╮━━━╮━━╮━━━╮━━━╮━━━━╮━━━╮━━━╮╮╋╭╮
┃╭━╮┃╭━╮┃┃╰╮┃┃╮╭╮┃┫┣╯╮╭╮┃╭━╮┃╭╮╭╮┃╭━━╯╭━╮┃┃╋┃┃
┃┃╋╰╯┃╋┃┃╭╮╰╯┃┃┃┃┃┃┃╋┃┃┃┃┃╋┃┃╯┃┃╰╯╰━━╮┃╋╰╯╰━╯┃
┃┃╋╭╮╰━╯┃┃╰╮┃┃┃┃┃┃┃┃╋┃┃┃┃╰━╯┃╋┃┃╋╋╭━━╯┃╋╭╮╭━╮┃
┃╰━╯┃╭━╮┃┃╋┃┃┃╯╰╯┃┫┣╮╯╰╯┃╭━╮┃╭╯╰╮╋╰━━╮╰━╯┃┃╋┃┃
╰━━━╯╯╋╰╯╯╋╰━╯━━━╯━━╯━━━╯╯╋╰╯╰━━╯╋━━━╯━━━╯╯╋╰╯
╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋
╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋╋
</pre>
</p>

</p>
  <p align="center">
  <img src="https://img.shields.io/badge/Version-V0-355f9e?style=for-the-badge" alt="Version 0">
  <img src="https://img.shields.io/badge/HTML5-Structure-e34f26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-Styles-1572b6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-Natif-f7df1e?style=for-the-badge&logo=javascript&logoColor=222" alt="JavaScript natif">
  <img src="https://img.shields.io/badge/Supabase-Database-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase Database">
</p>

<p align="center">
  <em>Un espace simple pour suivre ses candidatures, ses relances et ses entreprises cibles.</em>
</p>

---


## À propos

**Candidatech** est une application web de suivi des candidatures et de prospection d'entreprises.

Créée pour un usage personnel, elle a pour objectif de rendre le suivi des candidatures plus clair, plus structuré et plus facile à tenir à jour, notamment dans le cadre d'une recherche d'alternance ou d'emploi.

Le projet s'inspire de mon classeur « Tableau suivi candidatures & Benchmark » : il reprend les informations utiles de ce document et les rassemble dans une application web accessible directement depuis le navigateur.

## Démonstration

**Démo en ligne :** [Accéder à Candidatech](#)

## Aperçu

## Fonctionnalités

## Données et limites

## Structure du projet

Le JavaScript natif utilise des modules ES organisés par responsabilité. Aucun bundler n’est nécessaire : `index.html` charge `js/main.js` comme module, ce qui convient à un déploiement statique tel que GitHub Pages.

```text
js/
├── main.js                        # Point d’entrée de l’application
├── landing.js                      # Point d’entrée du thème de la landing page
├── application.js                 # Composition de l’interface et gestion des interactions
├── components/
│   ├── theme-toggle.js             # Bascule claire/sombre réutilisable
│   └── toast.js                   # Notifications
├── config/
│   └── supabase-config.js         # Configuration du client Supabase
├── services/
│   ├── application-store.js       # État et synchronisation local/Supabase
│   ├── backup-service.js          # Import/export JSON et CSV
│   ├── local-data-service.js      # Persistance locale
│   ├── record-mappers.js          # Conversion des modèles locaux et Supabase
│   ├── supabase-auth-service.js   # Authentification
│   ├── supabase-data-service.js   # Lecture et mutations distantes
│   └── theme-service.js           # Préférence de thème partagée
├── utils/
│   ├── date.js                    # Dates et échéances
│   ├── dom.js                     # Sélecteurs DOM
│   ├── html.js                    # Échappement HTML et validation d’URL
│   └── id.js                      # Identifiants
└── views/
    ├── dashboard-view.js          # Tableau de bord
    ├── record-list-view.js        # Listes et filtres
    └── record-view.js             # Lignes et fiches détaillées
```

`application.js` conserve l’orchestration de l’interface ; l’état partagé, la persistance locale et les transitions local/Supabase sont délégués à `services/application-store.js`. Les accès au stockage, les conversions, l’authentification, les imports/exports et les rendus restent isolés dans leurs modules dédiés. Le thème est piloté par le même service et le même composant sur la landing page et dans l’application. Les services Supabase vérifient les résultats des opérations avant que l’interface annonce un succès.

Les lignes de candidature et d’entreprise présentent des actions distinctes (consulter, modifier et supprimer), avec des icônes accessibles. Les fiches restent en lecture seule jusqu’à l’action explicite de modification. Les initiales servent de repère visuel sans dépendre de logos récupérés à l’extérieur.

<p align="center">
  <sub>&copy; 2026 - candidatech Un projet en cours, construit pour rendre la recherche d'emploi/alternance/stage plus simple à suivre.</sub>
</p>
