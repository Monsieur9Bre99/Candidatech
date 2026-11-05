import { dueLabel, daysFromToday, fmtDate } from "../utils/date.js";
import { escapeHtml, safeUrl } from "../utils/html.js";

export function statusPill(status) {
    return `<span class="status-pill" data-status="${escapeHtml(status)}">${escapeHtml(status || "Non renseigné")}</span>`;
}

function initials(value) {
    return String(value || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0] || "")
        .join("")
        .toLocaleUpperCase("fr");
}

function recordIdentity(primary, secondary = "") {
    return `<div class="record-identity"><span class="record-avatar" aria-hidden="true">${escapeHtml(initials(primary))}</span><span><strong>${escapeHtml(primary)}</strong>${secondary ? `<small>${escapeHtml(secondary)}</small>` : ""}</span></div>`;
}

function actionButton(type, id, action, label, icon) {
    return `<button type="button" class="icon-action icon-action-${action}" data-${action}-${type}="${escapeHtml(id)}" aria-label="${label}" title="${label}"><i class="fa-solid ${icon}" aria-hidden="true"></i></button>`;
}

function recordActions(type, id) {
    const actions = [
        ["view", "Consulter", "fa-eye"],
        ["edit", "Modifier", "fa-pen"],
        ["delete", "Supprimer", "fa-trash"],
    ];
    return `<div class="table-actions">${actions
        .map(([action, label, icon]) =>
            actionButton(type, id, action, label, icon),
        )
        .join("")}</div>`;
}

export function appRows(items, compact = false) {
    if (!items.length) {
        return `<div class="empty-state">Aucune candidature pour le moment.<br>Ajoute ta première candidature pour commencer le suivi.</div>`;
    }

    if (compact) {
        return `<table><thead><tr><th>Entreprise / poste</th><th>Statut</th><th>Prochaine action</th><th></th></tr></thead><tbody>${items
            .map(
                (record) =>
                    `<tr><td>${recordIdentity(record.company, record.role)}</td><td>${statusPill(record.status)}</td><td>${escapeHtml(record.nextAction || "À définir")}<small>${record.dueDate ? escapeHtml(dueLabel(record.dueDate)) : "Sans échéance"}</small></td><td>${actionButton("app", record.id, "view", "Consulter la candidature", "fa-eye")}</td></tr>`,
            )
            .join("")}</tbody></table>`;
    }

    return `<table>
        <thead>
            <tr>
                <th>Entreprise / poste</th><th>Candidature</th>
                <th>Contrat</th><th>Statut</th>
                <th>Prochaine action</th><th><span class="sr-only">Actions</span></th>
            </tr>
        </thead>
        <tbody>${items
            .map((record) => {
                const url = safeUrl(record.url);
                const dueDays = daysFromToday(record.dueDate);
                return `<tr>
                    <td>${recordIdentity(record.company, record.role)}${url ? `<small><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Voir l’offre ↗</a></small>` : ""}</td>
                    <td>${escapeHtml(fmtDate(record.date))}<small>${escapeHtml(record.channel || "")}</small></td>
                    <td>${escapeHtml(record.contract || "À vérifier")}</td>
                    <td>${statusPill(record.status)}</td>
                    <td>${escapeHtml(record.nextAction || "À définir")}<small class="${dueDays < 0 ? "overdue" : ""}">${record.dueDate ? escapeHtml(dueLabel(record.dueDate)) : "Sans échéance"} · ${escapeHtml(fmtDate(record.dueDate))}</small></td>
                    <td>${recordActions("app", record.id)}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
    </table>`;
}

export function companyRows(items) {
    if (!items.length) {
        return `<div class="empty-state">Aucune entreprise cible pour le moment.<br>Ajoute des entreprises même si tu n’as pas encore trouvé d’offre.</div>`;
    }

    return `<table>
        <thead>
            <tr>
                <th>Entreprise</th><th>Secteur / localisation</th>
                <th>Contrat pro</th><th>Prospection</th>
                <th>Prochaine action</th><th><span class="sr-only">Actions</span></th>
            </tr>
        </thead>
        <tbody>${items
            .map((company) => {
                const careerUrl = safeUrl(company.career);
                return `<tr>
                    <td>${recordIdentity(company.name)}${careerUrl ? `<small><a href="${escapeHtml(careerUrl)}" target="_blank" rel="noopener noreferrer">Site carrière ↗</a></small>` : ""}${company.contact ? `<small>Contact : ${escapeHtml(company.contact)}</small>` : ""}</td>
                    <td>${escapeHtml(company.sector || "—")}<small>${escapeHtml(company.location || "")}</small></td>
                    <td>${escapeHtml(company.contract || "À vérifier")}</td>
                    <td>${statusPill(company.status)}</td>
                    <td>${escapeHtml(company.action || "À définir")}<small>Vérifié le ${escapeHtml(fmtDate(company.verified))}</small></td>
                    <td>${recordActions("company", company.id)}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
    </table>`;
}

function detailField(label, value) {
    return `<div class="detail-item"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "—")}</dd></div>`;
}

function detailLinkField(label, value) {
    const url = safeUrl(value);
    const link = url
        ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`
        : "—";
    return `<div class="detail-item"><dt>${escapeHtml(label)}</dt><dd>${link}</dd></div>`;
}

export function renderApplicationDetails(record) {
    return `<dl class="record-details">
        ${detailField("Entreprise", record.company)}
        ${detailField("Intitulé du poste", record.role)}
        ${detailField("Date de candidature", fmtDate(record.date))}
        ${detailLinkField("Lien de l’offre", record.url)}
        ${detailField("Type de contrat", record.contract)}
        ${detailField("CV utilisé / version", record.cv)}
        ${detailField("Canal", record.channel)}
        ${detailField("Contact / recruteur", record.contact)}
        ${detailField("Statut", record.status)}
        ${detailField("Date de contact", fmtDate(record.contactDate))}
        ${detailField("Date de relance prévue", fmtDate(record.followupDate))}
        ${detailField("Date de relance faite", fmtDate(record.followupDone))}
        ${detailField("Prochaine action", record.nextAction)}
        ${detailField("Échéance de la prochaine action", fmtDate(record.dueDate))}
        ${detailField("Retour / notes", record.notes)}
    </dl>`;
}

export function renderCompanyDetails(record) {
    return `<dl class="record-details">
        ${detailField("Entreprise", record.name)}
        ${detailField("Secteur / activité", record.sector)}
        ${detailField("Localisation", record.location)}
        ${detailLinkField("Site carrière", record.career)}
        ${detailField("Métiers / équipes à cibler", record.teams)}
        ${detailField("Offres repérées", record.offers)}
        ${detailField("Compatibilité du contrat", record.contract)}
        ${detailField("Contact / interlocuteur", record.contact)}
        ${detailLinkField("Lien LinkedIn du contact", record.linkedin)}
        ${detailField("Date de vérification", fmtDate(record.verified))}
        ${detailField("Action prévue", record.action)}
        ${detailField("Statut de prospection", record.status)}
        ${detailField("Notes", record.notes)}
    </dl>`;
}
