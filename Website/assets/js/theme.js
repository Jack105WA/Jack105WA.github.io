import { db } from "./firebase-config.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

(() => {
    "use strict";

    const DEFAULTS = {
    "backgroundTop": "#0065fd",
    "backgroundBottom": "#002e73",
    "panel": "#995533",
    "panelBorder": "#63351e",
    "accent": "#ffc800",
    "buttonTop": "#0065fd",
    "buttonBottom": "#002e73",
    "text": "#ffffff"
};
    const FIELDS = {
        backgroundTop: "--blue-top",
        backgroundBottom: "--blue-bottom",
        panel: "--brown",
        panelBorder: "--brown-border",
        accent: "--gold",
        buttonTop: "--button-top",
        buttonBottom: "--button-bottom",
        text: "--site-text"
    };
    const root = document.documentElement;

    function validColor(value, fallback) {
        return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
            ? value
            : fallback;
    }

    function applyTheme(data) {
        const isCustom = data && data.custom === true;

        for (const [key, variable] of Object.entries(FIELDS)) {
            const value = isCustom
                ? validColor(data[key], DEFAULTS[key])
                : DEFAULTS[key];

            root.style.setProperty(variable, value);
        }

        root.dataset.customTheme = isCustom ? "true" : "false";
    }

    applyTheme(null);

    onSnapshot(
        doc(db, "siteSettings", "theme"),
        (snapshot) => applyTheme(snapshot.exists() ? snapshot.data() : null),
        (error) => console.error("[Site Theme] Failed to load shared theme:", error)
    );
})();
