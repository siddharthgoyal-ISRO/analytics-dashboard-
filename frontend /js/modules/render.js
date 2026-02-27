// render.js
// DOM rendering helpers for displaying results, errors, loading state, and session timelines

import { renderSessionTimeline } from "./timeline.js";

export function showError(container, message) {
    container.innerHTML = `<p class="error">${message}</p>`;
}

export function showLoading(container) {
    container.innerHTML = `<p class="loading">Loading...</p>`;
}

export function renderResults(container, result, paginationCallback) {
    const { data, total, page, per_page } = result;

    if (!data || data.length === 0) {
        showError(container, "No observations found.");
        return;
    }

    const outer = document.createElement("div");

    data.forEach(item => {
        const table = document.createElement("table");
        const headerRow = document.createElement("tr");
        headerRow.innerHTML = "<th>Attribute</th><th>Value</th>";
        table.appendChild(headerRow);

        const importantFields = [
            "REFOBS_ID",
            "CMD_LSAR_START_DATETIME",
            "CMD_LSAR_END_DATETIME",
            "DATATAKE_ID"
        ];

        const hiddenRows = [];

        importantFields.forEach(field => {
            if (item[field]) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${field}</td>
                    <td>${item[field]}</td>
                `;
                table.appendChild(row);
            }
        });

        Object.entries(item).forEach(([key, value]) => {
            if (!importantFields.includes(key)) {
                const row = document.createElement("tr");
                row.style.display = "none";
                row.innerHTML = `
                    <td>${key}</td>
                    <td>${value || "-"}</td>
                `;
                hiddenRows.push(row);
                table.appendChild(row);
            }
        });

        const toggleBtn = document.createElement("button");
        toggleBtn.textContent = "Show More";
        toggleBtn.style.marginTop = "10px";

        let expanded = false;
        toggleBtn.addEventListener("click", () => {
            expanded = !expanded;
            hiddenRows.forEach(row => {
                row.style.display = expanded ? "table-row" : "none";
            });
            toggleBtn.textContent = expanded ? "Show Less" : "Show More";
        });

        outer.appendChild(table);
        outer.appendChild(toggleBtn);
        outer.appendChild(document.createElement("br"));
        outer.appendChild(document.createElement("hr"));
    });

    // pagination controls
    const totalPages = Math.ceil(total / per_page);
    const paginationDiv = document.createElement("div");
    paginationDiv.style.marginTop = "20px";

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "Previous";
    prevBtn.disabled = page <= 1;
    prevBtn.onclick = () => paginationCallback(page - 1);

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next";
    nextBtn.disabled = page >= totalPages;
    nextBtn.onclick = () => paginationCallback(page + 1);

    const pageInfo = document.createElement("span");
    pageInfo.textContent = ` Page ${page} of ${totalPages} `;
    pageInfo.style.margin = "0 10px";

    paginationDiv.appendChild(prevBtn);
    paginationDiv.appendChild(pageInfo);
    paginationDiv.appendChild(nextBtn);

    container.innerHTML = "";
    container.appendChild(outer);
    container.appendChild(paginationDiv);
}

export function renderMultipleSessionTimelines(container, data, showDetailsCallback) {
    if (!data || data.length === 0) {
        showError(container, "No sessions found.");
        return;
    }

    container.innerHTML = "";
    const grouped = {};

    data.forEach(item => {
        const session = item.SESS_ID || "Unknown";
        if (!grouped[session]) {
            grouped[session] = [];
        }
        grouped[session].push(item);
    });

    Object.entries(grouped).forEach(([sessionId, obs]) => {
        const sessionTitle = document.createElement("h3");
        sessionTitle.textContent = `Session: ${sessionId}`;
        container.appendChild(sessionTitle);
        renderSessionTimeline(container, obs, showDetailsCallback);
    });
}

export function showObservationDetails(container, item) {
    const detailsDiv = container.querySelector("#selectedObservationDetails");
    if (!detailsDiv) return;
    detailsDiv.innerHTML = "";

    const table = document.createElement("table");
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = "<th>Attribute</th><th>Value</th>";
    table.appendChild(headerRow);

    Object.entries(item).forEach(([key, value]) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${key}</td>
            <td>${value || "-"}</td>
        `;
        table.appendChild(row);
    });
    detailsDiv.appendChild(table);
}
