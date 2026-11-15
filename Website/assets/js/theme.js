(() => {
    "use strict";

    // A fixed seed keeps the star layout identical between visits and resizes.
    const STAR_SEED = 0x105A105;

    function createRandom(seed) {
        let state = seed >>> 0;
        return function random() {
            state += 0x6D2B79F5;
            let value = state;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
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
            const scale = 0.42;
            width = Math.max(1, Math.ceil(window.innerWidth * scale));
            height = Math.max(1, Math.ceil(window.innerHeight * scale));
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = "100%";
            canvas.style.height = "100%";

            const random = createRandom(STAR_SEED);
            const count = Math.min(1100, Math.max(420, Math.floor(width * height / 620)));
            stars.length = 0;

            for (let i = 0; i < count; i++) {
                const tone = random();
                let color;

                if (tone < 0.18) {
                    color = [255, 190 + Math.floor(random() * 35), 125 + Math.floor(random() * 55)];
                } else if (tone < 0.34) {
                    color = [255, 225 + Math.floor(random() * 25), 190 + Math.floor(random() * 40)];
                } else if (tone < 0.52) {
                    color = [145 + Math.floor(random() * 55), 205 + Math.floor(random() * 40), 255];
                } else if (tone < 0.67) {
                    color = [175 + Math.floor(random() * 55), 245, 235 + Math.floor(random() * 20)];
                } else {
                    color = [
                        235 + Math.floor(random() * 20),
                        235 + Math.floor(random() * 20),
                        235 + Math.floor(random() * 20)
                    ];
                }

                const sizeRoll = random();
                stars.push({
                    x: random() * width,
                    y: random() * height,
                    size: sizeRoll < 0.035 ? 3 : (sizeRoll < 0.24 ? 2 : 1),
                    phase: random() * Math.PI * 2,
                    speed: 0.008 + random() * 0.035,
                    brightness: 0.3 + random() * 0.7,
                    color
                });
            }
        }

        function draw() {
            context.fillStyle = "#08090b";
            context.fillRect(0, 0, width, height);

            const haze = context.createRadialGradient(
                width * 0.5,
                height * 0.45,
                0,
                width * 0.5,
                height * 0.45,
                Math.max(width, height) * 0.8
            );
            haze.addColorStop(0, "rgba(115,105,100,.075)");
            haze.addColorStop(1, "rgba(8,9,11,0)");
            context.fillStyle = haze;
            context.fillRect(0, 0, width, height);

            for (const star of stars) {
                const twinkle = reducedMotion
                    ? 1
                    : 0.2 + ((Math.sin(frame * star.speed + star.phase) + 1) / 2) * 0.8;
                const alpha = Math.max(0.12, twinkle * star.brightness);
                const [r, g, b] = star.color;
                context.fillStyle = `rgba(${r},${g},${b},${alpha})`;

                const x = Math.round(star.x);
                const y = Math.round(star.y);
                context.fillRect(x, y, star.size, star.size);

                if (star.size === 3 && alpha > 0.72) {
                    context.fillRect(x - 1, y + 1, 1, 1);
                    context.fillRect(x + 3, y + 1, 1, 1);
                }
            }

            frame++;
            if (!reducedMotion && !document.hidden) {
                animationId = window.requestAnimationFrame(draw);
            }
        }

        function restart() {
            window.cancelAnimationFrame(animationId);
            resize();
            draw();
        }

        restart();
        window.addEventListener("resize", restart, { passive: true });
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                window.cancelAnimationFrame(animationId);
            } else if (!reducedMotion) {
                draw();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createStarfield, { once: true });
    } else {
        createStarfield();
    }
})();
