(() => {
    function update() {
        const now = new Date();
        const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        const date = now.toLocaleDateString();
        const mac = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + "  " + time;
        const ubuntu = now.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + "  " + time;
        document.querySelectorAll(".host-taskbar .tray>span:last-child,.guest-taskbar .tray>span:last-child").forEach(el => {
            const value = time + date;
            if (el.textContent !== value) {
                el.replaceChildren(document.createTextNode(time), document.createElement("br"), document.createTextNode(date));
            }
        });
        for (const [selector, value] of [[".mac-status>span:last-child", mac], [".ubuntu-top>span:nth-child(2)", ubuntu]]) {
            document.querySelectorAll(selector).forEach(el => { if (el.textContent !== value) el.textContent = value; });
        }
    }
    let pending = false;
    new MutationObserver(records => {
        if (pending || !records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches(".host-taskbar,.guest-taskbar,.mac-status,.ubuntu-top") || node.querySelector(".host-taskbar,.guest-taskbar,.mac-status,.ubuntu-top"))))) return;
        pending = true;
        queueMicrotask(() => { pending = false; update(); });
    }).observe(document.body, { childList: true, subtree: true });
    update();
    setInterval(update, 1000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) update(); });
})();
