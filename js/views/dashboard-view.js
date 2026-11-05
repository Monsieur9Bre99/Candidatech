import { daysFromToday, dueLabel, fmtDate, today } from "../utils/date.js";
import { $ } from "../utils/dom.js";
import { escapeHtml } from "../utils/html.js";

export function createDashboardView({
    getData,
    statuses,
    activeStatuses,
    updateNavigationCount,
    renderApplicationRows,
}) {
    return function renderDashboard() {
        const apps = getData().applications;
        const active = apps.filter((application) =>
            activeStatuses.has(application.status),
        );
        const due = active
            .filter(
                (application) =>
                    application.dueDate && application.dueDate <= today(),
            )
            .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
        const interviews = apps.filter(
            (application) => application.status === "Entretien",
        ).length;
        const responses = apps.filter((application) =>
            [
                "Contacté",
                "Entretien",
                "Refus",
                "Offre obtenue",
                "Clôturée",
            ].includes(application.status),
        ).length;
        const sentToday = apps.filter(
            (application) =>
                application.date === today() &&
                [
                    "Envoyée",
                    "Contacté",
                    "Relance à faire",
                    "Entretien",
                    "Refus",
                    "Sans réponse",
                    "Offre obtenue",
                    "Clôturée",
                ].includes(application.status),
        ).length;

        $("#stat-active").textContent = active.length;
        $("#stat-followups").textContent = due.length;
        $("#stat-interviews").textContent = interviews;
        $("#stat-responses").textContent = responses;
        $("#today-sent").textContent = sentToday;
        $("#today-progress").style.width =
            `${Math.min(100, (sentToday / 5) * 100)}%`;
        updateNavigationCount(active.length);

        const actions = active
            .filter(
                (application) =>
                    application.dueDate || application.followupDate,
            )
            .sort((a, b) =>
                (a.dueDate || a.followupDate).localeCompare(
                    b.dueDate || b.followupDate,
                ),
            )
            .slice(0, 6);
        $("#upcoming-list").innerHTML = actions.length
            ? actions
                  .map((application) => {
                      const dueDate =
                          application.dueDate || application.followupDate;
                      const days = daysFromToday(dueDate);
                      return `<div class="action-item"><div><div class="action-title">${escapeHtml(application.nextAction || "Action à définir")}</div><div class="action-meta">${escapeHtml(application.company)} · ${escapeHtml(application.role)}</div></div><div class="action-due ${days < 0 ? "is-overdue" : days === 0 ? "is-today" : ""}">${escapeHtml(dueLabel(dueDate))}<br>${escapeHtml(fmtDate(dueDate))}</div></div>`;
                  })
                  .join("")
            : `<div class="empty-state">Aucune échéance enregistrée.<br>Ajoute une prochaine action à tes candidatures actives.</div>`;

        const counts = statuses
            .map((status) => ({
                status,
                count: apps.filter(
                    (application) => application.status === status,
                ).length,
            }))
            .filter((entry) => entry.count > 0);
        $("#status-breakdown").innerHTML = counts.length
            ? counts
                  .map(
                      ({ status, count }) =>
                          `<div class="breakdown-row"><span>${escapeHtml(status)}</span><strong>${count}</strong><div class="mini-track"><span style="width:${Math.max(4, (count / apps.length) * 100)}%"></span></div></div>`,
                  )
                  .join("")
            : `<div class="empty-state">Les statuts apparaîtront ici dès tes premières candidatures.</div>`;

        $("#recent-list").innerHTML = renderApplicationRows(
            [...apps]
                .sort((a, b) =>
                    (b.updatedAt || "").localeCompare(a.updatedAt || ""),
                )
                .slice(0, 5),
            true,
        );
    };
}
