import { buildUrl, fetchJson } from "./modules/search.js";
import {
    showError,
    showLoading,
    renderResults,
    renderMultipleSessionTimelines,
    showObservationDetails as renderObservationDetails
} from "./modules/render.js";

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
            <option value="imaging">Imaging Time</option>
            <option value="config">Config ID</option>
        </select>

        <div id="inputContainer" style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="mainSearchInput" placeholder="Enter Observation ID">
            <div id="imagingInputs" style="display:none; gap:6px; align-items:center;">
                <input type="text" id="imgYear" placeholder="Year (e.g. 2026)" size="6">
                <input type="text" id="imgMonth" placeholder="Month (1-12)" size="3">
                <input type="text" id="imgDay" placeholder="Day" size="3">
                <input type="text" id="imgTime" placeholder="Time (HH:MM)" size="6">
            </div>
            <button id="searchBtn">Search</button>
        </div>
    </div>

    <div id="result"></div>
</div>
`;

        this.resultDiv = this.querySelector("#result");
        this.filterType = this.querySelector("#filterType");
        this.mainInput = this.querySelector("#mainSearchInput");
        this.imagingInputs = this.querySelector("#imagingInputs");
        this.imgYear = this.querySelector("#imgYear");
        this.imgMonth = this.querySelector("#imgMonth");
        this.imgDay = this.querySelector("#imgDay");
        this.imgTime = this.querySelector("#imgTime");
        this.searchBtn = this.querySelector("#searchBtn");

        this.searchBtn.addEventListener("click", () => this.performSearch());
        this.filterType.addEventListener("change", () => this.updatePlaceholder());
    }

    updatePlaceholder() {
        const value = this.filterType.value;

        if (value === "observation") {
            this.mainInput.style.display = "";
            this.imagingInputs.style.display = "none";
            this.mainInput.placeholder = "Enter Observation ID (supports * ?)";
        } else if (value === "session") {
            this.mainInput.style.display = "";
            this.imagingInputs.style.display = "none";
            this.mainInput.placeholder = "Enter Session ID (supports * ?)";
        } else if (value === "imaging") {
            this.mainInput.style.display = "none";
            this.imagingInputs.style.display = "flex";
        } else if (value === "config") {
            this.mainInput.style.display = "";
            this.imagingInputs.style.display = "none";
            this.mainInput.placeholder = "Enter Config ID (e.g. 254)";
        }
    }

    async performSearch() {
        const type = this.filterType.value;
        let value = "";

        if (type === "imaging") {
            const y = this.imgYear.value.trim();
            const m = this.imgMonth.value.trim();
            const d = this.imgDay.value.trim();
            const t = this.imgTime.value.trim();
            if (!y && !m && !d && !t) {
                showError(this.resultDiv, "Please enter at least one imaging field.");
                return;
            }
            if (y && m && d) {
                const mm = parseInt(m, 10) - 1;
                const dd = parseInt(d, 10);
                const date = new Date(parseInt(y, 10), mm, dd);
                const start = new Date(parseInt(y, 10), 0, 0);
                const diff = date - start;
                const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
                const doy = String(dayOfYear).padStart(3, "0");
                value = `${y}-${doy}` + (t ? `T${t}` : "");
            } else {
                value = `${y}${y && m ? "-" : ""}${m}${(y||m) && d ? "-" : ""}${d}${t ? `T${t}` : ""}`;
            }
        } else {
            value = this.mainInput.value.trim();
        }

        if (!value) {
            showError(this.resultDiv, "Please enter a value.");
            return;
        }

        showLoading(this.resultDiv);

        try {
            const url = buildUrl(type, value);
            const result = await fetchJson(url);

            if (type === "session") {
                if (!result.data || result.data.length === 0) {
                    showError(this.resultDiv, "No session found.");
                    return;
                }
                renderMultipleSessionTimelines(
                    this.resultDiv,
                    result.data,
                    item => renderObservationDetails(this.resultDiv, item)
                );
            } else {
                if (!result.data || result.data.length === 0) {
                    showError(this.resultDiv, "No observations found.");
                    return;
                }
                renderResults(this.resultDiv, result, page => this.fetchObservation(page));
            }
        } catch (error) {
            console.error(error);
            showError(this.resultDiv, "Something went wrong.");
        }
    }

    async fetchObservation(page) {
        const type = this.filterType.value;
        let value = "";

        if (type === "imaging") {
            const y = this.imgYear.value.trim();
            const m = this.imgMonth.value.trim();
            const d = this.imgDay.value.trim();
            const t = this.imgTime.value.trim();
            if (y && m && d) {
                const mm = parseInt(m, 10) - 1;
                const dd = parseInt(d, 10);
                const date = new Date(parseInt(y, 10), mm, dd);
                const start = new Date(parseInt(y, 10), 0, 0);
                const diff = date - start;
                const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
                const doy = String(dayOfYear).padStart(3, "0");
                value = `${y}-${doy}` + (t ? `T${t}` : "");
            } else {
                value = `${y}${y && m ? "-" : ""}${m}${(y||m) && d ? "-" : ""}${d}${t ? `T${t}` : ""}`;
            }
        } else {
            value = this.mainInput.value.trim();
        }

        if (!value) {
            showError(this.resultDiv, "Please enter a value.");
            return;
        }

        showLoading(this.resultDiv);

        try {
            const url = buildUrl(type, value, page);
            const result = await fetchJson(url);
            renderResults(this.resultDiv, result, p => this.fetchObservation(p));
        } catch (error) {
            console.error(error);
            showError(this.resultDiv, "Something went wrong.");
        }
    }
}

customElements.define('observations-app', ObservationsApp);
