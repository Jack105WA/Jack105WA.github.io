import { auth, db, authPersistence } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

(() => {
    "use strict";

    const ADMIN_UID = "nJepqTOIsFUCyiNl4aGj4PRzZyJ3";
    const notificationRef = doc(db, "siteSettings", "notification");

    const $ = (id) => document.getElementById(id);

    const elements = {
        selector: $("admin-function"),
        description: $("admin-function-description"),
        manager: $("notification-manager"),
        form: $("notification-form"),
        enabled: $("notification-enabled"),
        message: $("notification-message"),
        type: $("notification-type"),
        link: $("notification-link"),
        linkText: $("notification-link-text"),
        save: $("save-notification"),
        reload: $("reload-notification"),
        preview: $("notification-preview"),
        status: $("notification-status")
    };

    if (Object.values(elements).some((element) => !element)) {
        console.error("[Notification Admin] Required controls are missing.");
        return;
    }

    let authorized = false;
    let saving = false;
    let loading = false;
    let operation = 0;

    function setStatus(message) {
        elements.status.textContent = message;
    }

    function isAllowedLink(value) {
        if (!value) return true;

        if (value.startsWith("/") && !value.startsWith("//")) {
            return true;
        }

        try {
            const url = new URL(value);
            return url.protocol === "https:" || url.protocol === "http:";
        } catch {
            return false;
        }
    }

    function updatePreview() {
        elements.preview.dataset.type = elements.type.value;
        elements.preview.dataset.enabled = String(elements.enabled.checked);
        elements.preview.replaceChildren();

        const message = document.createElement("div");
        message.textContent = elements.message.value.trim() || "Notification preview";
        elements.preview.appendChild(message);

        const link = elements.link.value.trim();
        const linkText = elements.linkText.value.trim();

        if (link && linkText && isAllowedLink(link)) {
            const anchor = document.createElement("a");
            anchor.href = link;
            anchor.textContent = linkText;
            elements.preview.appendChild(anchor);
        }
    }

    function setEditorDisabled(disabled) {
        elements.form.querySelectorAll("input, textarea, select, button").forEach(
            (element) => {
                element.disabled = disabled;
            }
        );
    }

    function resetEditor() {
        elements.enabled.checked = false;
        elements.message.value = "";
        elements.type.value = "info";
        elements.link.value = "";
        elements.linkText.value = "";
        updatePreview();
    }

    async function loadNotification() {
        if (!authorized || loading || saving) return;

        loading = true;
        const currentOperation = ++operation;

        setEditorDisabled(true);
        setStatus("Loading notification settings...");

        try {
            const snapshot = await getDoc(notificationRef);

            if (
                currentOperation !== operation ||
                !authorized ||
                auth.currentUser?.uid !== ADMIN_UID
            ) {
                return;
            }

            const data = snapshot.exists() ? snapshot.data() : {};

            elements.enabled.checked = data.enabled === true;
            elements.message.value =
                typeof data.message === "string" ? data.message : "";

            elements.type.value = [
                "info",
                "success",
                "warning",
                "error"
            ].includes(data.type) ? data.type : "info";

            elements.link.value =
                typeof data.link === "string" ? data.link : "";

            elements.linkText.value =
                typeof data.linkText === "string" ? data.linkText : "";

            updatePreview();

            setStatus(
                snapshot.exists()
                    ? "Notification settings loaded."
                    : "No settings found. Configure your notification and save."
            );
        } catch (error) {
            console.error("[Notification Admin] Load failed:", error);
            setStatus(`Load failed: ${error.message || error.code || "Unknown error"}`);
        } finally {
            loading = false;
            setEditorDisabled(!authorized);
        }
    }

    elements.form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!authorized || auth.currentUser?.uid !== ADMIN_UID) {
            setStatus("Administrator authentication is required.");
            return;
        }

        if (saving || loading) return;

        const message = elements.message.value.trim();
        const link = elements.link.value.trim();
        const linkText = elements.linkText.value.trim();

        if (elements.enabled.checked && !message) {
            setStatus("Enter a message before enabling the notification.");
            elements.message.focus();
            return;
        }

        if (message.length > 500 || link.length > 500 || linkText.length > 80) {
            setStatus("One or more fields exceed their maximum length.");
            return;
        }

        if (!isAllowedLink(link)) {
            setStatus("Use a relative site path or a valid HTTP/HTTPS URL.");
            elements.link.focus();
            return;
        }

        if (!["info", "success", "warning", "error"].includes(elements.type.value)) {
            setStatus("Select a valid notification style.");
            return;
        }

        saving = true;
        const currentOperation = ++operation;

        setEditorDisabled(true);
        setStatus("Saving notification...");

        try {
            if (auth.currentUser?.uid !== ADMIN_UID) {
                throw new Error("Administrator authentication expired.");
            }

            await setDoc(notificationRef, {
                enabled: elements.enabled.checked,
                message,
                type: elements.type.value,
                link,
                linkText,
                updatedAt: serverTimestamp(),
                updatedBy: ADMIN_UID
            }, { merge: true });

            if (currentOperation === operation && authorized) {
                setStatus("Notification saved successfully.");
                updatePreview();
            }
        } catch (error) {
            console.error("[Notification Admin] Save failed:", error);
            setStatus(`Save failed: ${error.message || error.code || "Unknown error"}`);
        } finally {
            saving = false;
            setEditorDisabled(!authorized);
        }
    });

    elements.reload.addEventListener("click", loadNotification);

    [
        elements.enabled,
        elements.message,
        elements.type,
        elements.link,
        elements.linkText
    ].forEach((element) => {
        element.addEventListener("input", updatePreview);
        element.addEventListener("change", updatePreview);
    });

    elements.selector.addEventListener("change", () => {
        const selected = elements.selector.value === "notification";
        elements.manager.hidden = !selected;

        if (elements.description) {
            elements.description.textContent = selected
                ? "Manage the site-wide announcement shown to visitors."
                : "Edit existing posts, delete posts, or select a post to open it in the editor.";
        }

        if (selected && authorized) {
            loadNotification();
        }
    });

    Promise.resolve(authPersistence)
        .catch((error) => {
            console.error("[Notification Admin] Authentication persistence failed:", error);
        })
        .finally(() => {
            onAuthStateChanged(auth, (user) => {
                authorized = Boolean(user && user.uid === ADMIN_UID);

                if (!authorized) {
                    operation++;
                    elements.manager.hidden = true;
                    setEditorDisabled(true);
                    setStatus("Sign in with the administrator account to manage notifications.");
                    return;
                }

                setEditorDisabled(false);

                if (elements.selector.value === "notification") {
                    loadNotification();
                }
            });
        });

    resetEditor();
    setEditorDisabled(true);
})();