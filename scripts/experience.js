// Unlock future music frames synchronously within a real user gesture.
(() => {
    const slots = [], documents = new WeakSet();
    const Audio = window.AudioContext || window.webkitAudioContext;
    function unlock(context) {
        if (!context || context.state === "closed") return;
        try {
            const source = context.createBufferSource();
            source.buffer = context.createBuffer(1, 1, context.sampleRate);
            source.connect(context.destination);
            source.onended = () => source.disconnect();
            source.start(0);
            context.resume().catch(() => {});
        } catch (_) {}
    }
    function reclaim() {
        for (const slot of slots) if (slot.frame && !slot.frame.isConnected) {
            slot.frame = null;
            slot.caller = null;
            slot.context.onstatechange = null;
        }
        for (let i = slots.length - 1; i >= 0; i--) if (slots[i].context.state === "closed") slots.splice(i, 1);
    }
    function prime(event) {
        if (!event.isTrusted || !Audio) return;
        if (event.type === "keydown" && !["Enter", " "].includes(event.key)) return;
        try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (_) {}
        reclaim();
        while (slots.length < 2) {
            try { slots.push({ context: new Audio(), frame: null, caller: null }); } catch (_) { break; }
        }
        for (const slot of slots) if (slot.context.state !== "running" || !slot.unlocked) {
            unlock(slot.context);
            slot.unlocked = true;
        }
        for (const frame of document.querySelectorAll("iframe.sample-runtime")) {
            try { frame.contentWindow.resumeAudioFromGesture?.(event); } catch (_) {}
        }
    }
    window.acquireDemoAudioContext = caller => {
        const frame = [...document.querySelectorAll("iframe.sample-runtime")].find(f => f.contentWindow === caller);
        if (!frame) return null;
        reclaim();
        const assigned = slots.find(s => s.caller === caller);
        if (assigned) return assigned.context;
        const free = slots.find(s => !s.frame);
        if (!free) return null;
        free.frame = frame;
        free.caller = caller;
        return free.context;
    };
    window.releaseDemoAudioContext = (caller, context) => {
        const slot = slots.find(s => s.caller === caller && s.context === context);
        if (!slot) return false;
        slot.frame = null;
        slot.caller = null;
        context.onstatechange = null;
        return true;
    };
    function watch(doc) {
        if (!doc || documents.has(doc)) return;
        documents.add(doc);
        for (const type of ["click", "touchend", "keydown"]) doc.addEventListener(type, prime, { capture: true, passive: true });
    }
    function watchFrames() {
        for (const frame of document.querySelectorAll("iframe")) {
            if (!frame.dataset.audioGestureWatched) {
                frame.dataset.audioGestureWatched = "true";
                frame.addEventListener("load", () => { try { watch(frame.contentDocument); } catch (_) {} });
            }
            try { watch(frame.contentDocument); } catch (_) {}
        }
    }
    watch(document);
    const observer = new MutationObserver(records => {
        if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.tagName === "IFRAME" || node.querySelector?.("iframe"))))) watchFrames();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    watchFrames();
    window.addEventListener("pagehide", event => {
        if (event.persisted) return;
        observer.disconnect();
        for (const slot of slots) { try { slot.context.close().catch(() => {}); } catch (_) {} }
    });
})();

(() => {
    const stage = document.querySelector(".host-desktop");
    let stopAgent = null, idleTimer = null, held = false, editing = false, hostStart = null, finished = false;
    const button = document.querySelector('[data-feature="agent"]');
    function close() {
        clearTimeout(hostStart);
        clearTimeout(idleTimer);
        stopAgent?.();
        stopAgent = null;
        button.setAttribute("aria-pressed", "false");
    }
    function open() {
        const existing = document.querySelector(".agent-terminal");
        if (existing) {
            existing.hidden = false;
            delete existing.dataset.minimized;
            existing.dispatchEvent(new PointerEvent("pointerdown", {
                bubbles: true,
                pointerType: "mouse",
                button: 0,
                isPrimary: true
            }));
            return;
        }
        finished = false;
        button.setAttribute("aria-pressed", "true");
        stopAgent = mountAgentDemo(stage, close);
    }
    document.addEventListener("demo-complete", () => {
        finished = true;
        clearTimeout(idleTimer);
    });
    button.onclick = () => {
        close();
        editing = false;
        held = false;
        finished = false;
        hostStart = setTimeout(() => {
            open();
            document.body.dataset.autoplay = "playing";
        }, 0);
    };
    window.startCodexPresentation = open;
    function scheduleResume() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            if (held || editing || document.hidden) {
                scheduleResume();
                return;
            }
            const current = document.querySelector(".agent-terminal");
            if (current?.dataset.agentDemo === "paused") {
                document.dispatchEvent(new Event("demo-resume"));
                document.body.dataset.autoplay = "playing";
            } else if (!current && !finished) {
                open();
                document.body.dataset.autoplay = "playing";
            }
        }, 3500);
    }
    document.addEventListener("demo-user-input", scheduleResume);
    document.addEventListener("keydown", e => {
        if (e.isTrusted && e.target.matches("input,textarea,[contenteditable=true]")) editing = true;
    }, {
        capture: true
    });
    document.addEventListener("focusout", () => {
        editing = false;
        scheduleResume();
    }, {
        capture: true
    });
    document.addEventListener("demo-keyboard-editing", e => {
        editing = !!e.detail;
        if (!editing) scheduleResume();
    });
    document.addEventListener("demo-user-activity", () => {
        if (document.querySelector(".agent-terminal")?.dataset.agentDemo === "paused") scheduleResume();
    });
    document.addEventListener("demo-pointer-held", e => {
        held = !!e.detail;
        if (!held) scheduleResume();
    });
    document.addEventListener("pointerdown", e => {
        if (e.isTrusted) held = true;
    }, {
        capture: true,
        passive: true
    });
    for (const type of [ "pointerup", "pointercancel" ]) document.addEventListener(type, e => {
        if (e.isTrusted) {
            held = false;
            scheduleResume();
        }
    }, {
        capture: true,
        passive: true
    });
    document.querySelectorAll("[data-feature]").forEach(b => {
        if (b !== button) {
            b.hidden = true;
            b.tabIndex = -1;
            b.setAttribute("aria-hidden", "true");
            b.onclick = b.dataset.feature === "ssh" ? open : null;
        }
    });
    document.querySelectorAll("[data-os]").forEach(b => b.addEventListener("click", () => {
        close();
        editing = false;
        held = false;
        hostStart = setTimeout(() => {
            open();
            document.body.dataset.autoplay = "playing";
        }, 0);
    }));
    window.addEventListener("message", e => {
        if (e.source === document.querySelector("#app").contentWindow && e.data.type === "demo-ssh") open();
    });
})();
