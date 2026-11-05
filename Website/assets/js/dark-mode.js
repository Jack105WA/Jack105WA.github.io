(() => {
    "use strict";
    const COOKIE_NAME = "jack105wa-theme";
    const COOKIE_DAYS = 365;

    function readPreference() {
        const match = document.cookie.match(new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]*)"));
        return match ? decodeURIComponent(match[1]) : "light";
    }

    function savePreference(theme) {
        const expires = new Date(Date.now() + COOKIE_DAYS * 864e5).toUTCString();
        document.cookie = COOKIE_NAME + "=" + encodeURIComponent(theme) +
            "; expires=" + expires + "; path=/; SameSite=Lax";
    }

    function applyTheme(theme) {
        const isDark = theme === "dark";
        document.documentElement.dataset.theme = isDark ? "dark" : "light";
        const toggle = document.getElementById("theme-toggle");
        if (toggle) {
            toggle.setAttribute("aria-pressed", String(isDark));
            toggle.textContent = isDark ? "Light Mode" : "Dark Mode";
            toggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
        }
    }

    function initialize() {
        const sidebar = document.querySelector(".sidebar-panel");
        const navigation = sidebar?.querySelector(".sidebar-navigation");
        if (!sidebar || !navigation) return;

        let toggle = document.getElementById("theme-toggle");
        if (!toggle) {
            toggle = document.createElement("button");
            toggle.id = "theme-toggle";
            toggle.type = "button";
            toggle.className = "gdButton nav-button purple-button theme-toggle";
            toggle.addEventListener("click", () => {
                const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
                savePreference(nextTheme);
                applyTheme(nextTheme);
            });
        }

        const stats = sidebar.querySelector(".sidebar-stats");
        if (stats) sidebar.insertBefore(toggle, stats);
        else navigation.insertAdjacentElement("afterend", toggle);

        applyTheme(readPreference());
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();