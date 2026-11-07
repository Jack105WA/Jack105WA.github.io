(() => {
"use strict";
const theme=window.Jack105WATheme,form=document.getElementById("settings-form"),status=document.getElementById("settings-status"),reset=document.getElementById("reset-settings");
const keys=["backgroundTop","backgroundBottom","panel","panelBorder","accent","text"];
const inputs=Object.fromEntries(keys.map(k=>[k,document.getElementById("setting-"+k)]));
const presets={
midnight:{backgroundTop:"#171b35",backgroundBottom:"#080b18",panel:"#292d49",panelBorder:"#11152b",accent:"#8c9eff",text:"#ffffff"},
ocean:{backgroundTop:"#00a6b8",backgroundBottom:"#003c68",panel:"#12617a",panelBorder:"#07394f",accent:"#ffe082",text:"#ffffff"},
forest:{backgroundTop:"#347c50",backgroundBottom:"#102f28",panel:"#356b48",panelBorder:"#1b422b",accent:"#d9ed92",text:"#ffffff"},
sunset:{backgroundTop:"#ef795b",backgroundBottom:"#592c62",panel:"#8d4c5c",panelBorder:"#512b43",accent:"#ffe08a",text:"#ffffff"}};
function values(){return Object.fromEntries(keys.map(k=>[k,inputs[k].value]));}
function fill(v,preview=true){keys.forEach(k=>inputs[k].value=v[k]||theme.defaults[k]);if(preview)theme.apply(values());}
const hasSavedTheme=theme.isCustom();
fill(theme.current(),hasSavedTheme);
if(hasSavedTheme)status.textContent="Your saved browser theme is active.";
keys.forEach(k=>inputs[k].addEventListener("input",()=>{theme.apply(values());status.textContent="Previewing locally. Save Theme to keep this palette in a cookie.";}));
document.querySelectorAll("[data-preset]").forEach(b=>b.addEventListener("click",()=>{fill(presets[b.dataset.preset]||theme.defaults);status.textContent="Preset previewed. Save Theme to store it in this browser.";}));
form.addEventListener("submit",e=>{e.preventDefault();theme.save(values());status.textContent="Theme saved in this browser's cookie. It applies only on this device and browser.";});
reset.addEventListener("click",()=>{theme.reset();fill(theme.defaults,false);status.textContent="Browser theme reset to the default Geometry Dash palette.";});
})();