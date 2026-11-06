(() => {
    function decorate() {
        const downloads = document.querySelector(".downloads");
        if (downloads && !downloads.querySelector(".download-caption")) {
            const h = document.createElement("div");
            h.className = "titlebar download-caption";
            h.setAttribute("data-drag-handle", "");
            h.innerHTML = '<span>Download AppSandbox</span><button aria-label="Minimize downloads">−</button><button aria-label="Maximize downloads">□</button><button aria-label="Close downloads window">×</button>';
            downloads.prepend(h);
            h.children[1].onclick = h.children[3].onclick = () => document.querySelector(".download-close")?.click();
            h.children[2].onclick = () => downloads.classList.toggle("download-maximized");
        }
        const mac = document.querySelector(".host-desktop").classList.contains("mac-host");
        document.querySelectorAll(".manager,.guest-window,.capability-window,.webgl-workload,.agent-sample-app,.downloads").forEach(w => {
            const desktop = w.closest(".guest-desktop");
            const windows = desktop ? desktop.classList.contains("windows") : !mac;
            if (w.classList.contains("windows-native") !== windows) w.classList.toggle("windows-native", windows);
            const bar = w.querySelector(":scope>.titlebar,:scope>.webgl-title,:scope>.agent-sample-title");
            if (!bar) return;
            if (!bar.classList.contains("native-caption")) bar.classList.add("native-caption");
            if (w.matches(".webgl-workload,.agent-sample-app") && !w.dataset.nestedChrome) {
                w.dataset.nestedChrome = "true";
                if (w.matches(".agent-sample-app")) {
                    const title = document.createElement("span");
                    title.textContent = bar.textContent;
                    bar.replaceChildren(title);
                }
                let close = bar.querySelector(".webgl-close");
                if (!close) {
                    close = document.createElement("button");
                    close.textContent = "×";
                    close.setAttribute("aria-label", "Close application");
                    bar.append(close);
                    close.onclick = () => w.remove();
                }
                const caption = w.matches(".webgl-workload") ? "3D workload" : "application";
                const min = document.createElement("button");
                min.textContent = "−";
                min.setAttribute("aria-label", "Minimize " + caption);
                min.onclick = () => {
                    w.hidden = true;
                    const restore = document.createElement("button");
                    restore.className = "guest-app-restore";
                    restore.textContent = w.matches(".webgl-workload") ? "GPU Lab" : bar.querySelector("span")?.textContent.split(" · ")[0] || "Restore application";
                    restore.setAttribute("aria-label", "Restore " + caption);
                    desktop.append(restore);
                    restore.onclick = () => {
                        w.hidden = false;
                        restore.remove();
                    };
                };
                const max = document.createElement("button");
                max.textContent = "□";
                max.setAttribute("aria-label", "Maximize " + caption);
                max.onclick = () => w.classList.toggle("nested-maximized");
                bar.insertBefore(min, close);
                bar.insertBefore(max, close);
            }
            bar.querySelectorAll("button").forEach(b => {
                if (b.classList.contains("terminal-tab-close")) return;
                const label = (b.getAttribute("aria-label") || "").toLowerCase();
                for (const action of [ "minimize", "maximize", "close" ]) if (label.includes(action) && !b.classList.contains("caption-" + action)) b.classList.add("caption-" + action);
            });
        });
    }
    let pending = false;
    new MutationObserver(() => {
        if (!pending) {
            pending = true;
            requestAnimationFrame(() => {
                pending = false;
                decorate();
            });
        }
    }).observe(document.querySelector(".host-desktop"), {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [ "class" ]
    });
    decorate();
})();
