// Talli i18n runtime (vanilla, no framework). Loads generated locale JSON,
// swaps [data-i18n] text, and exposes locale-correct formatters.
// The formatting helpers are the part browser auto-translate can never do.
(function () {
  const SUPPORTED = ["en", "fr", "zh", "pa"];
  const FALLBACK = "en";
  const stored = localStorage.getItem("talli.lang");
  const detected = (navigator.language || "en").slice(0, 2);
  let lang = SUPPORTED.includes(stored) ? stored : SUPPORTED.includes(detected) ? detected : FALLBACK;

  let dict = {};
  let fallbackDict = {};

  async function loadDict(lng) {
    const r = await fetch(`/locales/${lng}.json`, { cache: "no-cache" });
    if (!r.ok) throw new Error(`locale ${lng} ${r.status}`);
    return r.json();
  }

  function t(key) {
    return dict[key] ?? fallbackDict[key] ?? key;
  }

  function apply(root = document) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      // format: "placeholder:key,title:key"
      el.getAttribute("data-i18n-attr").split(",").forEach((pair) => {
        const [attr, key] = pair.split(":");
        if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
      });
    });
    document.documentElement.lang = lang;
  }

  async function setLang(lng) {
    if (!SUPPORTED.includes(lng)) return;
    lang = lng;
    localStorage.setItem("talli.lang", lng);
    dict = await loadDict(lng);
    apply();
    window.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang } }));
  }

  // Locale-aware formatters (CAD benefits context)
  const I18N = {
    t,
    get lang() { return lang; },
    setLang,
    apply,
    supported: SUPPORTED,
    fmtMoney: (n) => new Intl.NumberFormat(lang, { style: "currency", currency: "CAD" }).format(Number(n) || 0),
    fmtDate: (d) => new Intl.DateTimeFormat(lang, { year: "numeric", month: "long", day: "numeric" }).format(d instanceof Date ? d : new Date(d)),
    fmtNum: (n) => new Intl.NumberFormat(lang).format(Number(n) || 0),
  };
  window.I18N = I18N;

  // Boot: load fallback + active dict, then apply once DOM is ready.
  const ready = (async () => {
    fallbackDict = await loadDict(FALLBACK);
    dict = lang === FALLBACK ? fallbackDict : await loadDict(lang).catch(() => fallbackDict);
  })();
  function boot() { ready.then(() => apply()); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
