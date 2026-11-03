
import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const ADMIN_UID = "nJepqTOIsFUCyiNl4aGj4PRzZyJ3";

const $ = (id) => document.getElementById(id);

const loginForm = $("login-form");
const loginStatus = $("login-status");
const dashboard = $("admin-dashboard");
const editorLocked = $("editor-locked");
const editorStatus = $("editor-status");
const postForm = $("post-form");
const postList = $("admin-post-list");
const saveButton = $("save-post");

const loginButton = loginForm?.querySelector('button[type="submit"]');

let allPosts = [];
let saving = false;
let loadingPosts = false;
let deletingPost = false;
let authGeneration = 0;

function setStatus(element, message) {
    if (element) {
        element.textContent = message;
    }
}

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function safeDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return "";
    }

    const date = new Date(`${value}T00:00:00`);

    return !Number.isNaN(date.getTime()) && localDateString(date) === value
        ? value
        : "";
}

function formatDate(value) {
    const date = safeDate(value);

    if (!date) {
        return value || "";
    }

    const [year, month, day] = date.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function parseContent(text) {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const image = line.match(
                /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)$/
            );

            if (image) {
                return {
                    type: "image",
                    alt: image[1].slice(0, 200),
                    src: image[2]
                };
            }

            const link = line.match(
                /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/
            );

            if (link) {
                return {
                    type: "link",
                    text: link[1].slice(0, 200),
                    url: link[2],
                    style: "blue-button"
                };
            }

            return {
                type: "paragraph",
                text: line.slice(0, 5000)
            };
        });
}

function contentToText(content = []) {
    if (!Array.isArray(content)) {
        return "";
    }

    return content.map((item) => {
        if (item.type === "paragraph") {
            return item.text || "";
        }

        if (item.type === "image") {
            return `![${item.alt || ""}](${item.src || ""})`;
        }

        if (item.type === "link") {
            return `[${item.text || "Link"}](${item.url || ""})`;
        }

        return "";
    }).filter(Boolean).join("\n");
}

function friendlyError(error) {
    console.error("[Admin]", error);

    const messages = {
        "auth/api-key-not-valid":
            "Firebase rejected the API key. Check firebase-config.js and your Google Cloud API key settings.",
        "auth/invalid-credential":
            "Incorrect email or password.",
        "auth/invalid-email":
            "Enter a valid email address.",
        "auth/too-many-requests":
            "Too many attempts. Try again later.",
        "auth/network-request-failed":
            "Network error. Check your connection.",
        "auth/unauthorized-domain":
            "Add jack105wa.github.io under Firebase Authentication authorized domains.",
        "auth/operation-not-allowed":
            "Enable Email/Password under Firebase Authentication sign-in methods.",
        "permission-denied":
            "Firestore denied this operation. Check your Firestore security rules.",
        "firestore/permission-denied":
            "Firestore denied this operation. Check your Firestore security rules.",
        "unavailable":
            "Firebase is temporarily unavailable. Try again.",
        "firestore/unavailable":
            "Firebase is temporarily unavailable. Try again."
    };

    return messages[error?.code] || error?.message || "An unexpected error occurred.";
}

function requireAdmin() {
    const user = auth.currentUser;

    if (!user || user.uid !== ADMIN_UID) {
        throw new Error("This account is not authorized to manage the blog.");
    }

    return user;
}

function resetEditor() {
    if (!postForm) {
        return;
    }

    postForm.reset();

    $("post-id").value = "";
    $("post-date").value = localDateString();
    $("post-published").checked = true;

    $("editor-heading").textContent = "Create a Post";

    const saveLabel = saveButton?.querySelector("span");

    if (saveLabel) {
        saveLabel.textContent = "Save Post";
    }

    if (saveButton) {
        saveButton.disabled = false;
    }

    setStatus(editorStatus, "");
}

/* Sign in */

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (loginButton?.disabled) {
        return;
    }

    const email = $("login-email").value.trim();
    const password = $("login-password").value;

    if (!email || !password) {
        setStatus(loginStatus, "Enter your email and password.");
        return;
    }

    if (loginButton) {
        loginButton.disabled = true;
    }

    setStatus(loginStatus, "Signing in...");

    try {
        const result = await signInWithEmailAndPassword(auth, email, password);

        if (result.user.uid !== ADMIN_UID) {
            await signOut(auth);
            setStatus(loginStatus, "This account is not authorized.");
            return;
        }

        setStatus(loginStatus, "Sign-in successful. Loading posts...");
    } catch (error) {
        setStatus(
            loginStatus,
            `${error.code || "Error"}: ${friendlyError(error)}`
        );
    } finally {
        if (loginButton) {
            loginButton.disabled = false;
        }
    }
});

/* Password reset */

$("forgot-password")?.addEventListener("click", async () => {
    const email = $("login-email").value.trim();

    if (!email) {
        setStatus(loginStatus, "Enter your email address first.");
        $("login-email").focus();
        return;
    }

    setStatus(loginStatus, "Requesting password reset...");

    try {
        await sendPasswordResetEmail(auth, email);
        setStatus(loginStatus, "If the account exists, a reset email will be sent.");
    } catch (error) {
        setStatus(loginStatus, friendlyError(error));
    }
});

/* Sign out */

$("logout")?.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        setStatus(loginStatus, friendlyError(error));
    }
});

/* Editor controls */

$("cancel-edit")?.addEventListener("click", resetEditor);

/* Authentication state */

onAuthStateChanged(auth, async (user) => {
    const generation = ++authGeneration;
    const authorized = Boolean(user && user.uid === ADMIN_UID);

    if (loginForm) {
        loginForm.hidden = authorized;
    }

    if (dashboard) {
        dashboard.hidden = !authorized;
    }

    if (editorLocked) {
        editorLocked.hidden = authorized;
    }

    if (!user) {
        allPosts = [];

        if (postList) {
            postList.replaceChildren();

            const message = document.createElement("p");
            message.className = "admin-empty";
            message.textContent = "Sign in to load your existing blog posts.";

            postList.appendChild(message);
        }

        setStatus(loginStatus, "Sign in to manage blog posts.");
        setStatus(editorStatus, "");

        return;
    }

    if (!authorized) {
        allPosts = [];

        if (postList) {
            postList.replaceChildren();
        }

        setStatus(loginStatus, "This account is not authorized.");

        try {
            await signOut(auth);
        } catch (error) {
            console.error("[Admin] Failed to sign out unauthorized account:", error);
        }

        return;
    }

    setStatus(loginStatus, "Administrator authenticated.");

    resetEditor();

    await loadPosts(generation);
});

/* Load existing posts */

async function loadPosts(expectedGeneration = authGeneration) {
    if (loadingPosts) {
        return;
    }

    loadingPosts = true;

    try {
        requireAdmin();

        setStatus(editorStatus, "Loading posts...");

        if (postList) {
            postList.replaceChildren();

            const message = document.createElement("p");
            message.className = "admin-empty";
            message.textContent = "Loading existing posts...";

            postList.appendChild(message);
        }

        const snapshot = await getDocs(collection(db, "posts"));

        if (
            expectedGeneration !== authGeneration ||
            auth.currentUser?.uid !== ADMIN_UID
        ) {
            return;
        }

        allPosts = snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data()
        }));

        allPosts.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;

            return dateB - dateA;
        });

        renderAdminPosts();

        setStatus(editorStatus, `Loaded ${allPosts.length} post(s).`);
    } catch (error) {
        if (expectedGeneration !== authGeneration) {
            return;
        }

        setStatus(editorStatus, friendlyError(error));

        if (postList) {
            postList.replaceChildren();

            const message = document.createElement("p");
            message.className = "admin-empty";
            message.textContent = `Unable to load posts: ${friendlyError(error)}`;

            postList.appendChild(message);
        }
    } finally {
        loadingPosts = false;
    }
}

/* Render existing posts */

function renderAdminPosts() {
    if (!postList) {
        return;
    }

    postList.replaceChildren();

    if (!allPosts.length) {
        const empty = document.createElement("p");
        empty.className = "admin-empty";
        empty.textContent = "No blog posts were found in the Firestore posts collection.";

        postList.appendChild(empty);
        return;
    }

    for (const post of allPosts) {
        const item = document.createElement("article");
        item.className = "admin-post-item";

        const title = document.createElement("h3");
        title.textContent = post.title || "Untitled";

        const details = document.createElement("p");
        details.textContent =
            `${post.dateLabel || post.date || "No date"} · ` +
            `${post.category || "Update"} · ` +
            `${post.published ? "Published" : "Draft"}`;

        const actions = document.createElement("div");
        actions.className = "admin-actions";

        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "gdButton nav-button blue-button";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => editPost(post.id));

        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "gdButton nav-button red-button";
        remove.textContent = "Delete";
        remove.addEventListener("click", () => deletePost(post.id));

        actions.append(edit, remove);
        item.append(title, details, actions);
        postList.appendChild(item);
    }
}

/* Edit a post */

function editPost(id) {
    const post = allPosts.find((entry) => entry.id === id);

    if (!post) {
        return;
    }

    $("post-id").value = post.id;
    $("post-title").value = post.title || "";
    $("post-category").value = post.category || "Update";
    $("post-date").value = safeDate(post.date) || localDateString();
    $("post-content").value = contentToText(post.content);
    $("post-link-text").value = post.linkText || "";
    $("post-published").checked = post.published === true;

    $("editor-heading").textContent = "Edit Post";

    const saveLabel = saveButton?.querySelector("span");

    if (saveLabel) {
        saveLabel.textContent = "Update Post";
    }

    setStatus(editorStatus, `Editing: ${post.title || post.id}`);

    postForm?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    $("post-title").focus();
}

/* Save a post */

postForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (saving) {
        return;
    }

    saving = true;

    if (saveButton) {
        saveButton.disabled = true;
    }

    try {
        requireAdmin();

        const title = $("post-title").value.trim();
        const date = $("post-date").value;
        const contentText = $("post-content").value.trim();

        if (!title || !safeDate(date) || !contentText) {
            throw new Error("Enter a title, valid date, and post content.");
        }

        const content = parseContent(contentText);

        if (!content.length) {
            throw new Error("Add at least one paragraph, link, or image.");
        }

        const existingId = $("post-id").value;
        const id = existingId || crypto.randomUUID();

        const data = {
            title: title.slice(0, 120),
            date,
            dateLabel: formatDate(date),
            category: $("post-category").value,
            author: "Jack105WA",
            linkText: $("post-link-text").value.trim().slice(0, 80) || title,
            content,
            published: $("post-published").checked,
            updatedAt: serverTimestamp()
        };

        if (!existingId) {
            data.createdAt = serverTimestamp();
        }

        await setDoc(doc(db, "posts", id), data, { merge: true });

        resetEditor();
        setStatus(editorStatus, "Post saved successfully.");

        await loadPosts();
    } catch (error) {
        setStatus(editorStatus, friendlyError(error));
    } finally {
        saving = false;

        if (saveButton) {
            saveButton.disabled = false;
        }
    }
});

/* Delete a post */

async function deletePost(id) {
    if (deletingPost) {
        return;
    }

    const post = allPosts.find((entry) => entry.id === id);

    if (!post) {
        return;
    }

    if (!confirm(`Permanently delete "${post.title || id}"?`)) {
        return;
    }

    deletingPost = true;

    try {
        requireAdmin();

        await deleteDoc(doc(db, "posts", id));

        if ($("post-id").value === id) {
            resetEditor();
        }

        setStatus(editorStatus, "Post deleted.");

        await loadPosts();
    } catch (error) {
        setStatus(editorStatus, friendlyError(error));
    } finally {
        deletingPost = false;
    }
}

/* Initial editor state */

if ($("post-date")) {
    $("post-date").value = localDateString();
}

console.log("[Admin] admin.js loaded.");
