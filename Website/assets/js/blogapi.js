import { db, authPersistence } from "./firebase-config.js";

import {
    collection,
    getCountFromServer,
    getDocs,
    limit,
    orderBy,
    query,
    startAfter,
    where
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

(() => {
    "use strict";

    const POSTS_PER_PAGE = 3;
    const elements = {
        posts: document.getElementById("blog-posts"),
        pagination: document.getElementById("blog-pagination"),
        pageInfo: document.getElementById("blog-page-info"),
        previous: document.getElementById("blog-previous"),
        next: document.getElementById("blog-next")
    };

    let currentPage = 1;
    let totalPages = 1;
    let currentLastDocument = null;
    // Store only Firestore cursor snapshots, never the full collection of posts.
    const pageCursors = new Map([[1, null]]);

    function createElement(tag, className = "", text = undefined) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function getPageFromURL() {
        const value = Number.parseInt(new URLSearchParams(location.search).get("page") || "1", 10);
        return Number.isFinite(value) && value > 0 ? value : 1;
    }

    function updateURL(page, replace = false) {
        const url = new URL(location.href);
        if (page === 1) url.searchParams.delete("page");
        else url.searchParams.set("page", String(page));
        history[replace ? "replaceState" : "pushState"]({ page }, "", url);
    }

    function validExternalURL(value) {
        try {
            const url = new URL(value);
            return ["https:", "http:"].includes(url.protocol) ? url.href : null;
        } catch {
            return null;
        }
    }

    function validImageURL(value) {
        if (typeof value !== "string" || !value.trim()) return null;
        if (value.startsWith("/") && !value.startsWith("//")) return value;
        return validExternalURL(value);
    }

    function normalizePost(id, data) {
        return {
            id,
            title: String(data.title || "Untitled"),
            date: String(data.date || ""),
            dateLabel: String(data.dateLabel || data.date || ""),
            category: String(data.category || "Update"),
            author: String(data.author || "Jack105WA"),
            linkText: String(data.linkText || data.title || ""),
            content: Array.isArray(data.content) ? data.content : []
        };
    }

    function appendContent(post, article) {
        for (const item of post.content) {
            if (!item || typeof item !== "object") continue;

            if (item.type === "paragraph") {
                article.appendChild(createElement("p", "", String(item.text || "")));
                continue;
            }

            if (item.type === "image") {
                const src = validImageURL(item.src);
                if (!src) continue;
                const image = document.createElement("img");
                image.src = src;
                image.alt = String(item.alt || "");
                image.className = "emoji";
                image.loading = "lazy";
                image.referrerPolicy = "no-referrer";
                article.appendChild(image);
                continue;
            }

            if (item.type === "link") {
                const href = validExternalURL(item.url);
                if (!href) continue;
                const wrapper = createElement("div", "friend-link");
                const link = createElement(
                    "a",
                    "gdButton nav-button " + (item.style === "red-button" ? "red-button" : "blue-button")
                );
                link.href = href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.appendChild(createElement("span", "", String(item.text || "Open link")));
                wrapper.appendChild(link);
                article.appendChild(wrapper);
            }
        }
    }

    function renderPost(post) {
        const article = createElement("article", "blog-post");
        article.id = post.id;

        const meta = createElement("div", "post-meta");
        const time = document.createElement("time");
        time.dateTime = post.date;
        time.textContent = post.dateLabel || post.date || "Unknown date";
        meta.append(time, createElement("span", "post-category", post.category));
        article.append(meta, createElement("h3", "", post.title));
        appendContent(post, article);

        const footer = createElement("div", "post-footer");
        const author = createElement("span");
        author.append("Posted by ", createElement("strong", "", post.author));
        const postLink = createElement("a", "post-link", post.linkText || post.title);
        postLink.href = "#" + encodeURIComponent(post.id);
        footer.append(author, postLink);
        article.appendChild(footer);
        return article;
    }

    function renderPage(posts) {
        elements.posts.replaceChildren();
        if (!posts.length) {
            elements.posts.appendChild(createElement("p", "blog-status", "No blog posts on this page."));
        } else {
            const fragment = document.createDocumentFragment();
            posts.forEach(post => fragment.appendChild(renderPost(post)));
            elements.posts.appendChild(fragment);
        }

        elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        elements.previous.disabled = currentPage <= 1;
        elements.next.disabled = currentPage >= totalPages;
        elements.pagination.hidden = totalPages <= 1;
        elements.posts.setAttribute("aria-busy", "false");
    }

    function showError(message) {
        elements.posts.replaceChildren(createElement("p", "blog-status", message));
        elements.posts.setAttribute("aria-busy", "false");
        elements.pagination.hidden = true;
    }

    function basePostsQuery() {
        return query(
            collection(db, "posts"),
            where("published", "==", true),
            orderBy("date", "desc")
        );
    }

    async function fetchPage(page) {
        let cursor = pageCursors.get(1) || null;

        // Build missing cursors page-by-page for direct links and browser history.
        for (let cursorPage = 1; cursorPage < page; cursorPage++) {
            if (pageCursors.has(cursorPage + 1)) {
                cursor = pageCursors.get(cursorPage + 1);
                continue;
            }
            const cursorQuery = cursor
                ? query(basePostsQuery(), startAfter(cursor), limit(POSTS_PER_PAGE))
                : query(basePostsQuery(), limit(POSTS_PER_PAGE));
            const cursorSnapshot = await getDocs(cursorQuery);
            if (cursorSnapshot.empty) return [];
            cursor = cursorSnapshot.docs[cursorSnapshot.docs.length - 1];
            pageCursors.set(cursorPage + 1, cursor);
        }

        const pageQuery = cursor
            ? query(basePostsQuery(), startAfter(cursor), limit(POSTS_PER_PAGE))
            : query(basePostsQuery(), limit(POSTS_PER_PAGE));
        const snapshot = await getDocs(pageQuery);
        currentLastDocument = snapshot.docs.length
            ? snapshot.docs[snapshot.docs.length - 1]
            : null;
        if (currentLastDocument) pageCursors.set(page + 1, currentLastDocument);
        return snapshot.docs.map(postDoc => normalizePost(postDoc.id, postDoc.data()));
    }

    async function showPage(page, options = {}) {
        if (options.updateURL) updateURL(page, options.replaceURL === true);
        currentPage = Math.min(Math.max(1, page), totalPages);
        elements.posts.setAttribute("aria-busy", "true");
        elements.posts.replaceChildren(createElement("p", "blog-status", "Loading page..."));
        elements.pagination.hidden = true;

        try {
            const posts = await fetchPage(currentPage);
            renderPage(posts);
            if (options.scroll) {
                document.getElementById("blog-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        } catch (error) {
            console.error("Firebase blog page error:", error);
            showError("Unable to load this page of blog posts. Please try again.");
        }
    }

    async function loadBlog() {
        if (!elements.posts || !elements.pagination || !elements.pageInfo || !elements.previous || !elements.next) {
            console.error("Blog HTML is missing one or more required elements:", elements);
            return;
        }

        elements.posts.setAttribute("aria-busy", "true");
        try {
            await authPersistence;
            if (!db) throw new Error("Firestore database is not initialized. Check firebase-config.js.");

            // Count metadata only; retrieve the actual post documents one page at a time.
            const countQuery = query(collection(db, "posts"), where("published", "==", true));
            const countSnapshot = await getCountFromServer(countQuery);
            const count = countSnapshot.data().count;
            totalPages = Math.max(1, Math.ceil(count / POSTS_PER_PAGE));

            await showPage(getPageFromURL(), { updateURL: true, replaceURL: true });
        } catch (error) {
            console.error("Firebase blog error:", error);
            showError("Unable to load blog posts. Check your Firebase configuration, database, and security rules.");
        }
    }

    elements.previous?.addEventListener("click", () => {
        if (currentPage > 1) showPage(currentPage - 1, { updateURL: true, scroll: true });
    });

    elements.next?.addEventListener("click", () => {
        if (currentPage < totalPages) showPage(currentPage + 1, { updateURL: true, scroll: true });
    });

    window.addEventListener("popstate", () => showPage(getPageFromURL()));
    loadBlog();
})();
