import "./button-sound.js";
import { db } from "./firebase-config.js";

import {
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

(() => {
    "use strict";

    const NOTIFICATION_ID = "jack105wa-site-notification";
    const VALID_TYPES = ["info", "success", "warning", "error"];

    let banner = null;
    let latestData = null;

    const style = document.createElement("style");

    style.textContent = `
        #${NOTIFICATION_ID} {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            width: 100%;
            margin: 0 0 16px;
            padding: 13px 16px;
            border-radius: 16px;
            box-sizing: border-box;
            border: 2px solid rgba(0, 0, 0, 0.3);
            background: #0065FD;
            color: #fff;
            font-family: "Pusab", sans-serif;
            font-size: 13px;
            line-height: 1.45;
            text-align: center;
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

        #${NOTIFICATION_ID} a:focus-visible {
            outline: 3px solid #fff;
            outline-offset: 3px;
        }

        @media (max-width: 600px) {
            #${NOTIFICATION_ID} {
                align-items: center;
                flex-direction: column;
                gap: 7px;
                padding: 12px 16px;
            }

            #${NOTIFICATION_ID} .notification-content {
                text-align: center;
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

        banner.append(content);

        const mount = () => {
            const footer = document.querySelector(".site-footer");
            const contentPanel = document.querySelector(".welcome-panel");

            if (footer && !footer.parentNode.contains(banner)) {
                footer.insertAdjacentElement("beforebegin", banner);
            } else if (!banner.isConnected && contentPanel) {
                contentPanel.appendChild(banner);
            } else if (!banner.isConnected && document.body) {
                document.body.appendChild(banner);
            }

            render();
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", mount, { once: true });
        } else {
            mount();
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