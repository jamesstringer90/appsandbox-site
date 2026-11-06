(() => {
    const sync = () => {
        const mac = document.querySelector("[data-os][aria-pressed=true]")?.dataset.os.startsWith("mac");
        document.querySelectorAll("[data-host-choice]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.hostChoice === "mac" === mac)));
    };
    document.querySelectorAll("[data-host-choice]").forEach(b => b.onclick = () => {
        document.querySelector('[data-os="' + b.dataset.hostChoice + '"]').click();
        sync();
    });
    new MutationObserver(sync).observe(document.querySelector(".guest-tabs"), {
        subtree: true,
        attributes: true,
        attributeFilter: [ "aria-pressed" ]
    });
    sync();
})();
