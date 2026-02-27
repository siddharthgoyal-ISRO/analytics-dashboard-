// timeline.js
// Helpers for creating and displaying session coverage timelines

/**
 * Convert a string like "2026-047T12:34:56" (year-dayOfYear) into a Date object.
 * @param {string} str
 * @returns {Date}
 */
export function convertToDate(str) {
    const [year, rest] = str.split("-");
    const [dayOfYear, time] = rest.split("T");
    const date = new Date(year, 0);
    date.setDate(parseInt(dayOfYear));
    return new Date(date.toISOString().split("T")[0] + "T" + time);
}

export function renderSessionTimeline(container, data, showDetailsCallback) {
    if (!data || data.length === 0) return;

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
        const rawStart = item.REF_START_DATETIME || item.CMD_SSAR_START_DATETIME || item.CMD_LSAR_START_DATETIME;
        const rawEnd = item.REF_END_DATETIME || item.CMD_SSAR_END_DATETIME || item.CMD_LSAR_END_DATETIME;
        const start = convertToDate(rawStart);
        const end = convertToDate(rawEnd);
        if (!minStart || start < minStart) minStart = start;
        if (!maxEnd || end > maxEnd) maxEnd = end;
        return { ...item, start, end, rawStart, rawEnd };
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
        segment.style.background = `hsl(${(index * 45) % 360}, 65%, 55%)`;

        // show the config id as a centered label on the segment
        const cfg = item.SSAR_CONFIG_ID || item.LSAR_CONFIG_ID || "-";
        const label = document.createElement("div");
        label.textContent = cfg;
        label.style.position = "absolute";
        label.style.left = "50%";
        label.style.top = "50%";
        label.style.transform = "translate(-50%, -50%)";
        label.style.color = "white";
        label.style.fontWeight = "600";
        label.style.pointerEvents = "none";
        label.style.fontSize = "12px";
        segment.appendChild(label);
        segment.addEventListener("mousemove", (e) => {
            tooltip.style.display = "block";
            tooltip.style.left = e.pageX + 15 + "px";
            tooltip.style.top = e.pageY + 15 + "px";
            tooltip.innerHTML = `
        <strong>${item.REFOBS_ID}</strong><br>
        Start: ${item.rawStart || "-"}<br>
        End: ${item.rawEnd || "-"}<br>
        Config ID: ${cfg}
    `;
        });

        segment.addEventListener("mouseleave", () => {
            tooltip.style.display = "none";
        });

        segment.addEventListener("click", () => {
            if (typeof showDetailsCallback === "function") {
                showDetailsCallback(item);
            }
        });

        timelineBar.appendChild(segment);
    });

    timelineWrapper.appendChild(timelineBar);

    const detailsDiv = document.createElement("div");
    detailsDiv.id = "selectedObservationDetails";
    detailsDiv.style.marginTop = "30px";

    timelineWrapper.appendChild(detailsDiv);

    container.innerHTML = "";
    container.appendChild(timelineWrapper);
}
