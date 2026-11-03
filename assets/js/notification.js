import { db } from "./firebase-config.js";

import {
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

(() => {
    "use strict";

    const NOTIFICATION_ID = "jack105wa-site-notification";
    const STORAGE_PREFIX = "jack105wa-notification-dismissed-";
    const VALID_TYPES = ["info", "success", "warning", "error"];

    let banner = null;
    let latestData = null;
    let dismissedVersion = "";

    const style = document.createElement("style");

    style.textContent = `
        #${NOTIFICATION_ID} {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            width: 100%;
            padding: 13px 48px 13px 16px;
            box-sizing: border-box;
            border: 2px solid rgba(0, 0, 0, 0.3);
            background: #0065FD;
            color: #fff;
            font-family: inherit;
            font-size: 15px;
            line-height: 1.5;
            overflow-wrap: anywhere;
            z-index: 1000;
        }

        #${NOTIFICATION_ID}[hidden] {
            display: none !important;
        }

        #${NOTIFICATION_ID}[data-type="success"] {
            background: #176b32;
        }

        #${NOTIFICATION_ID}[data-type="warning"] {
            background: #8a5700;
        }

        #${NOTIFICATION_ID}[data-type="error"] {
            background: #a52020;
        }

        #${NOTIFICATION_ID} .notification-content {
            min-width: 0;
            text-align: center;
            white-space: pre-wrap;
        }

        #${NOTIFICATION_ID} .notification-link {
            color: #fff;
            font-weight: bold;
            text-decoration: underline;
            flex-shrink: 0;
        }

        #${NOTIFICATION_ID} .notification-close {
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            padding: 0;
            border: 1px solid rgba(255, 255, 255, 0.65);
            border-radius: 5px;
            background: rgba(0, 0, 0, 0.15);
            color: #fff;
            font: inherit;
            font-size: 20px;
            cursor: pointer;
        }

        #${NOTIFICATION_ID} .notification-close:hover {
            background: rgba(0, 0, 0, 0.3);
        }

        #${NOTIFICATION_ID} .notification-close:focus-visible,
        #${NOTIFICATION_ID} a:focus-visible {
            outline: 3px solid #fff;
            outline-offset: 3px;
        }

        @media (max-width: 600px) {
            #${NOTIFICATION_ID} {
                align-items: flex-start;
                flex-direction: column;
                gap: 7px;
                padding: 12px 46px 12px 12px;
            }

            #${NOTIFICATION_ID} .notification-content {
                text-align: left;
            }
        }
    `;

    document.head.appendChild(style);

    function allowedLink(value) {
        if (typeof value !== "string" || !value) return false;

        if (value.startsWith("/") && !value.startsWith("//")) {
            return true;
        }

        try {
            const url = new URL(value, window.location.origin);

            return (
                (url.protocol === "https:" || url.protocol === "http:") &&
                url.origin !== "null"
            );
        } catch {
            return false;
        }
    }

    function getBanner() {
        if (banner) return banner;

        banner = document.createElement("aside");
        banner.id = NOTIFICATION_ID;
        banner.setAttribute("role", "region");
        banner.setAttribute("aria-label", "Site notification");
        banner.hidden = true;

        const content = document.createElement("div");
        content.className = "notification-content";

        const close = document.createElement("button");
        close.className = "notification-close";
        close.type = "button";
        close.textContent = "×";
        close.setAttribute("aria-label", "Dismiss notification");

        close.addEventListener("click", () => {
            if (!latestData) return;

            dismissedVersion = String(
                latestData.updatedAt?.toMillis?.() || latestData.message
            );

            try {
                sessionStorage.setItem(
                    STORAGE_PREFIX + window.location.pathname,
                    dismissedVersion
                );
            } catch {
                // Dismissal still applies to this page session in memory.
            }

            banner.hidden = true;
        });

        banner.append(content, close);

        const mount = () => {
            if (!banner.isConnected) {
                const pageRoot = document.getElementById("everything");
                (pageRoot || document.body).prepend(banner);
            }

            render();
        };

        if (document.body) {
            mount();
        } else {
            document.addEventListener("DOMContentLoaded", mount, { once: true });
        }

        return banner;
    }

    function render() {
        const element = getBanner();
        const data = latestData;

        if (!data || data.enabled !== true || !data.message) {
            element.hidden = true;
            return;
        }

        const version = String(
            data.updatedAt?.toMillis?.() || data.message
        );

        let storedDismissal = "";

        try {
            storedDismissal = sessionStorage.getItem(
                STORAGE_PREFIX + window.location.pathname
            ) || "";
        } catch {
            // Storage may be unavailable in some browser contexts.
        }

        if (dismissedVersion === version || storedDismissal === version) {
            element.hidden = true;
            return;
        }

        element.dataset.type = VALID_TYPES.includes(data.type)
            ? data.type
            : "info";

        const content = element.querySelector(".notification-content");
        content.replaceChildren();

        const message = document.createElement("span");
        message.textContent = data.message;
        content.appendChild(message);

        if (
            typeof data.link === "string" &&
            data.link &&
            typeof data.linkText === "string" &&
            data.linkText &&
            allowedLink(data.link)
        ) {
            const link = document.createElement("a");

            link.className = "notification-link";
            link.href = data.link;
            link.textContent = data.linkText;

            content.appendChild(document.createTextNode(" "));
            content.appendChild(link);
        }

        element.hidden = false;
    }

    getBanner();

    onSnapshot(
        doc(db, "siteSettings", "notification"),
        (snapshot) => {
            latestData = snapshot.exists() ? snapshot.data() : null;
            render();
        },
        (error) => {
            console.error("[Site Notification] Failed to load:", error);
            getBanner().hidden = true;
        }
    );
})();