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
