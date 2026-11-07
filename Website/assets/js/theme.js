(() => {
"use strict";
const DEFAULTS={backgroundTop:"#0065fd",backgroundBottom:"#002e73",panel:"#995533",panelBorder:"#63351e",accent:"#ffc800",text:"#ffffff"};
const COOKIE="jack105wa_theme";
const VARS={backgroundTop:"--blue-top",backgroundBottom:"--blue-bottom",panel:"--brown",panelBorder:"--brown-border",accent:"--gold",text:"--site-text"};
function read(){const item=document.cookie.split("; ").find(x=>x.startsWith(COOKIE+"="));if(!item)return null;try{const v=JSON.parse(decodeURIComponent(item.slice(COOKIE.length+1)));return Object.fromEntries(Object.entries(DEFAULTS).map(([k,d])=>[k,typeof v[k]==="string"&&/^#[0-9a-f]{6}$/i.test(v[k])?v[k]:d]));}catch{return null;}}
function apply(value){const active=!!value,theme=value||DEFAULTS;for(const [key,variable] of Object.entries(VARS))document.documentElement.style.setProperty(variable,theme[key]||DEFAULTS[key]);document.documentElement.dataset.customTheme=active?"true":"false";}
window.Jack105WATheme={defaults:{...DEFAULTS},apply,save(value){const safe=Object.fromEntries(Object.entries(DEFAULTS).map(([k,d])=>[k,typeof value[k]==="string"&&/^#[0-9a-f]{6}$/i.test(value[k])?value[k]:d]));document.cookie=COOKIE+"="+encodeURIComponent(JSON.stringify(safe))+"; Path=/; Max-Age=31536000; SameSite=Lax";apply(safe);},reset(){document.cookie=COOKIE+"=; Path=/; Max-Age=0; SameSite=Lax";apply(null);},current(){return read()||{...DEFAULTS};},isCustom(){return !!read();}};
apply(read());
})();