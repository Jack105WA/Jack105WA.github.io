(() => {
"use strict";

const DEFAULTS = {
    backgroundTop: "#0065fd",
    backgroundBottom: "#002e73",
    panel: "#995533",
    panelBorder: "#63351e",
    accent: "#ffc800",
    text: "#ffffff"
};
const COOKIE = "jack105wa_theme";
const VARS = {
    backgroundTop: "--blue-top",
    backgroundBottom: "--blue-bottom",
    panel: "--brown",
    panelBorder: "--brown-border",
    accent: "--gold",
    text: "--site-text"
};

function read() {
    const item = document.cookie.split("; ").find(value => value.startsWith(COOKIE + "="));
    if (!item) return null;
    try {
        const value = JSON.parse(decodeURIComponent(item.slice(COOKIE.length + 1)));
        return Object.fromEntries(Object.entries(DEFAULTS).map(([key, fallback]) => [
            key,
            typeof value[key] === "string" && /^#[0-9a-f]{6}$/i.test(value[key])
                ? value[key]
                : fallback
        ]));
    } catch {
        return null;
    }
}

function apply(value) {
    const active = !!value;
    const theme = value || DEFAULTS;
    for (const [key, variable] of Object.entries(VARS)) {
        document.documentElement.style.setProperty(variable, theme[key] || DEFAULTS[key]);
    }
    document.documentElement.dataset.customTheme = active ? "true" : "false";
}

function createStarfield() {
    if (document.getElementById("jack105wa-starfield")) return;

    const canvas = document.createElement("canvas");
    canvas.id = "jack105wa-starfield";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stars = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    let animationId = 0;

    function resize() {
        const scale = 0.35;
        width = Math.max(1, Math.ceil(window.innerWidth * scale));
        height = Math.max(1, Math.ceil(window.innerHeight * scale));
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = "100%";
        canvas.style.height = "100%";

        const count = Math.min(230, Math.max(90, Math.floor(width * height / 1500)));
        stars.length = 0;
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() < 0.12 ? 2 : 1,
                phase: Math.random() * Math.PI * 2,
                speed: 0.012 + Math.random() * 0.025,
                brightness: 0.35 + Math.random() * 0.65,
                tint: Math.random()
            });
        }
    }

    function draw() {
        context.fillStyle = "#050817";
        context.fillRect(0, 0, width, height);

        const glow = context.createRadialGradient(
            width * 0.5, height * 0.38, 0,
            width * 0.5, height * 0.38, Math.max(width, height) * 0.8
        );
        glow.addColorStop(0, "rgba(29, 49, 100, 0.35)");
        glow.addColorStop(1, "rgba(5, 8, 23, 0)");
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);

        for (const star of stars) {
            const pulse = reducedMotion
                ? star.brightness
                : 0.22 + ((Math.sin(frame * star.speed + star.phase) + 1) / 2) * 0.78;
            const alpha = Math.max(0.12, pulse * star.brightness);
            context.fillStyle = star.tint > 0.84
                ? `rgba(151, 184, 255, ${alpha})`
                : star.tint > 0.55
                    ? `rgba(211, 224, 255, ${alpha})`
                    : `rgba(255, 255, 255, ${alpha})`;
            context.fillRect(
                Math.round(star.x),
                Math.round(star.y),
                star.size,
                star.size
            );
        }

        frame++;
        if (!reducedMotion) animationId = window.requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", () => {
        window.cancelAnimationFrame(animationId);
        resize();
        draw();
    }, { passive: true });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) window.cancelAnimationFrame(animationId);
        else if (!reducedMotion) draw();
    });
}

window.Jack105WATheme = {
    defaults: { ...DEFAULTS },
    apply,
    save(value) {
        const safe = Object.fromEntries(Object.entries(DEFAULTS).map(([key, fallback]) => [
            key,
            typeof value[key] === "string" && /^#[0-9a-f]{6}$/i.test(value[key])
                ? value[key]
                : fallback
        ]));
        document.cookie = COOKIE + "=" + encodeURIComponent(JSON.stringify(safe)) +
            "; Path=/; Max-Age=31536000; SameSite=Lax";
        apply(safe);
    },
    reset() {
        document.cookie = COOKIE + "=; Path=/; Max-Age=0; SameSite=Lax";
        apply(null);
    },
    current() {
        return read() || { ...DEFAULTS };
    },
    isCustom() {
        return !!read();
    }
};

apply(read());
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createStarfield, { once: true });
} else {
    createStarfield();
}
})();