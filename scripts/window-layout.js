(() => {
    const selector = ".manager,.guest-window,.capability-window";
    const host = document.querySelector(".host-desktop");
    if (!host) return;
    const layouts = new WeakMap;
    let scheduled = false, applying = false, lastGeometry = null;
    const shown = e => !e.hidden && (!e.matches(".guest-window") || e.classList.contains("connected")) && e.getBoundingClientRect().width > 0;
    const maximized = e => e.matches(".maximized,.shell-maximized,.nested-maximized");
    const smallScreen = () => window.matchMedia ? window.matchMedia("(max-width:650px)").matches : host.clientWidth <= 650;
    function set(e, x, y, w, h) {
        if (maximized(e)) return;
        w = Math.max(1, w);
        h = Math.max(1, h);
        if (e.matches(".agent-display") && !e.dataset.initialLayout) e.dataset.initialLayout = JSON.stringify({
            x: x,
            y: y,
            w: w,
            h: h
        });
        delete e.dataset.userPlaced;
        e.classList.add("window-user-sized");
        Object.assign(e.style, {
            left: x + "px",
            top: y + "px",
            right: "auto",
            bottom: "auto",
            width: w + "px",
            height: h + "px",
            transform: "none"
        });
    }
    // Track browser toolbar changes without treating pinch zoom as a resize.
    function syncMobileViewport() {
        const viewport = window.visualViewport;
        if (!smallScreen() || (viewport && viewport.scale !== 1)) return;
        document.documentElement.style.setProperty("--mobile-viewport-height", (viewport?.height || window.innerHeight) + "px");
    }
    function arrange() {
        syncMobileViewport();
        scheduled = false;
        if (applying || document.body.classList.contains("window-drag-active")) return;
        const all = [ ...host.querySelectorAll(selector) ].filter(shown);
        if (!all.length) return;
        const hr = host.getBoundingClientRect();
        const sx = hr.width / (host.offsetWidth || hr.width || 1), sy = hr.height / (host.offsetHeight || hr.height || 1);
        if (!sx || !sy) return;
        const W = host.clientWidth, small = smallScreen();
        const b = window.WindowDrag?.workArea(all[0]) || {
            left: hr.left,
            top: hr.top,
            right: hr.right,
            bottom: hr.bottom
        };
        const x = Math.max(small ? 8 : 84, (b.left - hr.left) / sx + 8);
        const y = Math.max(small ? 8 : 34, (b.top - hr.top) / sy + 8);
        const w = Math.max(1, (b.right - hr.left) / sx - x - 8);
        const h = Math.max(1, (b.bottom - hr.top) / sy - y - 8), gap = 12;
        if (w < 80 || h < 60) return;
        const geometry = [ W, host.clientHeight, x, y, w, h, small, host.classList.contains("mac-host") ].join("|");
        const key = e => geometry + "|" + maximized(e);
        const pending = all.filter(e => layouts.get(e) !== key(e));
        if (!pending.length) return;
        applying = true;
        try {
            if (small && host.querySelector(".agent-terminal")) {
                for (const e of all) {
                    if (e.matches(".agent-terminal")) set(e, x, y, w, h); else if (e.matches(".agent-display")) {
                        const i = e.classList.contains("agent-windows") ? 0 : 1;
                        set(e, x, y + i * (h / 2 + 4), w, h / 2 - 4);
                    }
                }
            } else {
                if (all.length === 1) {
                    const eh = Math.min(h, w / 1.837), ew = Math.min(w, eh * 1.837);
                    set(all[0], x, y, ew, eh);
                } else {
                    const manager = all.find(e => e.matches(".manager")), others = all.filter(e => e !== manager);
                    if (small) {
                        let top = y, space = h;
                        if (manager) {
                            const mh = Math.min(w / 1.837, Math.max(1, h - gap * others.length) / (others.length + 1));
                            set(manager, x, y, w, mh);
                            top += mh + gap;
                            space -= mh + gap;
                        }
                        const eh = Math.max(1, (space - gap * (others.length - 1)) / Math.max(1, others.length));
                        others.forEach((e, i) => set(e, x, top + i * (eh + gap), w, eh));
                    } else {
                        const left = (w - gap) * .49, right = w - left - gap;
                        const term = others.find(e => e.matches(".capability-window")), guests = others.filter(e => e !== term);
                        const mh = Math.min(left / 1.837, term ? Math.max(1, (h - gap) * .55) : h);
                        if (manager) set(manager, x, y, left, mh);
                        if (term) set(term, x, y + (manager ? mh + gap : 0), left, h - (manager ? mh + gap : 0));
                        const cells = guests.length ? guests : !term ? others : [];
                        const slots = all.some(e => e.matches(".agent-terminal")) ? Math.max(2, cells.length) : Math.max(1, cells.length);
                        const eh = Math.max(1, (h - gap * (slots - 1)) / slots);
                        cells.forEach((e, i) => set(e, x + left + gap, y + i * (eh + gap), right, eh));
                    }
                }
            }
            if (lastGeometry && lastGeometry !== geometry) {
                host.querySelectorAll(".agent-sample-app,.webgl-workload").forEach(e => {
                    if (maximized(e)) return;
                    window.WindowDrag?.reset(e);
                    delete e.dataset.userPlaced;
                    e.classList.remove("window-user-sized");
                    for (const p of [ "left", "top", "right", "bottom", "width", "height", "transform" ]) e.style.removeProperty(p);
                });
            }
            lastGeometry = geometry;
            all.forEach(e => layouts.set(e, key(e)));
            window.WindowDrag?.refresh();
            window.WindowDrag?.constrain();
        } finally {
            applying = false;
        }
    }
    window.arrangeDesktop = arrange;
    function schedule() {
        if (!scheduled) {
            scheduled = true;
            setTimeout(arrange, 0);
        }
    }
    document.addEventListener("window-drag", e => {
        if (e.detail?.phase === "end" || e.detail?.phase === "cancel") schedule();
    });
    document.addEventListener("click", e => {
        if (e.target.closest("[data-host-choice],[data-os],#replay")) {
            host.querySelectorAll(selector).forEach(el => {
                delete el.dataset.userPlaced;
                layouts.delete(el);
            });
            schedule();
        }
    });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    if (typeof ResizeObserver === "function") new ResizeObserver(schedule).observe(host);
    new MutationObserver(schedule).observe(host, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [ "class", "hidden" ]
    });
    schedule();
})();
