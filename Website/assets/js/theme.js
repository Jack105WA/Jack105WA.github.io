(() => {
"use strict";
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
    let width = 0, height = 0, frame = 0, animationId = 0;

    function resize() {
        const scale = 0.42;
        width = Math.max(1, Math.ceil(window.innerWidth * scale));
        height = Math.max(1, Math.ceil(window.innerHeight * scale));
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        const count = Math.min(1100, Math.max(420, Math.floor(width * height / 620)));
        stars.length = 0;
        for (let i = 0; i < count; i++) {
            const t = Math.random();
            let color;
            if (t < .18) color = [255, 190 + Math.floor(Math.random()*35), 125 + Math.floor(Math.random()*55)];
            else if (t < .34) color = [255, 225 + Math.floor(Math.random()*25), 190 + Math.floor(Math.random()*40)];
            else if (t < .52) color = [145 + Math.floor(Math.random()*55), 205 + Math.floor(Math.random()*40), 255];
            else if (t < .67) color = [175 + Math.floor(Math.random()*55), 245, 235 + Math.floor(Math.random()*20)];
            else color = [235 + Math.floor(Math.random()*20), 235 + Math.floor(Math.random()*20), 235 + Math.floor(Math.random()*20)];
            stars.push({
                x: Math.random()*width, y: Math.random()*height,
                size: Math.random() < .035 ? 3 : (Math.random() < .24 ? 2 : 1),
                phase: Math.random()*Math.PI*2, speed: .008 + Math.random()*.035,
                brightness: .3 + Math.random()*.7, color
            });
        }
    }

    function draw() {
        context.fillStyle = "#08090b";
        context.fillRect(0, 0, width, height);
        const haze = context.createRadialGradient(width*.5, height*.45, 0, width*.5, height*.45, Math.max(width,height)*.8);
        haze.addColorStop(0, "rgba(115,105,100,.075)");
        haze.addColorStop(1, "rgba(8,9,11,0)");
        context.fillStyle = haze;
        context.fillRect(0, 0, width, height);
        for (const star of stars) {
            const twinkle = reducedMotion ? 1 : .2 + ((Math.sin(frame*star.speed+star.phase)+1)/2)*.8;
            const alpha = Math.max(.12, twinkle*star.brightness);
            const [r,g,b] = star.color;
            context.fillStyle = `rgba(${r},${g},${b},${alpha})`;
            const x = Math.round(star.x), y = Math.round(star.y);
            context.fillRect(x,y,star.size,star.size);
            if (star.size === 3 && alpha > .72) {
                context.fillRect(x-1,y+1,1,1);
                context.fillRect(x+3,y+1,1,1);
            }
        }
        frame++;
        if (!reducedMotion && !document.hidden) animationId = window.requestAnimationFrame(draw);
    }
    function restart() {
        window.cancelAnimationFrame(animationId);
        resize();
        draw();
    }
    restart();
    window.addEventListener("resize", restart, { passive: true });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) window.cancelAnimationFrame(animationId);
        else if (!reducedMotion) draw();
    });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createStarfield, { once: true });
else createStarfield();
})();