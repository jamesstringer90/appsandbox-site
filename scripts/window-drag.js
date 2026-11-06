(() => {
    "use strict";
    if (window.WindowDrag) return;
    const selector = ".manager,.guest-window,.capability-window,.webgl-workload,.agent-sample-app,.downloads";
    const controls = 'button,a,input,textarea,select,option,[contenteditable="true"],[role="button"],.window-controls,[data-no-drag]';
    const properties = [ "left", "top", "right", "bottom", "width", "height", "transform", "box-sizing", "min-width", "min-height", "max-width", "max-height" ];
    const records = new Map;
    let active = null, order = 0, frame = 0;
    const css = document.createElement("style");
    css.textContent = "[data-window-drag-handle]{touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none}[data-window-drag-handle]:focus-visible{outline:2px solid #78baff;outline-offset:-3px}.window-dragging{transition:none!important}.window-dragging>[data-window-drag-handle]{cursor:grabbing}body.window-drag-active,body.window-drag-active *{user-select:none!important;-webkit-user-select:none!important}";
    css.textContent += `.window-resize{position:absolute;z-index:80;touch-action:none;user-select:none}.resize-n,.resize-s{left:12px;right:12px;height:7px;cursor:ns-resize}.resize-n{top:0}.resize-s{bottom:0}.resize-e,.resize-w{top:12px;bottom:12px;width:7px;cursor:ew-resize}.resize-e{right:0}.resize-w{left:0}.resize-ne,.resize-nw,.resize-se,.resize-sw{width:14px;height:14px}.resize-ne{right:0;top:0;cursor:nesw-resize}.resize-nw{left:0;top:0;cursor:nwse-resize}.resize-se{right:0;bottom:0;cursor:nwse-resize;background:repeating-linear-gradient(135deg,transparent 0 3px,#9aa8b488 3px 4px);clip-path:polygon(100% 0,100% 100%,0 100%)}.resize-sw{left:0;bottom:0;cursor:nesw-resize}.maximized>.window-resize{display:none}.window-user-sized>.guest-desktop{height:calc(100% - 32px)!important;aspect-ratio:auto!important}.window-user-sized{min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;box-sizing:border-box!important}.window-user-sized.manager iframe{height:calc(100% - 32px)!important}.window-resize:focus-visible{outline:2px solid #8abaff}@media(pointer:coarse){.window-resize{min-width:12px;min-height:12px}.resize-se,.resize-ne,.resize-nw,.resize-sw{width:22px;height:22px}}`;
    css.textContent += ".host-desktop [data-window-workarea]:is(.maximized,.shell-maximized,.nested-maximized),body .downloads[data-window-workarea].download-maximized{left:var(--window-work-left)!important;top:var(--window-work-top)!important;right:auto!important;bottom:auto!important;width:var(--window-work-width)!important;height:var(--window-work-height)!important;transform:none!important}.host-desktop [data-window-workarea]:is(.maximized,.shell-maximized,.nested-maximized)>.window-resize{display:none}";
    document.head.append(css);
    const element = target => target instanceof Element ? target : target?.parentElement;
    const visible = el => el.isConnected && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
    const shown = el => visible(el) && (!el.matches(".guest-window") || el.classList.contains("connected"));
    const maxClasses = [ "maximized", "shell-maximized", "nested-maximized", "download-maximized" ];
    const isMaximized = el => maxClasses.some(c => el.classList.contains(c));
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    function handleFor(el) {
        if (el.matches(".downloads") && ![ "fixed", "absolute" ].includes(getComputedStyle(el).position)) return null;
        if (el.matches(".downloads")) return el.querySelector(":scope>.download-titlebar,:scope>[data-drag-handle],:scope>.titlebar") || el.querySelector(":scope>div:first-of-type");
        return el.querySelector(":scope>.titlebar,:scope>.webgl-title,:scope>.agent-sample-title,:scope>[data-drag-handle]");
    }
    function containerFor(el) {
        if (el.matches(".downloads")) return null;
        return el.parentElement?.closest(".guest-desktop,.host-desktop") || el.offsetParent;
    }
    function remember(el) {
        let record = records.get(el);
        if (!record) {
            record = {
                el: el,
                original: {},
                moved: false,
                shown: false,
                maximized: isMaximized(el),
                order: ++order
            };
            for (const key of properties) record.original[key] = [ el.style.getPropertyValue(key), el.style.getPropertyPriority(key) ];
            records.set(el, record);
            sizeObserver?.observe(el);
            const parent = containerFor(el);
            if (parent) sizeObserver?.observe(parent);
        }
        const handle = handleFor(el);
        if (handle && record.handle !== handle) {
            record.handle = handle;
            handle.setAttribute("data-window-drag-handle", "");
            if (!handle.hasAttribute("tabindex")) handle.tabIndex = 0;
            if (!handle.hasAttribute("title")) handle.title = "Drag to move. Use arrow keys while focused; Shift moves farther.";
            handle.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown ArrowLeft ArrowRight");
        }
        if (handle && !el.querySelector(":scope>.window-resize")) {
            for (const dir of [ "n", "s", "e", "w", "ne", "nw", "se", "sw" ]) {
                const grip = document.createElement("span");
                grip.className = "window-resize resize-" + dir;
                grip.dataset.resize = dir;
                grip.tabIndex = dir === "se" ? 0 : -1;
                grip.setAttribute("role", "separator");
                grip.setAttribute("aria-label", "Resize window");
                grip.title = "Drag to resize. Arrow keys resize when focused.";
                el.append(grip);
            }
        }
        return record;
    }
    function restore(record) {
        for (const [key, [value, priority]] of Object.entries(record.original)) {
            if (value) record.el.style.setProperty(key, value, priority); else record.el.style.removeProperty(key);
        }
        record.moved = false;
        record.resized = false;
        record.el.classList.remove("window-user-sized");
    }
    function raise(el) {
        const chain = [];
        for (let node = el; node; node = node.parentElement?.closest(selector)) chain.unshift(node);
        for (const node of chain) {
            const record = records.get(node);
            if (!record) continue;
            record.order = ++order;
            if (node.matches(".downloads")) {
                node.style.zIndex = "100";
                continue;
            }
            const container = containerFor(node);
            const group = [ ...records.values() ].filter(r => r.el.isConnected && containerFor(r.el) === container && !r.el.matches(".downloads")).sort((a, b) => a.order - b.order);
            group.forEach((r, i) => {
                r.el.style.zIndex = String(3 + i);
            });
        }
    }
    function area(el) {
        const parent = containerFor(el) || (document.querySelector(".host-desktop.mac-host") && el.matches(".downloads") ? document.querySelector(".host-desktop") : null);
        const viewport = {
            left: 0,
            top: 0,
            right: document.documentElement.clientWidth,
            bottom: window.innerHeight
        };
        if (!parent) return viewport;
        const r = parent.getBoundingClientRect();
        const sx = r.width / (parent.offsetWidth || r.width || 1), sy = r.height / (parent.offsetHeight || r.height || 1);
        const bounds = {
            left: Math.max(viewport.left, r.left + parent.clientLeft * sx),
            top: Math.max(viewport.top, r.top + parent.clientTop * sy),
            right: Math.min(viewport.right, r.left + (parent.clientLeft + parent.clientWidth) * sx),
            bottom: Math.min(viewport.bottom, r.top + (parent.clientTop + parent.clientHeight) * sy)
        };
        const top = parent.querySelector(":scope>.mac-scene>.mac-menu,:scope>.host-wallpaper .mac-menu,:scope>.ubuntu-top");
        const bottom = parent.querySelector(":scope>.host-taskbar,:scope>.guest-taskbar");
        const dock = parent.querySelector(":scope>.mac-scene>.mac-dock,:scope>.host-taskbar>.mac-dock");
        if (top && visible(top)) bounds.top = Math.max(bounds.top, top.getBoundingClientRect().bottom);
        for (const bar of [ bottom, dock ]) if (bar && visible(bar) && bar.getBoundingClientRect().height > 0) bounds.bottom = Math.min(bounds.bottom, bar.getBoundingClientRect().top - (parent.matches(".mac,.mac-host") ? 6 : 0));
        if (parent.matches(".host-desktop")) {
            const choice = document.querySelector(".host-choice");
            if (choice && visible(choice)) {
                const cr = choice.getBoundingClientRect();
                if (cr.top > bounds.top + (bounds.bottom - bounds.top) * .55) bounds.bottom = Math.min(bounds.bottom, cr.top - 8);
            }
        }
        bounds.right = Math.max(bounds.left, bounds.right);
        bounds.bottom = Math.max(bounds.top, bounds.bottom);
        return bounds;
    }
    function limit(el, x, y) {
        const r = el.getBoundingClientRect(), b = area(el);
        const lowX = r.width > b.right - b.left ? b.right - r.width : b.left;
        const highX = r.width > b.right - b.left ? b.left : b.right - r.width;
        const handleHeight = records.get(el)?.handle?.getBoundingClientRect().height || 28;
        const highY = b.bottom - Math.min(r.height, Math.max(handleHeight, b.bottom - b.top));
        return {
            x: clamp(x, lowX, Math.max(lowX, highX)),
            y: clamp(y, b.top, Math.max(b.top, highY))
        };
    }
    function position(el, x, y) {
        const parent = getComputedStyle(el).position === "fixed" ? null : el.offsetParent;
        let left = x, top = y;
        if (parent) {
            const r = parent.getBoundingClientRect();
            const sx = r.width / (parent.offsetWidth || r.width || 1), sy = r.height / (parent.offsetHeight || r.height || 1);
            left = (x - r.left) / sx - parent.clientLeft + parent.scrollLeft;
            top = (y - r.top) / sy - parent.clientTop + parent.scrollTop;
        }
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;
        el.style.right = "auto";
        el.style.bottom = "auto";
    }
    function prepare(record) {
        const el = record.el, r = el.getBoundingClientRect();
        if (el.matches(".webgl-workload") && !record.moved) {
            const parent = el.offsetParent, pr = parent.getBoundingClientRect();
            el.style.boxSizing = "border-box";
            el.style.width = `${r.width / pr.width * 100}%`;
            el.style.height = `${r.height / pr.height * 100}%`;
        }
        if (el.matches(".downloads")) el.style.transform = "none";
        position(el, r.left, r.top);
        record.moved = true;
    }
    function move(record, x, y) {
        const p = limit(record.el, x, y);
        position(record.el, p.x, p.y);
        record.moved = true;
    }
    function resize(record, dir, start, dx, dy) {
        const el = record.el, b = area(el);
        let l = start.left, t = start.top, r = start.right, d = start.bottom;
        const mw = Math.min(el.matches(".agent-sample-app,.webgl-workload") ? 160 : 260, b.right - b.left), mh = Math.min(el.matches(".manager") ? 155 : 120, b.bottom - b.top);
        if (dir.includes("e")) r = clamp(r + dx, l + mw, b.right);
        if (dir.includes("s")) d = clamp(d + dy, t + mh, b.bottom);
        if (dir.includes("w")) l = clamp(l + dx, b.left, r - mw);
        if (dir.includes("n")) t = clamp(t + dy, b.top, d - mh);
        l = Math.max(b.left, l);
        t = Math.max(b.top, t);
        r = Math.min(b.right, r);
        d = Math.min(b.bottom, d);
        const parent = getComputedStyle(el).position === "fixed" ? null : el.offsetParent;
        const pr = parent?.getBoundingClientRect(), sx = parent ? pr.width / (parent.offsetWidth || pr.width) : 1, sy = parent ? pr.height / (parent.offsetHeight || pr.height) : 1;
        el.classList.add("window-user-sized");
        el.style.width = Math.max(1, (r - l) / sx) + "px";
        el.style.height = Math.max(1, (d - t) / sy) + "px";
        position(el, l, t);
        record.moved = true;
        record.resized = true;
        el.dispatchEvent(new CustomEvent("window-resize", {
            bubbles: true
        }));
    }
    function notify(phase, el) {
        el.dispatchEvent(new CustomEvent("window-drag", {
            bubbles: true,
            detail: {
                phase: phase,
                window: el
            }
        }));
    }
    function finish(cancel = false) {
        if (!active) return;
        const state = active;
        active = null;
        if (cancel) {
            for (const [key, value] of Object.entries(state.before)) value ? state.record.el.style.setProperty(key, value) : state.record.el.style.removeProperty(key);
            state.record.moved = state.wasMoved;
            if (state.wasMaximized) {
                state.record.maximized = true;
                state.record.el.classList.add(state.maxClass || "maximized");
            }
        }
        state.record.el.classList.remove("window-dragging");
        document.body.classList.remove("window-drag-active");
        try {
            if (state.handle.hasPointerCapture(state.pointerId)) state.handle.releasePointerCapture(state.pointerId);
        } catch (_) {}
        notify(cancel ? "cancel" : "end", state.record.el);
    }
    function refresh(root = document) {
        if (root instanceof Element && root.matches(selector)) remember(root);
        root.querySelectorAll?.(selector).forEach(remember);
        for (const [el] of records) if (!el.isConnected) {
            sizeObserver?.unobserve(el);
            records.delete(el);
        }
    }
    function reconcileVisibility() {
        for (const record of records.values()) {
            const now = shown(record.el);
            if (now && !record.shown) raise(record.el);
            record.shown = now;
        }
    }
    function constrain() {
        for (const record of records.values()) if (shown(record.el) && active?.record !== record) {
            const el = record.el, b = area(el);
            if (b.right - b.left < 80 || b.bottom - b.top < 60) continue;
            const parent = getComputedStyle(el).position === "fixed" ? null : el.offsetParent;
            const pr = parent?.getBoundingClientRect(), sx = parent ? pr.width / (parent.offsetWidth || pr.width) : 1, sy = parent ? pr.height / (parent.offsetHeight || pr.height) : 1;
            const originX = parent ? pr.left + (parent.clientLeft - parent.scrollLeft) * sx : 0, originY = parent ? pr.top + (parent.clientTop - parent.scrollTop) * sy : 0;
            const width = Math.max(1, (b.right - b.left) / sx), height = Math.max(1, (b.bottom - b.top) / sy);
            el.dataset.windowWorkarea = "true";
            for (const [k, v] of Object.entries({
                left: (b.left - originX) / sx,
                top: (b.top - originY) / sy,
                width: width,
                height: height
            })) el.style.setProperty("--window-work-" + k, v + "px");
            if (isMaximized(el)) continue;
            let r = el.getBoundingClientRect();
            if (r.width > b.right - b.left + .5 || r.height > b.bottom - b.top + .5) {
                el.classList.add("window-user-sized");
                el.style.width = Math.min(r.width / sx, width) + "px";
                el.style.height = Math.min(r.height / sy, height) + "px";
                record.moved = true;
                r = el.getBoundingClientRect();
            }
            const p = limit(el, r.left, r.top);
            if (Math.abs(r.left - p.x) > .5 || Math.abs(r.top - p.y) > .5) {
                position(el, p.x, p.y);
                record.moved = true;
            }
        }
    }
    function scheduleConstrain() {
        if (!frame) frame = requestAnimationFrame(() => {
            frame = 0;
            constrain();
        });
    }
    const sizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(scheduleConstrain) : null;
    document.addEventListener("pointerdown", event => {
        const target = element(event.target), el = target?.closest(selector);
        if (!el || !visible(el) || event.isPrimary === false || event.pointerType === "mouse" && event.button !== 0) return;
        const record = remember(el);
        raise(el);
        const resizeGrip = target.closest(".window-resize");
        if (resizeGrip && !isMaximized(el) && !active) {
            event.preventDefault();
            const before = Object.fromEntries(properties.map(key => [ key, el.style.getPropertyValue(key) ]));
            const wasMoved = record.moved;
            prepare(record);
            active = {
                record: record,
                handle: resizeGrip,
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                start: el.getBoundingClientRect(),
                dir: resizeGrip.dataset.resize,
                before: before,
                wasMoved: wasMoved,
                wasMaximized: false
            };
            el.classList.add("window-dragging");
            document.body.classList.add("window-drag-active");
            resizeGrip.setPointerCapture(event.pointerId);
            resizeGrip.focus({
                preventScroll: true
            });
            return;
        }
        const handle = record.handle;
        if (!handle || !handle.contains(target) || target.closest(controls) || active) return;
        event.preventDefault();
        const before = Object.fromEntries(properties.map(key => [ key, el.style.getPropertyValue(key) ]));
        const wasMoved = record.moved, wasMaximized = isMaximized(el), maxClass = maxClasses.find(c => el.classList.contains(c));
        const old = el.getBoundingClientRect();
        const fraction = clamp((event.clientX - old.left) / Math.max(1, old.width), 0, 1), grip = event.clientY - old.top;
        if (wasMaximized) {
            record.maximized = false;
            el.classList.remove(...maxClasses);
            restore(record);
        }
        prepare(record);
        if (wasMaximized) move(record, event.clientX - el.getBoundingClientRect().width * fraction, event.clientY - grip);
        const start = el.getBoundingClientRect();
        active = {
            record: record,
            handle: handle,
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: start.left,
            top: start.top,
            before: before,
            wasMoved: wasMoved,
            wasMaximized: wasMaximized,
            maxClass: maxClass
        };
        el.classList.add("window-dragging");
        document.body.classList.add("window-drag-active");
        try {
            handle.setPointerCapture(event.pointerId);
        } catch (_) {}
        handle.focus({
            preventScroll: true
        });
        notify("start", el);
    }, true);
    document.addEventListener("pointermove", event => {
        if (!active || event.pointerId !== active.pointerId) return;
        event.preventDefault();
        if (active.dir) {
            resize(active.record, active.dir, active.start, event.clientX - active.x, event.clientY - active.y);
            return;
        }
        move(active.record, active.left + event.clientX - active.x, active.top + event.clientY - active.y);
    }, {
        passive: false
    });
    document.addEventListener("pointerup", e => {
        if (active?.pointerId === e.pointerId) finish();
    });
    document.addEventListener("pointercancel", e => {
        if (active?.pointerId === e.pointerId) finish(true);
    });
    document.addEventListener("lostpointercapture", e => {
        if (active?.pointerId === e.pointerId) finish();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && active) {
            e.preventDefault();
            finish(true);
            return;
        }
        if (![ "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown" ].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
        const target = element(e.target), el = target?.closest(selector), record = records.get(el);
        if (record && target.matches(".window-resize") && !isMaximized(el)) {
            e.preventDefault();
            raise(el);
            prepare(record);
            const n = e.shiftKey ? 40 : 10;
            resize(record, "se", el.getBoundingClientRect(), e.key === "ArrowLeft" ? -n : e.key === "ArrowRight" ? n : 0, e.key === "ArrowUp" ? -n : e.key === "ArrowDown" ? n : 0);
            return;
        }
        if (!record || target !== record.handle || isMaximized(el)) return;
        e.preventDefault();
        raise(el);
        prepare(record);
        const r = el.getBoundingClientRect(), step = e.shiftKey ? 40 : 10;
        move(record, r.left + (e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0), r.top + (e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0));
        notify("end", el);
    });
    document.addEventListener("click", e => {
        if (element(e.target)?.closest("[data-os],#replay")) {
            finish();
            for (const record of records.values()) restore(record);
        }
    }, true);
    window.addEventListener("blur", () => {
        if (active) finish();
        const focused = document.activeElement;
        if (focused?.tagName === "IFRAME") {
            const el = focused.closest(selector);
            if (el) raise(el);
        }
    });
    window.addEventListener("resize", scheduleConstrain);
    window.addEventListener("hashchange", () => {
        reconcileVisibility();
        scheduleConstrain();
    });
    window.addEventListener("scroll", scheduleConstrain, {
        passive: true
    });
    const observer = new MutationObserver(changes => {
        refresh();
        reconcileVisibility();
        for (const change of changes) {
            const record = records.get(change.target);
            if (record && change.attributeName === "class") {
                const maximized = isMaximized(record.el);
                if (record.maximized !== maximized) {
                    record.maximized = maximized;
                    if (maximized) {
                        record.normalBeforeMax = Object.fromEntries(properties.map(key => [ key, record.el.style.getPropertyValue(key) ]));
                        restore(record);
                    } else if (record.normalBeforeMax) {
                        for (const [key, value] of Object.entries(record.normalBeforeMax)) value ? record.el.style.setProperty(key, value) : record.el.style.removeProperty(key);
                        record.moved = true;
                        if (record.normalBeforeMax.width) record.el.classList.add("window-user-sized");
                    } else restore(record);
                }
            }
        }
        if (active && (!active.record.el.isConnected || !shown(active.record.el))) finish();
        scheduleConstrain();
    });
    function initialize() {
        refresh();
        reconcileVisibility();
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [ "class", "hidden" ]
        });
    }
    window.WindowDrag = {
        refresh: refresh,
        constrain: constrain,
        workArea: area,
        reset(root = document) {
            finish();
            for (const record of records.values()) if (root === document || root === record.el || root.contains(record.el)) restore(record);
        }
    };
    window.initializeWindowDragging = refresh;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, {
        once: true
    }); else initialize();
})();
