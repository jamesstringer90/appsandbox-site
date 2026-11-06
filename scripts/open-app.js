document.querySelector(".demo-caption a").addEventListener("click", e => {
    e.preventDefault();
    const w = window.open("", "_blank");
    if (w) {
        w.document.open();
        w.document.write(window.__APP_DOCS[document.querySelector("#app").dataset.host || "windows"]);
        w.document.close();
    }
});
