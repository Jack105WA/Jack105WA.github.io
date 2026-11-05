import "./button-sound.js";
import { db } from "./firebase-config.js";
import {
    doc,
    runTransaction,
    increment
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const hitsElement = document.getElementById("nc-hits");
const updatedElement = document.getElementById("nc-last_updated");

const STATS_DOCUMENT = doc(db, "siteStats", "counters");
const GITHUB_COMMITS_API =
    "https://api.github.com/repos/Jack105WA/Jack105WA.github.io/commits?per_page=1";

function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new Error("GitHub returned an invalid commit date.");
    }

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

async function updateHits() {
    if (!hitsElement) return;

    try {
        // A transaction reads and increments the counter atomically.
        // The counter document must already exist in Firestore.
        const newHits = await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(STATS_DOCUMENT);

            if (!snapshot.exists()) {
                throw new Error(
                    'Firestore document "siteStats/counters" does not exist.'
                );
            }

            const currentHits = snapshot.data().hits;

            if (!Number.isInteger(currentHits) || currentHits < 0) {
                throw new Error("The Firestore hits value is not a valid integer.");
            }

            transaction.update(STATS_DOCUMENT, {
                hits: increment(1)
            });

            return currentHits + 1;
        });

        hitsElement.textContent = newHits.toLocaleString();
    } catch (error) {
        console.error("Could not update Firebase hit counter:", error);
        hitsElement.textContent = "Unavailable";
    }
}

async function updateLastUpdated() {
    if (!updatedElement) return;

    try {
        const response = await fetch(GITHUB_COMMITS_API, {
            headers: {
                Accept: "application/vnd.github+json"
            },
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("GitHub API returned HTTP " + response.status);
        }

        const commits = await response.json();
        const latestCommit = commits[0];
        const commitDate =
            latestCommit?.commit?.committer?.date ||
            latestCommit?.commit?.author?.date;

        if (!commitDate) {
            throw new Error("Latest GitHub commit date was not found.");
        }

        updatedElement.textContent = formatDate(commitDate);
    } catch (error) {
        console.error("Could not load latest GitHub commit date:", error);
        updatedElement.textContent = "Unavailable";
    }
}

// These run independently so a GitHub API issue cannot stop hit counting.
updateHits();
updateLastUpdated();
