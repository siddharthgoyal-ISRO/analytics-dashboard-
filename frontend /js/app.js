class ObservationsApp extends HTMLElement {
    constructor() {
        super();
        this.currentPage = 1;
        this.currentPattern = "";
    }

    connectedCallback() {
        this.innerHTML = `
<div class="container">
    <h2>Observation Search</h2>

    <div class="search-box">
        <select id="filterType">
            <option value="observation">Observation ID</option>
            <option value="session">Session ID</option>
            <option value="start">CMD Start Time</option>
            <option value="end">CMD End Time</option>
            <option value="config">Config ID</option>
        </select>

        <input type="text" id="mainSearchInput" placeholder="Enter Observation ID">
        <button id="searchBtn">Search</button>
    </div>

    <div id="result"></div>
</div>
`;

        this.resultDiv = this.querySelector("#result");
        this.filterType = this.querySelector("#filterType");
        this.mainInput = this.querySelector("#mainSearchInput");
        this.searchBtn = this.querySelector("#searchBtn");

        this.searchBtn.addEventListener("click", () => this.performSearch());
        this.filterType.addEventListener("change", () => this.updatePlaceholder());
    }

    updatePlaceholder() {
        const value = this.filterType.value;

        if (value === "observation") {
            this.mainInput.placeholder = "Enter Observation ID (supports * ?)";
        } else if (value === "session") {
            this.mainInput.placeholder = "Enter Session ID (supports * ?)";
        } else if (value === "start") {
            this.mainInput.placeholder = "Enter CMD Start Time (e.g. 2026-047)";
        } else if (value === "end") {
            this.mainInput.placeholder = "Enter CMD End Time";
        } else if (value === "config") {
            this.mainInput.placeholder = "Enter Config ID (e.g. 254)";
        }
    }

    async performSearch() {
        const value = this.mainInput.value.trim();
        const type = this.filterType.value;

        if (!value) {
            this.showError("Please enter a value.");
            return;
        }

        this.showLoading();

        try {
            let url = "";

            if (type === "observation") {
                url = `/api/observation?pattern=${encodeURIComponent(value)}`;
            } else if (type === "session") {
                url = `/api/session?session_id=${encodeURIComponent(value)}`;
            } else if (type === "config") {
                url = `/api/observation?config=${encodeURIComponent(value)}`;
            } else if (type === "start") {
                url = `/api/observation?start=${encodeURIComponent(value)}`;
            } else if (type === "end") {
                url = `/api/observation?end=${encodeURIComponent(value)}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("Server error");
            }

            const result = await response.json();

            if (type === "session") {
                if (!result.data || result.data.length === 0) {
                    this.showError("No session found.");
                    return;
                }
                this.renderMultipleSessionTimelines(result.data);
            } else {
                if (!result.data || result.data.length === 0) {
                    this.showError("No observations found.");
                    return;
                }
                this.renderResults(result);
            }
        } catch (error) {
            console.error(error);
            this.showError("Something went wrong.");
        }
    }

    renderMultipleSessionTimelines(data) {
        if (!data || data.length === 0) {
            this.showError("No sessions found.");
            return;
        }

        this.resultDiv.innerHTML = "";
        const grouped = {};

        data.forEach(item => {
            const session = item.SESS_ID || "Unknown";
            if (!grouped[session]) {
                grouped[session] = [];
            }
            grouped[session].push(item);
        });

        Object.entries(grouped).forEach(([sessionId, observations]) => {
            const sessionTitle = document.createElement("h3");
            sessionTitle.textContent = `Session: ${sessionId}`;
            this.resultDiv.appendChild(sessionTitle);
            this.renderSessionTimeline(observations);
        });
    }

    renderSessionTimeline(data) {
        if (!data || data.length === 0) return;

        function convertToDate(str) {
            const [year, rest] = str.split("-");
            const [dayOfYear, time] = rest.split("T");
            const date = new Date(year, 0);
            date.setDate(parseInt(dayOfYear));
            return new Date(date.toISOString().split("T")[0] + "T" + time);
        }

        const timelineWrapper = document.createElement("div");
        timelineWrapper.style.marginTop = "40px";

        const title = document.createElement("h3");
        title.textContent = "Session Coverage Timeline";
        timelineWrapper.appendChild(title);

        const timelineBar = document.createElement("div");
        timelineBar.style.position = "relative";
        timelineBar.style.height = "50px";
        timelineBar.style.width = "100%";
        timelineBar.style.background = "#ddd";
        timelineBar.style.borderRadius = "8px";
        timelineBar.style.overflow = "hidden";

        let minStart = null;
        let maxEnd = null;

        const parsed = data.map(item => {
            const start = convertToDate(item.CMD_SSAR_START_DATETIME);
            const end = convertToDate(item.CMD_SSAR_END_DATETIME);
            if (!minStart || start < minStart) minStart = start;
            if (!maxEnd || end > maxEnd) maxEnd = end;
            return { ...item, start, end };
        });

        const totalDuration = maxEnd - minStart;
        const tooltip = document.createElement("div");
        tooltip.style.position = "absolute";
        tooltip.style.background = "rgba(0,0,0,0.85)";
        tooltip.style.color = "white";
        tooltip.style.padding = "8px 12px";
        tooltip.style.borderRadius = "6px";
        tooltip.style.fontSize = "13px";
        tooltip.style.pointerEvents = "none";
        tooltip.style.display = "none";
        tooltip.style.zIndex = "1000";

        document.body.appendChild(tooltip);

        parsed.forEach((item, index) => {
            const leftPercent = ((item.start - minStart) / totalDuration) * 100;
            const widthPercent = ((item.end - item.start) / totalDuration) * 100;
            const segment = document.createElement("div");
            segment.style.position = "absolute";
            segment.style.left = leftPercent + "%";
            segment.style.width = widthPercent + "%";
            segment.style.height = "100%";
            segment.style.cursor = "pointer";

            if (item.SSAR_CONFIG_ID == 254 || item.SSAR_CONFIG_ID == 255) {
                segment.style.background = "red";
            } else {
                segment.style.background = `hsl(${index * 50}, 70%, 50%)`;
            }
            segment.addEventListener("mousemove", (e) => {
                tooltip.style.display = "block";
                tooltip.style.left = e.pageX + 15 + "px";
                tooltip.style.top = e.pageY + 15 + "px";
                tooltip.innerHTML = `
        <strong>${item.REFOBS_ID}</strong><br>
        Start: ${item.CMD_SSAR_START_DATETIME}<br>
        End: ${item.CMD_SSAR_END_DATETIME}<br>
        Config ID: ${item.SSAR_CONFIG_ID || "-"}
    `;
            });

            segment.addEventListener("mouseleave", () => {
                tooltip.style.display = "none";
            });

            segment.addEventListener("click", () => {
                this.showObservationDetails(item);
            });

            timelineBar.appendChild(segment);
        });

        timelineWrapper.appendChild(timelineBar);

        const detailsDiv = document.createElement("div");
        detailsDiv.id = "selectedObservationDetails";
        detailsDiv.style.marginTop = "30px";

        timelineWrapper.appendChild(detailsDiv);

        this.resultDiv.innerHTML = "";
        this.resultDiv.appendChild(timelineWrapper);
    }

    showObservationDetails(item) {
        const detailsDiv = this.resultDiv.querySelector("#selectedObservationDetails");
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

    renderResults(result) {
        const { data, total, page, per_page } = result;

        if (data.length === 0) {
            this.showError("No observations found.");
            return;
        }

        const container = document.createElement("div");

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

            container.appendChild(table);
            container.appendChild(toggleBtn);
            container.appendChild(document.createElement("br"));
            container.appendChild(document.createElement("hr"));
        });

        const totalPages = Math.ceil(total / per_page);
        const paginationDiv = document.createElement("div");
        paginationDiv.style.marginTop = "20px";

        const prevBtn = document.createElement("button");
        prevBtn.textContent = "Previous";
        prevBtn.disabled = page <= 1;
        prevBtn.onclick = () => this.fetchObservation(page - 1);

        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next";
        nextBtn.disabled = page >= totalPages;
        nextBtn.onclick = () => this.fetchObservation(page + 1);

        const pageInfo = document.createElement("span");
        pageInfo.textContent = ` Page ${page} of ${totalPages} `;
        pageInfo.style.margin = "0 10px";

        paginationDiv.appendChild(prevBtn);
        paginationDiv.appendChild(pageInfo);
        paginationDiv.appendChild(nextBtn);

        this.resultDiv.innerHTML = "";
        this.resultDiv.appendChild(container);
        this.resultDiv.appendChild(paginationDiv);
    }

    showError(message) {
        this.resultDiv.innerHTML = `<p class="error">${message}</p>`;
    }

    showLoading() {
        this.resultDiv.innerHTML = `<p class="loading">Loading...</p>`;
    }

    async fetchObservation(page) {
        // Helper for pagination; stores current pattern and page
        const value = this.mainInput.value.trim();
        const type = this.filterType.value;

        if (!value) {
            this.showError("Please enter a value.");
            return;
        }

        this.showLoading();

        try {
            let url = "";
            if (type === "observation") {
                url = `/api/observation?pattern=${encodeURIComponent(value)}&page=${page}`;
            } else if (type === "session") {
                // pagination not used for session detail
                return;
            } else if (type === "config") {
                url = `/api/observation?config=${encodeURIComponent(value)}&page=${page}`;
            } else if (type === "start") {
                url = `/api/observation?start=${encodeURIComponent(value)}&page=${page}`;
            } else if (type === "end") {
                url = `/api/observation?end=${encodeURIComponent(value)}&page=${page}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error("Server error");
            const result = await response.json();
            this.renderResults(result);
        } catch (error) {
            console.error(error);
            this.showError("Something went wrong.");
        }
    }
}

customElements.define('observations-app', ObservationsApp);
