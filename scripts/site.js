const app = document.querySelector("#app"), guest = document.querySelector("#guest"), desktop = document.querySelector("#guest-desktop");

let os = sessionStorage.getItem("appsandbox-preview-os") || detectPreviewHost(navigator).mode, timers = [], paused = matchMedia("(prefers-reduced-motion: reduce)").matches;

const searchBox = `<span class="task-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="7.2" fill="none" stroke="#009ed0" stroke-width="2.2"/><path d="M4.3 5.6a7.2 7.2 0 0 1 11.8 0" fill="none" stroke="#55d38c" stroke-width="2.2"/><path d="m15.5 15.5 6 6" stroke="#009ed0" stroke-width="2.5" stroke-linecap="round"/></svg><span>Search</span></span>`;

const taskView = `<svg class="task-view-icon" viewBox="0 0 28 28" role="img" aria-label="Task View"><rect x="9" y="3" width="18" height="18" rx="1.5" fill="#f4f4f4"/><rect x="2" y="10" width="19" height="17" rx="1.5" fill="#888" opacity=".8"/><path d="M9 10h12v11H9z" fill="#c8c8c8" opacity=".8"/></svg>`;

const win = `<span class="win-logo"></span>`, folder = DesktopArt.icon("folder"), edge = DesktopArt.icon("edge");

function bloom() {
    return DesktopArt.bloom("guest");
}

function windowsDesktop() {
    return `${bloom()}<div class="guest-icons">${DesktopArt.recycle()}<span>Recycle Bin</span>${edge}<span>Microsoft<br>Edge</span></div><div class="guest-taskbar"><div class="task-icons">${win}${searchBox}${taskView}${folder}${edge}<svg class="os-vector-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 8h22l2 22H3Z" fill="#eef9fc"/><path d="M10 10V7a6 6 0 0 1 12 0v3" fill="none" stroke="#e8f5fa" stroke-width="2"/><path fill="#f25022" d="M10 14h5v5h-5z"/><path fill="#7fba00" d="M16 14h5v5h-5z"/><path fill="#00a4ef" d="M10 20h5v5h-5z"/><path fill="#ffb900" d="M16 20h5v5h-5z"/></svg></div><span class="tray">${DesktopArt.tray()}<span>10:24 AM<br>11/5/2026</span></span></div>`;
}

function ubuntuDesktop() {
    return `${DesktopArt.ubuntu()}<div class="ubuntu-top"><span class="workspace-pill"><i></i><i></i></span><span>Nov 5 10:24</span>${DesktopArt.tray(true)}</div><div class="ubuntu-dock">${DesktopArt.icon("firefox")}${folder}${DesktopArt.icon("store")}${DesktopArt.icon("terminal")}<span class="app-grid">${DesktopArt.icon("grid")}</span></div><div class="ubuntu-watermark">ubuntu <small>26.04 LTS</small></div>`;
}

function render() {
    const isMac = os.startsWith("mac"), host = document.querySelector(".host-desktop");
    guest.dataset.vmOs = os;
    host.classList.toggle("mac-host", isMac);
    desktop.className = "guest-desktop " + (os === "mac-windows" ? "windows" : os);
    desktop.innerHTML = os === "mac" ? MacDesktop.guest() : os === "ubuntu" ? ubuntuDesktop() : windowsDesktop();
    document.querySelector(".host-wallpaper").innerHTML = isMac ? MacDesktop.hostBackground() : DesktopArt.bloom("host");
    document.querySelector(".host-taskbar").innerHTML = isMac ? MacDesktop.taskbar() : `<span class="weather">☀ <span>18°C<br>Mostly sunny</span></span><div class="task-icons">${win}${searchBox}${taskView}${folder}${edge}<img src="assets/1bd6d68bc7bcb9cb.svg" alt="App Sandbox" width="24" height="24"></div><span class="tray">${DesktopArt.tray()}<span>10:24 AM<br>11/5/2026</span></span>`;
    document.querySelector(".host-label").textContent = isMac ? "MAC HOST · APPLE SILICON" : "WINDOWS 11 HOST";
    document.querySelector(".host-icons").style.display = isMac ? "none" : "";
    document.querySelector("#guest-title").textContent = os === "mac" ? "macOS-Dev — Display" : os === "mac-windows" ? "Windows-Dev — Display" : os === "windows" ? "Windows-Dev Display 1920×1080" : "ubuntu-dev Display 1920×1080";
    document.querySelectorAll("[data-os]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.os === os)));
    const gpu = document.querySelector('[data-feature="gpu"]');
    gpu.disabled = isMac;
    gpu.hidden = true;
    gpu.textContent = "GPU graphics";
    gpu.title = "3D graphics";
    const target = "app/index.html" + (isMac ? "?host=mac" : "");
    const hostKey = isMac ? "mac" : "windows";
    if (app.dataset.host !== hostKey) {
        app.dataset.host = hostKey;
        app.srcdoc = window.__APP_DOCS[hostKey];
    }
    document.querySelector(".demo-caption a").href = "#experience";
}

function command(action) {
    if ([ "startVm", "connectIddVm" ].includes(action)) {
        const names = {
            windows: "Windows-Dev",
            ubuntu: "ubuntu-dev",
            mac: "macOS-Dev",
            "mac-windows": "Windows-Dev"
        };
        const row = Array.from(app.contentDocument?.querySelectorAll("#vm-tbody tr") || []).find(r => r.children[0]?.textContent === names[os]);
        const button = row?.querySelector(action === "startVm" ? ".icon-btn.start" : ".icon-btn.connect-idd");
        if (button && !button.disabled) {
            const a = app.getBoundingClientRect(), r = button.getBoundingClientRect(), s = document.querySelector(".host-desktop").getBoundingClientRect(), pointer = document.querySelector(".demo-pointer");
            pointer.style.left = a.left + r.left - s.left + 8 + "px";
            pointer.style.top = a.top + r.top - s.top + 8 + "px";
            pointer.classList.add("visible");
            later(() => {
                pointer.classList.add("clicking");
                button.click();
                later(() => {
                    pointer.classList.remove("visible", "clicking");
                }, 500);
            }, 700);
            return;
        }
    }
    app.contentWindow.postMessage({
        type: "demo-control",
        action: action,
        os: os
    }, "*");
}

function later(fn, t) {
    timers.push(setTimeout(fn, t));
}

function clear() {
    timers.forEach(clearTimeout);
    timers = [];
}

function status(text, step) {
    document.querySelector("#demo-status").textContent = text;
    document.querySelector("#step").innerHTML = step;
}

function replay() {
    clear();
    guest.classList.remove("connected");
    command("reset");
    status("Ready to start", "<b>01</b> Start a sandbox");
}

function preserveViewer(nextOs) {
    if (!guest.classList.contains("connected") || guest.dataset.vmOs === nextOs) return;
    const old = guest.dataset.vmOs;
    if (document.querySelector('.additional-display[data-vm-os="' + old + '"]')) return;
    const copy = guest.cloneNode(true);
    copy.removeAttribute("id");
    copy.classList.add("additional-display");
    copy.querySelectorAll("[id]").forEach(e => {
        const prev = e.id, now = "saved-" + old + "-" + prev;
        e.id = now;
        copy.querySelectorAll("*").forEach(n => {
            for (const attr of [ "fill", "stroke", "filter", "clip-path", "href" ]) {
                const v = n.getAttribute(attr);
                if (v?.includes("#" + prev)) n.setAttribute(attr, v.replace("#" + prev, "#" + now));
            }
        });
    });
    const buttons = copy.querySelectorAll(".guest-title-actions button");
    buttons[0].onclick = () => {
        copy.classList.remove("connected");
        copy.dataset.shellMinimized = "true";
    };
    buttons[1].onclick = () => copy.classList.toggle("maximized");
    buttons[2].onclick = () => copy.remove();
    document.querySelector(".host-desktop").append(copy);
}

window.addEventListener("message", e => {
    if (e.source !== app.contentWindow) return;
    const t = e.data.type;
    if (t === "demo-connected") {
        const saved = document.querySelector('.additional-display[data-vm-os="' + e.data.os + '"]');
        if (saved) {
            saved.hidden = false;
            saved.classList.add("connected");
            saved.dispatchEvent(new PointerEvent("pointerdown", {
                bubbles: true,
                pointerType: "mouse",
                isPrimary: true,
                button: 0
            }));
            return;
        }
    }
    if (e.data.os && e.data.os !== os && [ "demo-starting", "demo-connected" ].includes(t)) {
        preserveViewer(e.data.os);
        os = e.data.os;
        render();
    }
    if (t === "demo-ready") replay();
    if (t === "demo-starting") status("Starting sandbox…", "<b>01</b> Booting an isolated machine");
    if (t === "demo-running") {
        status("Running · guest agent online", "<b>02</b> Connect to the guest display");
    }
    if (t === "demo-connected") {
        guest.classList.add("connected");
        status("Display connected · " + (os === "ubuntu" ? "Ubuntu 26.04 LTS" : os === "mac" ? "macOS" : "Windows 11"), "<b>03</b> Your own space to experiment");
    }
    if (t === "demo-stopping") {
        status((e.data.name || "Sandbox") + " shutting down…", "<b>01</b> Shutting down the selected sandbox");
    }
    if (t === "demo-stopped") {
        const stoppedOs = e.data.os;
        if (stoppedOs) {
            if (guest.dataset.vmOs === stoppedOs) guest.classList.remove("connected");
            document.querySelectorAll(".additional-display[data-vm-os]").forEach(display => {
                if (display.dataset.vmOs === stoppedOs) display.remove();
            });
            document.querySelectorAll(".agent-display[data-agent-os]").forEach(display => {
                if (display.dataset.agentOs === stoppedOs) display.remove();
            });
        }
        status((e.data.name || "Sandbox") + " stopped", "<b>01</b> Ready for your next experiment");
    }
});

document.querySelectorAll("[data-os]").forEach(b => b.onclick = () => {
    document.querySelectorAll(".additional-display").forEach(e => e.remove());
    os = b.dataset.os;
    sessionStorage.setItem("appsandbox-preview-os", os);
    render();
    paused = !!window.__USER_INTERACTED;
    document.querySelector("#pause").textContent = paused ? "Play" : "Pause";
    replay();
});

document.querySelector("#replay").onclick = () => {
    paused = false;
    document.querySelector("#pause").textContent = "Pause";
    replay();
};

document.querySelector("#pause").onclick = () => {
    paused = !paused;
    document.querySelector("#pause").textContent = paused ? "Play" : "Pause";
    if (paused) clear(); else replay();
};

document.querySelector("#close-guest").onclick = () => guest.classList.remove("connected");

document.querySelector("#hero-play").onclick = () => {
    document.querySelector("#experience").scrollIntoView({
        behavior: "smooth"
    });
    paused = false;
    replay();
};

render();

document.querySelector("#pause").textContent = paused ? "Play" : "Pause";

const hostTray = document.querySelector(".host-taskbar .tray");

if (hostTray) hostTray.innerHTML = DesktopArt.tray() + "<span>10:24 AM<br>11/5/2026</span>";

const hostBin = document.querySelector(".host-icons .bin-icon");

if (hostBin) hostBin.outerHTML = DesktopArt.recycle();

document.querySelectorAll(".host-taskbar .edge-icon").forEach(el => el.outerHTML = DesktopArt.icon("edge"));

document.querySelector("#minimize-guest").onclick = () => guest.classList.remove("connected");

document.querySelector("#maximize-guest").onclick = () => guest.classList.toggle("maximized");

let tourTimers = [];

function stopAutoplay(fromApp = false) {
    if (window.__USER_INTERACTED) {
        document.dispatchEvent(new Event("demo-user-input"));
        return;
    }
    window.__USER_INTERACTED = true;
    paused = true;
    document.querySelector("#pause").textContent = "Play";
    clear();
    tourTimers.forEach(clearTimeout);
    tourTimers = [];
    document.querySelector(".demo-pointer").classList.remove("visible", "clicking");
    if (!fromApp) app.contentWindow.postMessage({
        type: "demo-control",
        action: "cancelAutoplay"
    }, "*");
    document.dispatchEvent(new Event("demo-user-input"));
    document.body.dataset.autoplay = "stopped";
}

for (const type of [ "pointerdown", "keydown", "touchstart" ]) document.addEventListener(type, e => {
    if (e.isTrusted) stopAutoplay();
}, {
    capture: true,
    passive: true
});

window.addEventListener("message", e => {
    if (e.source === app.contentWindow && e.data.type === "demo-user-input") stopAutoplay(true);
});

function scheduleTour() {
    if (window.__USER_INTERACTED || paused || document.querySelector(".agent-terminal")) return;
    document.body.dataset.autoplay = "playing";
    tourTimers.forEach(clearTimeout);
    tourTimers = [];
    tourTimers.push(setTimeout(() => {
        if (!window.__USER_INTERACTED && !document.querySelector(".agent-terminal")) window.startCodexPresentation?.();
    }, 900));
}

window.addEventListener("message", e => {
    if (e.source === app.contentWindow && e.data.type === "demo-ready") scheduleTour();
});
