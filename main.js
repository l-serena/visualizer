$(document).ready(function () {
    let svg = $("#us-map");
    let connectionsVisible = false;
    let organizationData = {}; 
    let stateScores = {};
    let minScore = 0;
    let maxScore = 0;
    
    const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQuXxHfMvZnJV1LwPEnNUOjlS4JAgVdgUtf95Lfn8EGDE-GtaRM0eaDsmy0IDEVabRF1P22j4pmVI8E/pub?gid=0&single=true&output=csv";

    const presetConnections = [
        { from: "NY", to: "MO" },
        { from: "CA", to: "TX" },
        { from: "FL", to: "OH" },
    ];
    
    function getStateCenter(stateId) {
    let state = $("#" + stateId);
    if (state.length === 0) return null;
    let bbox = state[0].getBBox();

    if (stateId !== 'FL') {
        return {
            x: bbox.x + bbox.width / 2,
            y: bbox.y + bbox.height / 2
        };
    } else {
        return {
            x: bbox.x + bbox.width / 2 + 40,
            y: bbox.y + bbox.height / 2
        };
    }
}

    function drawLine(state1, state2) {
        let pos1 = getStateCenter(state1);
        let pos2 = getStateCenter(state2);
        if (!pos1 || !pos2) return;

        let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", pos1.x);
        line.setAttribute("y1", pos1.y);
        line.setAttribute("x2", pos2.x);
        line.setAttribute("y2", pos2.y);
        line.setAttribute("stroke", "#FF0000");
        line.setAttribute("stroke-width", "2");
        line.setAttribute("class", "state-connection");

        svg.append(line);
    }

    $("#toggle-connections").click(function () {
        if (!connectionsVisible) {
            presetConnections.forEach(({ from, to }) => drawLine(from, to));
            $("#connections-info").slideDown();
            $(this).text("Clear Connections");
        } else {
            $(".state-connection").remove();
            $("#connections-info").slideUp();
            $(this).text("Show Connections");
        }
        connectionsVisible = !connectionsVisible;
    });

    function fetchGoogleSheetsData() {
        fetch(SHEET_CSV_URL)
            .then(response => response.text())
            .then(csvData => {
                let rows = csvData.split("\n").map(row => row.split(","));
                
                rows.slice(1).forEach(row => {
                    let organization = row[0]?.trim().toUpperCase().replace(/['"]+/g, ''); // Remove single/double quotes
                    let state = row[1]?.trim();
                    let industry = row[2]?.trim();
                    let c = parseFloat(row[3]?.trim());

                    if (state && organization && !isNaN(c) && industry) {
                        if (!organizationData[state]) {
                            organizationData[state] = [];
                        }
                        if (!stateScores[state]) {
                            stateScores[state] = 0;
                        }

                        organizationData[state].push(${organization}: <div display="inline" class="industry">${industry}</div>);
                        stateScores[state] += c;
                    }
                });

                minScore = Math.min(...Object.values(stateScores));
                maxScore = Math.max(...Object.values(stateScores));

                console.log("✅ Google Sheets data loaded successfully:", organizationData, stateScores);

                // ✅ Now apply colors AFTER data is ready
                applyStateColors();
            })
            .catch(error => {
                console.error("❌ Error fetching Google Sheets data:", error);
            });
    }

    function scaleToAlpha(score, minScore, maxScore) {
        if (maxScore === minScore) return 0.5; // Avoid division by zero
        return 0.2 + ((score - minScore) / (maxScore - minScore)) * 0.8; // Scale between 0.2 and 1
    }

    function applyStateColors() {
        $("path, circle").each(function () {
            let stateId = $(this).attr("id");

            if (stateId === "path58" || stateId === "circle60") {
                stateId = "DC";
            }

            if (stateScores[stateId] !== undefined) {
                let alpha = scaleToAlpha(stateScores[stateId], minScore, maxScore);
                let color = `rgba(33,95,154, ${alpha})`; // Blue with varying opacity
                $(this).css("fill", color);
            } else {
                $(this).css("fill", "rgba(200, 200, 200, 0.5)"); // Default light gray for missing states
            }
        });
    }

    fetchGoogleSheetsData();

    $("path, circle").hover(function () {
        let stateId = $(this).attr("id");
        if (stateId === "circle60") {
            stateId = "DC";
        }
        
        let info = $(this).attr("data-info") || `State: ${stateId}`;
        let orgList = organizationData[stateId] || [];

        let orgDetails = orgList.length > 0
            ? `<ul style="text-align:left;">${orgList.map(org => `<li>${org}</li>`).join("")}</ul>`
            : "<br><strong>No organizations listed.</strong>";

        $("#info-box").html(info + orgDetails);
    }, function () {
        $("#info-box").html("Hover over a state to see details");
    });
});
