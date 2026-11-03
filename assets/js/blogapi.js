
import { db, authPersistence } from "./firebase-config.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

(() => {
    "use strict";

    const POSTS_PER_PAGE = 2;

    const elements = {
        posts: document.getElementById("blog-posts"),
        pagination: document.getElementById("blog-pagination"),
        pageInfo: document.getElementById("blog-page-info"),
        previous: document.getElementById("blog-previous"),
        next: document.getElementById("blog-next")
    };

    let posts = [];
    let currentPage = 1;
    let totalPages = 1;

    function createElement(tag, className = "", text = undefined) {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;

        return element;
    }

    function getPageFromURL() {
        const value = Number.parseInt(
            new URLSearchParams(location.search).get("page") || "1",
            10
        );

        return Number.isFinite(value) && value > 0 ? value : 1;
    }

    function updateURL(page, replace = false) {
        const url = new URL(location.href);

        if (page === 1) {
            url.searchParams.delete("page");
        } else {
            url.searchParams.set("page", String(page));
        }

        history[replace ? "replaceState" : "pushState"]({ page }, "", url);
    }

    function validExternalURL(value) {
        try {
            const url = new URL(value);

            return ["https:", "http:"].includes(url.protocol)
                ? url.href
                : null;
        } catch {
            return null;
        }
    }

    function validImageURL(value) {
        if (typeof value !== "string" || !value.trim()) return null;

        if (value.startsWith("/") && !value.startsWith("//")) {
            return value;
        }

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
            content: Array.isArray(data.content) ? data.content : [],
            published: data.published === true
        };
    }

    function appendContent(post, article) {
        for (const item of post.content) {
            if (!item || typeof item !== "object") continue;

            if (item.type === "paragraph") {
                article.appendChild(
                    createElement("p", "", String(item.text || ""))
                );
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
                    "gdButton nav-button " +
                        (item.style === "red-button"
                            ? "red-button"
                            : "blue-button")
                );

                link.href = href;
                link.target = "_blank";
                link.rel = "noopener noreferrer";

                link.appendChild(
                    createElement("span", "", String(item.text || "Open link"))
                );

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

        meta.append(
            time,
            createElement("span", "post-category", post.category)
        );

        article.append(meta);
        article.appendChild(createElement("h3", "", post.title));

        appendContent(post, article);

        const footer = createElement("div", "post-footer");
        const author = createElement("span");

        author.append("Posted by ");
        author.appendChild(createElement("strong", "", post.author));

        const postLink = createElement(
            "a",
            "post-link",
            post.linkText || post.title
        );

        postLink.href = "#" + encodeURIComponent(post.id);

        footer.append(author, postLink);
        article.appendChild(footer);

        return article;
    }

    function renderPosts() {
        elements.posts.replaceChildren();

        const start = (currentPage - 1) * POSTS_PER_PAGE;
        const visiblePosts = posts.slice(start, start + POSTS_PER_PAGE);

        if (!visiblePosts.length) {
            elements.posts.appendChild(
                createElement("p", "blog-status", "No blog posts on this page.")
            );
            return;
        }

        for (const post of visiblePosts) {
            elements.posts.appendChild(renderPost(post));
        }
    }

    function renderPagination() {
        elements.pagination.hidden = totalPages <= 1;
        elements.pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        elements.previous.disabled = currentPage <= 1;
        elements.next.disabled = currentPage >= totalPages;
    }

    function showPage(page, options = {}) {
        currentPage = Math.min(Math.max(1, page), totalPages);

        renderPosts();
        renderPagination();

        if (options.updateURL) {
            updateURL(currentPage, options.replaceURL === true);
        }

        if (options.scroll) {
            document.getElementById("blog-heading")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    }

    function showError(message) {
        elements.posts.replaceChildren(
            createElement("p", "blog-status", message)
        );

        elements.posts.setAttribute("aria-busy", "false");
        elements.pagination.hidden = true;
    }

    async function loadBlog() {
        if (!elements.posts || !elements.pagination ||
            !elements.pageInfo || !elements.previous || !elements.next) {
            console.error(
                "Blog HTML is missing one or more required elements:",
                elements
            );
            return;
        }

        elements.posts.setAttribute("aria-busy", "true");
        elements.posts.replaceChildren(
            createElement("p", "blog-status", "Loading blog posts...")
        );

        try {
            // Wait for Firebase Auth persistence initialization.
            await authPersistence;

            if (!db) {
                throw new Error(
                    "Firestore database is not initialized. Check firebase-config.js."
                );
            }

            const publishedQuery = query(
                collection(db, "posts"),
                where("published", "==", true)
            );

            const snapshot = await getDocs(publishedQuery);

            posts = snapshot.docs
                .map((postDoc) => normalizePost(postDoc.id, postDoc.data()))
                .sort((a, b) => {
                    const dateOrder = b.date.localeCompare(a.date);
                    return dateOrder !== 0
                        ? dateOrder
                        : b.id.localeCompare(a.id);
                });

            totalPages = Math.max(
                1,
                Math.ceil(posts.length / POSTS_PER_PAGE)
            );

            elements.posts.setAttribute("aria-busy", "false");

            showPage(getPageFromURL(), {
                updateURL: true,
                replaceURL: true
            });
        } catch (error) {
            console.error("Firebase blog error:", error);

            elements.posts.setAttribute("aria-busy", "false");

            showError(
                "Unable to load blog posts. Check your Firebase configuration, " +
                "Firestore database, and security rules."
            );
        }
    }

    elements.previous?.addEventListener("click", () => {
        if (currentPage > 1) {
            showPage(currentPage - 1, {
                updateURL: true,
                scroll: true
            });
        }
    });

    elements.next?.addEventListener("click", () => {
        if (currentPage < totalPages) {
            showPage(currentPage + 1, {
                updateURL: true,
                scroll: true
            });
        }
    });

    window.addEventListener("popstate", () => {
        showPage(getPageFromURL());
    });

    loadBlog();
})();
