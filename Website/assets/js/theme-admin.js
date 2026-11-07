import { auth, db, authPersistence } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

(() => {
    "use strict";

    const ADMIN_UID = "nJepqTOIsFUCyiNl4aGj4PRzZyJ3";
    const themeRef = doc(db, "siteSettings", "theme");
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
    const PRESETS = {
        classic: DEFAULTS,
        midnight: {
            backgroundTop: "#171b35", backgroundBottom: "#080b18",
            panel: "#292d49", panelBorder: "#11152b", accent: "#8c9eff",
            buttonTop: "#5967d8", buttonBottom: "#303a91", text: "#ffffff"
        },
        ocean: {
            backgroundTop: "#00a6b8", backgroundBottom: "#003c68",
            panel: "#12617a", panelBorder: "#07394f", accent: "#ffe082",
            buttonTop: "#00a6b8", buttonBottom: "#005b83", text: "#ffffff"
        },
        forest: {
            backgroundTop: "#347c50", backgroundBottom: "#102f28",
            panel: "#356b48", panelBorder: "#1b422b", accent: "#d9ed92",
            buttonTop: "#4c956c", buttonBottom: "#1b5e43", text: "#ffffff"
        },
        sunset: {
            backgroundTop: "#ef795b", backgroundBottom: "#592c62",
            panel: "#8d4c5c", panelBorder: "#512b43", accent: "#ffe08a",
            buttonTop: "#e56b55", buttonBottom: "#923e70", text: "#ffffff"
        }
    };

    const $ = (id) => document.getElementById(id);
    const fields = Object.keys(DEFAULTS);
    const inputs = Object.fromEntries(fields.map((field) => [field, $(`theme-${field}`)]));
    const form = $("theme-form");
    const preset = $("theme-preset");
    const status = $("theme-status");
    const saveButton = $("save-theme");
    const resetButton = $("reset-theme");

    if (!form || !preset || !status || fields.some((field) => !inputs[field])) {
        console.error("[Theme Admin] Theme controls are missing.");
        return;
    }

    let authorized = false;
    let saving = false;

    function setStatus(message) {
        status.textContent = message;
    }

    function currentTheme() {
        return Object.fromEntries(fields.map((field) => [field, inputs[field].value]));
    }

    function applyPreview(theme) {
        const root = document.documentElement;
        const vars = {
            backgroundTop: "--blue-top",
            backgroundBottom: "--blue-bottom",
            panel: "--brown",
            panelBorder: "--brown-border",
            accent: "--gold",
            buttonTop: "--button-top",
            buttonBottom: "--button-bottom",
            text: "--site-text"
        };

        for (const [key, variable] of Object.entries(vars)) {
            root.style.setProperty(variable, theme[key]);
        }
        root.dataset.customTheme = "true";
    }

    function fill(theme) {
        for (const field of fields) {
            inputs[field].value = theme[field] || DEFAULTS[field];
        }
        applyPreview(currentTheme());
    }

    function setDisabled(disabled) {
        form.querySelectorAll("input, select, button").forEach((element) => {
            element.disabled = disabled;
        });
    }

    async function loadTheme() {
        if (!authorized) return;
        setDisabled(true);
        setStatus("Loading the shared site theme...");

        try {
            const snapshot = await getDoc(themeRef);
            const data = snapshot.exists() && snapshot.data().custom === true
                ? snapshot.data()
                : DEFAULTS;
            fill(data);
            preset.value = "custom";
            setStatus(snapshot.exists() && snapshot.data().custom === true
                ? "Loaded the currently published theme."
                : "The default Geometry Dash theme is active.");
        } catch (error) {
            console.error("[Theme Admin] Load failed:", error);
            setStatus("Unable to load theme settings. Check Firestore read permissions.");
        } finally {
            setDisabled(!authorized);
        }
    }

    preset.addEventListener("change", () => {
        if (preset.value === "custom") return;
        fill(PRESETS[preset.value] || DEFAULTS);
        setStatus("Previewing preset. Save to publish it to everyone.");
    });

    for (const field of fields) {
        inputs[field].addEventListener("input", () => {
            preset.value = "custom";
            applyPreview(currentTheme());
            setStatus("Preview updated locally. Save to publish it to everyone.");
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!authorized || saving || auth.currentUser?.uid !== ADMIN_UID) return;

        saving = true;
        setDisabled(true);
        saveButton.textContent = "Publishing...";

        try {
            const theme = currentTheme();
            for (const [field, value] of Object.entries(theme)) {
                if (!/^#[0-9a-f]{6}$/i.test(value)) {
                    throw new Error("Choose a valid hex color for every theme field.");
                }
            }

            await setDoc(themeRef, {
                ...theme,
                custom: true,
                updatedAt: serverTimestamp(),
                updatedBy: auth.currentUser.uid
            });

            applyPreview(theme);
            setStatus("Theme published. It is now live for every visitor on every page.");
        } catch (error) {
            console.error("[Theme Admin] Save failed:", error);
            setStatus(error.message || "Unable to publish theme. Check Firestore write permissions.");
        } finally {
            saving = false;
            saveButton.textContent = "Publish Theme";
            setDisabled(!authorized);
        }
    });

    resetButton.addEventListener("click", async () => {
        if (!authorized || saving || auth.currentUser?.uid !== ADMIN_UID) return;
        saving = true;
        setDisabled(true);

        try {
            await setDoc(themeRef, {
                ...DEFAULTS,
                custom: false,
                updatedAt: serverTimestamp(),
                updatedBy: auth.currentUser.uid
            });
            fill(DEFAULTS);
            preset.value = "classic";
            setStatus("Default theme restored for every visitor.");
        } catch (error) {
            console.error("[Theme Admin] Reset failed:", error);
            setStatus(error.message || "Unable to reset the theme.");
        } finally {
            saving = false;
            setDisabled(!authorized);
        }
    });

    Promise.resolve(authPersistence).catch((error) => {
        console.error("[Theme Admin] Auth persistence failed:", error);
    }).finally(() => {
        onAuthStateChanged(auth, (user) => {
            authorized = Boolean(user && user.uid === ADMIN_UID);
            setDisabled(!authorized || saving);
            if (authorized) loadTheme();
            else setStatus("Sign in with the administrator account to edit the site theme.");
        });
    });
})();
