import { db, authPersistence } from "./firebase-config.js";
import {
    collection, getCountFromServer, getDocs, limit, orderBy, query, startAfter, where
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

(() => {
    "use strict";
    const PER_PAGE = 3;
    const el = {
        posts: document.getElementById("blog-posts"),
        pagination: document.getElementById("blog-pagination"),
        pageInfo: document.getElementById("blog-page-info"),
        previous: document.getElementById("blog-previous"),
        next: document.getElementById("blog-next")
    };
    let currentPage = 1;
    let totalPages = 1;
    let requestId = 0;
    const cursorByPage = new Map([[1, null]]);

    function node(tag, className = "", text) {
        const result = document.createElement(tag);
        if (className) result.className = className;
        if (text !== undefined) result.textContent = text;
        return result;
    }

    function pageFromURL() {
        const value = Number.parseInt(new URLSearchParams(location.search).get("page") || "1", 10);
        return Number.isFinite(value) && value > 0 ? value : 1;
    }

    function updateURL(page, replace = false) {
        const url = new URL(location.href);
        if (page === 1) url.searchParams.delete("page");
        else url.searchParams.set("page", String(page));
        history[replace ? "replaceState" : "pushState"]({ page }, "", url);
    }

    function externalURL(value) {
        try {
            const url = new URL(value);
            return ["https:", "http:"].includes(url.protocol) ? url.href : null;
        } catch { return null; }
    }

    function imageURL(value) {
        if (typeof value !== "string" || !value.trim()) return null;
        if (value.startsWith("/") && !value.startsWith("//")) return value;
        return externalURL(value);
    }

    function renderPost(id, data) {
        const post = {
            title: String(data.title || "Untitled"),
            date: String(data.date || ""),
            dateLabel: String(data.dateLabel || data.date || ""),
            category: String(data.category || "Update"),
            author: String(data.author || "Jack105WA"),
            linkText: String(data.linkText || data.title || ""),
            content: Array.isArray(data.content) ? data.content : []
        };
        const article = node("article", "blog-post");
        article.id = id;

        const meta = node("div", "post-meta");
        const time = document.createElement("time");
        time.dateTime = post.date;
        time.textContent = post.dateLabel || post.date || "Unknown date";
        meta.append(time, node("span", "post-category", post.category));
        article.append(meta, node("h3", "", post.title));

        for (const item of post.content) {
            if (!item || typeof item !== "object") continue;
            if (item.type === "paragraph") {
                article.appendChild(node("p", "", String(item.text || "")));
            } else if (item.type === "image") {
                const src = imageURL(item.src);
                if (!src) continue;
                const image = document.createElement("img");
                image.src = src;
                image.alt = String(item.alt || "");
                image.className = "emoji";
                image.loading = "lazy";
                image.referrerPolicy = "no-referrer";
                article.appendChild(image);
            } else if (item.type === "link") {
                const href = externalURL(item.url);
                if (!href) continue;
                const wrapper = node("div", "friend-link");
                const link = node("a", "gdButton nav-button " +
                    (item.style === "red-button" ? "red-button" : "blue-button"));
                link.href = href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.appendChild(node("span", "", String(item.text || "Open link")));
                wrapper.appendChild(link);
                article.appendChild(wrapper);
            }
        }

        const footer = node("div", "post-footer");
        const author = node("span");
        author.append("Posted by ");
        author.appendChild(node("strong", "", post.author));
        const postLink = node("a", "post-link", post.linkText || post.title);
        postLink.href = "#" + encodeURIComponent(id);
        footer.append(author, postLink);
        article.appendChild(footer);
        return article;
    }

    function renderPagination() {
        el.pagination.hidden = totalPages <= 1;
        el.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        el.previous.disabled = currentPage <= 1;
        el.next.disabled = currentPage >= totalPages;
    }

    function showError(message) {
        el.posts.replaceChildren(node("p", "blog-status", message));
        el.posts.setAttribute("aria-busy", "false");
        el.pagination.hidden = true;
    }

    async function showPage(page, options = {}) {
        const request = ++requestId;
        currentPage = Math.max(1, page);
        el.posts.setAttribute("aria-busy", "true");
        el.posts.replaceChildren(node("p", "blog-status", "Loading blog posts..."));
        el.pagination.hidden = true;

        try {
            await authPersistence;
            if (!db) throw new Error("Firestore database is not initialized. Check firebase-config.js.");

            const postsCollection = collection(db, "posts");
            const published = where("published", "==", true);

            // Count only; the actual post query below retrieves this page's three documents.
            const countSnapshot = await getCountFromServer(query(postsCollection, published));
            totalPages = Math.max(1, Math.ceil(countSnapshot.data().count / PER_PAGE));
            currentPage = Math.min(currentPage, totalPages);

            // Firestore's web SDK has no offset() query constraint. Build page
            // cursors with startAfter(), fetching only one small page per request.
            let cursor = cursorByPage.get(currentPage);
            if (currentPage > 1 && cursor === undefined) {
                let previousCursor = cursorByPage.get(1);
                for (let page = 1; page < currentPage; page++) {
                    if (cursorByPage.has(page + 1)) {
                        previousCursor = cursorByPage.get(page + 1);
                        continue;
                    }
                    const cursorQuery = query(
                        postsCollection,
                        published,
                        orderBy("date", "desc"),
                        ...(previousCursor ? [startAfter(previousCursor)] : []),
                        limit(PER_PAGE)
                    );
                    const cursorSnapshot = await getDocs(cursorQuery);
                    if (request !== requestId) return;
                    if (cursorSnapshot.empty) {
                        currentPage = page;
                        break;
                    }
                    previousCursor = cursorSnapshot.docs[cursorSnapshot.docs.length - 1];
                    cursorByPage.set(page + 1, previousCursor);
                }
                cursor = cursorByPage.get(currentPage);
            }

            const pageQuery = query(
                postsCollection,
                published,
                orderBy("date", "desc"),
                ...(cursor ? [startAfter(cursor)] : []),
                limit(PER_PAGE)
            );
            const snapshot = await getDocs(pageQuery);
            if (snapshot.docs.length) {
                cursorByPage.set(currentPage + 1, snapshot.docs[snapshot.docs.length - 1]);
            }
            if (request !== requestId) return;

            el.posts.replaceChildren();
            if (snapshot.empty) {
                el.posts.appendChild(node("p", "blog-status", "No blog posts on this page."));
            } else {
                const fragment = document.createDocumentFragment();
                snapshot.docs.forEach(doc => fragment.appendChild(renderPost(doc.id, doc.data())));
                el.posts.appendChild(fragment);
            }

            el.posts.setAttribute("aria-busy", "false");
            renderPagination();
            if (options.updateURL) updateURL(currentPage, options.replaceURL === true);
            if (options.scroll) {
                document.getElementById("blog-heading")?.scrollIntoView({
                    behavior: "smooth", block: "start"
                });
            }
        } catch (error) {
            if (request !== requestId) return;
            console.error("Firebase blog error:", error);
            showError("Unable to load blog posts. Check your Firebase configuration, Firestore database, and security rules.");
        }
    }

    if (!el.posts || !el.pagination || !el.pageInfo || !el.previous || !el.next) {
        console.error("Blog HTML is missing one or more required elements:", el);
        return;
    }
    el.previous.addEventListener("click", () => {
        if (currentPage > 1) showPage(currentPage - 1, { updateURL: true, scroll: true });
    });
    el.next.addEventListener("click", () => {
        if (currentPage < totalPages) showPage(currentPage + 1, { updateURL: true, scroll: true });
    });
    window.addEventListener("popstate", () => showPage(pageFromURL()));
    showPage(pageFromURL(), { updateURL: true, replaceURL: true });
})();
