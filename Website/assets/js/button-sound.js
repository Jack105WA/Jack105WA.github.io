// Low-volume Nintendo 3DS-style click feedback for site controls.
(() => {
    "use strict";

    const soundUrl = "/assets/3ds%20button.mp3";
    const template = new Audio(soundUrl);
    template.preload = "auto";
    const volume = 0.12;

    document.addEventListener("click", (event) => {
        const control = event.target instanceof Element
            ? event.target.closest('button, a[href], input[type="button"], input[type="submit"], input[type="reset"], [role="button"]')
            : null;

        if (!control || control.matches(":disabled, [aria-disabled='true']")) return;

        const audio = template.cloneNode();
        audio.volume = volume;
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }, true);
})();
