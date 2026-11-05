import { $ } from "../utils/dom.js";

export function createRecordListView({
    getData,
    activeStatuses,
    renderApplicationRows,
    renderCompanyRows,
    updateNavigationCount,
}) {
    function renderApplications() {
        const query = $("#app-search").value.toLocaleLowerCase("fr");
        const status = $("#status-filter").value;
        const contract = $("#contract-filter").value;
        const items = [...getData().applications]
            .filter(
                (application) =>
                    `${application.company} ${application.role} ${application.contact} ${application.notes}`
                        .toLocaleLowerCase("fr")
                        .includes(query) &&
                    (!status || application.status === status) &&
                    (!contract || application.contract === contract),
            )
            .sort((a, b) =>
                (a.dueDate || "9999").localeCompare(b.dueDate || "9999"),
            );
        $("#applications-table").innerHTML =
            renderApplicationRows(items);
        updateNavigationCount(
            getData().applications.filter((application) =>
                activeStatuses.has(application.status),
            ).length,
        );
    }

    function renderCompanies() {
        const query = $("#company-search").value.toLocaleLowerCase("fr");
        const contract = $("#company-contract-filter").value;
        const items = getData().companies.filter(
            (company) =>
                `${company.name} ${company.sector} ${company.location} ${company.teams} ${company.notes}`
                    .toLocaleLowerCase("fr")
                    .includes(query) &&
                (!contract || company.contract === contract),
        );
        $("#companies-table").innerHTML = renderCompanyRows(items);
    }

    return { renderApplications, renderCompanies };
}
