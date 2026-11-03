(async function loadNeocitiesStats() {
    const views = document.getElementById("nc-views");
    const hits = document.getElementById("nc-hits");
    const update = document.getElementById("nc-last_updated");

    if (!views || !hits) {
        console.error("Neocities stats elements not found.");
        return;
    }

    const apiURL = "https://neocities.org/api/info?sitename=jack105wa";

    try {
        const response = await fetch(
            "https://proxy.cors.dev/" + apiURL,
            { credentials: "omit" }
        );

        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }

        const data = await response.json();

        if (data.result !== "success" || !data.info) {
            throw new Error("Neocities API returned an invalid response.");
        }

        views.textContent = Number(data.info.views).toLocaleString();
        hits.textContent = Number(data.info.hits).toLocaleString();

        if (update) {
            const lastUpdated = data.info.last_updated;

            if (lastUpdated) {
                const date = new Date(lastUpdated);

                update.textContent = "Last Updated: " +
                    date.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true
                    });
            } else {
                update.textContent = "Last Updated: Unavailable";
            }
        }
    } catch (error) {
        console.error("Could not load Neocities statistics:", error);

        views.textContent = "Unavailable";
        hits.textContent = "Unavailable";

        if (update) {
            update.textContent = "Last Updated: Unavailable";
        }
    }
})();