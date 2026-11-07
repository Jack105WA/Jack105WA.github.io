(() => {
    "use strict";
    if (window.__jack105waContextMenuLoaded) return;
    window.__jack105waContextMenuLoaded = true;

    const style = document.createElement("style");
    style.id = "jack105wa-context-menu-style";
    style.textContent = "#jack105wa-context-menu{position:fixed;z-index:2147483647;width:248px;max-width:calc(100vw - 16px);padding:7px;color:#fff;background:linear-gradient(180deg,#754126 0%,#4b2818 100%);border:2px solid #32190f;border-radius:11px;box-shadow:0 8px 28px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.14);font:14px Arial,sans-serif;opacity:0;transform:translateY(4px) scale(.98);transform-origin:top left;transition:opacity 90ms ease,transform 90ms ease;user-select:none;-webkit-user-select:none}#jack105wa-context-menu[data-open=true]{opacity:1;transform:translateY(0) scale(1)}#jack105wa-context-menu .jctx-heading{padding:5px 10px 8px;color:#ffd21c;font:15px 'Pusab',Arial,sans-serif;text-shadow:1px 2px 0 #241108;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#jack105wa-context-menu .jctx-item{display:flex;align-items:center;gap:10px;width:100%;min-height:35px;padding:7px 10px;border:0;border-radius:6px;color:#fff;background:transparent;text-align:left;font:inherit;cursor:pointer}#jack105wa-context-menu .jctx-item:hover,#jack105wa-context-menu .jctx-item:focus-visible{outline:none;background:linear-gradient(180deg,#1685ee,#0754a8);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.25)}#jack105wa-context-menu .jctx-item:disabled{opacity:.38;cursor:default;background:transparent;box-shadow:none}#jack105wa-context-menu .jctx-icon{display:inline-flex;align-items:center;justify-content:center;width:19px;flex:0 0 19px;color:#ffe58a;font:16px Arial,sans-serif}#jack105wa-context-menu .jctx-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#jack105wa-context-menu .jctx-shortcut{margin-left:auto;color:rgba(255,255,255,.58);font:11px Arial,sans-serif;white-space:nowrap}#jack105wa-context-menu .jctx-separator{height:1px;margin:5px 7px;background:rgba(255,255,255,.17)}@media(prefers-reduced-motion:reduce){#jack105wa-context-menu{transition:none}}";
    document.head.appendChild(style);

    let menu;
    let currentItems = [];

    const isEditable = element => !!element && (element.isContentEditable || !!element.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable=''],[role='textbox']"));
    const isNativeControl = element => !!element?.closest?.("input,textarea,select,option,video,audio,iframe,object,embed");

    const getContext = target => ({
        target,
        link: target.closest?.("a[href]"),
        image: target.closest?.("img"),
        selection: window.getSelection()?.toString().trim() || ""
    });

    const copyText = async value => {
        if (!value) return;
        try {
            if (navigator.clipboard?.writeText && window.isSecureContext) {
                await navigator.clipboard.writeText(value);
                return;
            }
        } catch (_) {}
        const helper = document.createElement("textarea");
        helper.value = value;
        helper.setAttribute("readonly", "");
        helper.style.cssText = "position:fixed;opacity:0;pointer-events:none";
        document.body.appendChild(helper);
        helper.select();
        try { document.execCommand("copy"); } finally { helper.remove(); }
    };

    const closeMenu = () => {
        if (!menu) return;
        menu.dataset.open = "false";
        menu.setAttribute("aria-hidden", "true");
        menu.style.pointerEvents = "none";
    };

    const item = (label, icon, action, shortcut = "", disabled = false) => ({ label, icon, action, shortcut, disabled });

    const buildItems = context => {
        const items = [
            item("Back", "←", () => history.back(), "Alt + ←", history.length <= 1),
            item("Forward", "→", () => history.forward(), "Alt + →"),
            item("Reload page", "↻", () => location.reload(), "Ctrl + R"),
            null
        ];
        if (context.selection) items.push(item("Copy selected text", "▣", () => copyText(context.selection), "Ctrl + C"));
        if (context.link) items.push(
            item("Open link in new tab", "↗", () => window.open(context.link.href, "_blank", "noopener,noreferrer")),
            item("Copy link address", "⌁", () => copyText(context.link.href))
        );
        if (context.image) {
            if (context.link || context.selection) items.push(null);
            items.push(
                item("Open image in new tab", "▧", () => window.open(context.image.currentSrc || context.image.src, "_blank", "noopener,noreferrer")),
                item("Save image", "↓", () => {
                    const url = context.image.currentSrc || context.image.src;
                    const anchor = document.createElement("a");
                    anchor.href = url;
                    anchor.download = (url.split("/").pop() || "image").split("?")[0];
                    anchor.rel = "noopener";
                    document.body.appendChild(anchor);
                    anchor.click();
                    anchor.remove();
                }),
                item("Copy image address", "⌁", () => copyText(context.image.currentSrc || context.image.src))
            );
        }
        if (context.link || context.image || context.selection) items.push(null);
        items.push(
            item("Copy page address", "▣", () => copyText(location.href)),
            item("Share page", "↗", async () => {
                if (navigator.share) {
                    try { await navigator.share({ title: document.title, url: location.href }); }
                    catch (error) { if (error?.name !== "AbortError") console.warn("Share failed:", error); }
                } else await copyText(location.href);
            }),
            item("Print page", "▤", () => window.print(), "Ctrl + P")
        );
        return items;
    };

    const renderMenu = (context, x, y) => {
        if (!menu) {
            menu = document.createElement("div");
            menu.id = "jack105wa-context-menu";
            menu.setAttribute("role", "menu");
            menu.setAttribute("aria-label", "Website context menu");
            menu.setAttribute("aria-hidden", "true");
            menu.style.pointerEvents = "none";
            document.body.appendChild(menu);
        }
        currentItems = buildItems(context);
        menu.replaceChildren();

        currentItems.forEach(entry => {
            if (!entry) {
                const separator = document.createElement("div");
                separator.className = "jctx-separator";
                separator.setAttribute("role", "separator");
                menu.appendChild(separator);
                return;
            }
            const button = document.createElement("button");
            button.type = "button";
            button.className = "jctx-item";
            button.setAttribute("role", "menuitem");
            button.disabled = entry.disabled;
            button.addEventListener("click", async () => {
                closeMenu();
                try { await entry.action(); }
                catch (error) { console.error("Context menu action failed:", error); }
            });

            const icon = document.createElement("span");
            icon.className = "jctx-icon";
            icon.setAttribute("aria-hidden", "true");
            icon.textContent = entry.icon;
            const label = document.createElement("span");
            label.className = "jctx-label";
            label.textContent = entry.label;
            button.append(icon, label);

            if (entry.shortcut) {
                const shortcut = document.createElement("span");
                shortcut.className = "jctx-shortcut";
                shortcut.textContent = entry.shortcut;
                button.appendChild(shortcut);
            }
            menu.appendChild(button);
        });

        menu.style.pointerEvents = "auto";
        menu.setAttribute("aria-hidden", "false");
        menu.dataset.open = "false";
        menu.style.left = "0px";
        menu.style.top = "0px";
        menu.style.visibility = "hidden";
        const bounds = menu.getBoundingClientRect();
        const left = Math.max(8, Math.min(x, window.innerWidth - bounds.width - 8));
        const top = Math.max(8, Math.min(y, window.innerHeight - bounds.height - 8));
        menu.style.left = left + "px";
        menu.style.top = top + "px";
        menu.style.visibility = "visible";
        requestAnimationFrame(() => {
            // Keep the menu from selecting or focusing an item on open.
            // Keyboard navigation begins only after the user presses an arrow key.
            menu.dataset.open = "true";
        });
    };

    document.addEventListener("contextmenu", event => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target || isEditable(target) || isNativeControl(target)) return;
        event.preventDefault();
        renderMenu(getContext(target), event.clientX, event.clientY);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && menu?.dataset.open === "true") {
            event.preventDefault();
            closeMenu();
            return;
        }
        if ((event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) &&
            !isEditable(event.target) && !isNativeControl(event.target)) {
            event.preventDefault();
            const target = event.target instanceof Element ? event.target : document.body;
            const rect = target.getBoundingClientRect();
            renderMenu(getContext(target), Math.min(rect.left + 24, window.innerWidth - 260), Math.min(rect.bottom + 4, window.innerHeight - 300));
            return;
        }
        if (menu?.dataset.open !== "true") return;
        const buttons = [...menu.querySelectorAll(".jctx-item:not(:disabled)")];
        const index = buttons.indexOf(document.activeElement);
        let next = null;
        if (event.key === "ArrowDown") next = buttons[(index + 1) % buttons.length];
        if (event.key === "ArrowUp") next = buttons[(index - 1 + buttons.length) % buttons.length];
        if (event.key === "Home") next = buttons[0];
        if (event.key === "End") next = buttons[buttons.length - 1];
        if (next) { event.preventDefault(); next.focus(); }
    });

    document.addEventListener("pointerdown", event => {
        if (menu && !menu.contains(event.target)) closeMenu();
    });
    document.addEventListener("click", event => {
        if (menu && !menu.contains(event.target)) closeMenu();
    });
    window.addEventListener("blur", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
})();