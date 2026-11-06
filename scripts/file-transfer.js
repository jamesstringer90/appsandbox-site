window.mountFileTransfer = function(host, guest, os, onClose) {
    let timers = [], copied = false, done = false, closed = false;
    const isMac = os.startsWith("mac");
    const icon = '<svg viewBox="0 0 40 48" aria-hidden="true"><path d="M7 2h19l9 9v34H7Z" fill="#f3f7fc" stroke="#92a6bc"/><path d="M26 2v10h9" fill="#cbd9e8"/><path d="M17 3h7v34h-7z" fill="#d8a744"/>' + [ 6, 12, 18, 24, 30 ].map((y, i) => '<path d="M' + (i % 2 ? 20 : 17) + " " + y + 'h4v3h-4Z" fill="#7d5a29"/>').join("") + '<rect x="17" y="34" width="7" height="8" rx="2" fill="#ad7c2c" stroke="#77571f"/></svg>';
    const source = document.createElement("button");
    source.className = "demo-desktop-file host-demo-file" + (isMac ? " mac-file" : "");
    source.innerHTML = icon + "<span>Project.zip</span>";
    source.setAttribute("aria-label", "Host desktop file Project.zip. Right-click to copy.");
    host.append(source);
    const toast = document.createElement("div");
    toast.className = "file-demo-toast";
    toast.innerHTML = '<span>Right-click the host file → Copy → right-click inside the VM → Paste.</span><button class="file-replay">Replay</button><button class="file-close" aria-label="Close file transfer">×</button>';
    host.append(toast);
    const pointer = document.createElement("div");
    pointer.className = "file-copy-pointer" + (isMac ? " dark-pointer" : "");
    pointer.innerHTML = '<svg viewBox="0 0 24 28"><path d="M3 2v21l5-6 5 10 4-2-5-9 8-1z" fill="white" stroke="#111" stroke-width="1.5"/></svg><span>Right-click</span>';
    host.append(pointer);
    let menu = null, target = null;
    const clearTimers = () => {
        timers.forEach(clearTimeout);
        timers = [];
    };
    const later = (fn, t) => timers.push(setTimeout(() => {
        if (!closed) fn();
    }, t));
    function say(s) {
        toast.querySelector("span").textContent = s;
    }
    function moveTo(el, dx = 0, dy = 0) {
        const r = el.getBoundingClientRect(), h = host.getBoundingClientRect();
        pointer.style.left = r.left - h.left + r.width / 2 + dx + "px";
        pointer.style.top = r.top - h.top + r.height / 2 + dy + "px";
        pointer.classList.add("shown");
    }
    function closeMenu() {
        menu?.remove();
        menu = null;
    }
    function copy() {
        copied = true;
        source.classList.add("copied");
        closeMenu();
        say("Copied Project.zip from the host. Now right-click the VM desktop and choose Paste.");
        pointer.classList.remove("shown");
    }
    function placeFile() {
        if (!target) return;
        const gr = guest.getBoundingClientRect();
        const w = target.offsetWidth, h = target.offsetHeight;
        const occupied = [ ...guest.querySelectorAll(".guest-icons,.ubuntu-dock,.ubuntu-top,.guest-taskbar,.mac-dock,.mac-menu,.mac-desktop-file") ].map(e => e.getBoundingClientRect());
        let best = null;
        for (let x = 10; x + w < guest.clientWidth - 6; x += w + 10) {
            for (let y = 12; y + h < guest.clientHeight - 20; y += h + 12) {
                const box = {
                    left: gr.left + x,
                    top: gr.top + y,
                    right: gr.left + x + w,
                    bottom: gr.top + y + h
                };
                if (!occupied.some(o => box.left < o.right + 6 && box.right > o.left - 6 && box.top < o.bottom + 6 && box.bottom > o.top - 6)) {
                    best = {
                        x: x,
                        y: y
                    };
                    break;
                }
            }
            if (best) break;
        }
        target.style.left = (best?.x ?? Math.max(8, guest.clientWidth - w - 12)) + "px";
        target.style.top = (best?.y ?? 40) + "px";
        target.style.right = "auto";
        target.style.bottom = "auto";
    }
    const pauseTour = () => {
        clearTimers();
        closeMenu();
        pointer.classList.remove("shown");
    };
    document.addEventListener("demo-user-input", pauseTour);
    function placeSource() {
        const hr = host.getBoundingClientRect(), sw = source.offsetWidth, sh = source.offsetHeight;
        const occupied = [ ...document.querySelectorAll(".host-icons,.desktop-download,.desktop-github,.experience-controls,.host-choice,.host-taskbar,.manager,.guest-window.connected,.capability-window:not([hidden])") ].filter(e => getComputedStyle(e).display !== "none" && !e.hidden).map(e => e.getBoundingClientRect());
        let found;
        for (let yy = 38; yy + sh < host.clientHeight - 48 && !found; yy += sh + 12) for (let xx = 10; xx + sw < host.clientWidth - 8 && !found; xx += sw + 10) {
            const b = {
                left: hr.left + xx,
                top: hr.top + yy,
                right: hr.left + xx + sw,
                bottom: hr.top + yy + sh
            };
            if (!occupied.some(o => b.left < o.right + 5 && b.right > o.left - 5 && b.top < o.bottom + 5 && b.bottom > o.top - 5)) found = {
                x: xx,
                y: yy
            };
        }
        source.style.left = (found?.x ?? Math.max(10, host.clientWidth - sw - 15)) + "px";
        source.style.top = (found?.y ?? Math.max(90, host.clientHeight - sh - 48)) + "px";
        source.style.right = "auto";
        source.style.bottom = "auto";
    }
    const fileObserver = new ResizeObserver(() => {
        placeFile();
        placeSource();
    });
    fileObserver.observe(guest);
    fileObserver.observe(host);
    placeSource();
    function paste() {
        if (!copied) return;
        closeMenu();
        target?.remove();
        target = document.createElement("button");
        target.className = "demo-desktop-file guest-demo-file " + (os === "ubuntu" ? "ubuntu-file" : os === "mac" ? "mac-file" : "");
        target.innerHTML = icon + "<span>Project.zip</span>";
        target.setAttribute("aria-label", "Project.zip on the VM desktop");
        guest.append(target);
        placeFile();
        done = true;
        guest.dataset.fileTransfer = "complete";
        say("Project.zip is now on the VM desktop.");
        pointer.classList.remove("shown");
        target.classList.add("file-arrived");
    }
    function openMenu(kind, x, y) {
        closeMenu();
        menu = document.createElement("div");
        menu.className = "file-context-menu " + (kind === "guest" && os === "ubuntu" ? "ubuntu-context" : isMac ? "mac-context" : "windows-context");
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", kind === "host" ? "Host file context menu" : "Guest desktop context menu");
        const choices = kind === "host" ? [ [ "Open", null ], [ "Copy", copy ], [ "Cut", null ], [ "Rename", null ], [ "Properties", null ] ] : [ [ isMac ? "New Folder" : "New folder", null ], [ isMac ? "Paste Item" : "Paste", copied ? paste : null ], [ "Refresh", null ], [ "Display settings", null ] ];
        for (const [label, action] of choices) {
            const b = document.createElement("button");
            b.type = "button";
            b.setAttribute("role", "menuitem");
            b.textContent = label;
            if (label === "Copy") b.innerHTML = "<span>Copy</span><small>" + (isMac ? "⌘C" : "Ctrl+C") + "</small>";
            if (label.startsWith("Paste")) b.innerHTML = "<span>" + label + "</span><small>" + (isMac ? "⌘V" : "Ctrl+V") + "</small>";
            b.disabled = !action;
            b.onclick = () => {
                clearTimers();
                action?.();
            };
            menu.append(b);
        }
        host.append(menu);
        const r = host.getBoundingClientRect();
        menu.style.left = Math.max(5, Math.min(x - r.left, host.clientWidth - 205)) + "px";
        menu.style.top = Math.max(30, Math.min(y - r.top, host.clientHeight - 245)) + "px";
        return menu;
    }
    function hostMenu(e) {
        e.preventDefault();
        clearTimers();
        pointer.classList.remove("shown");
        openMenu("host", e.clientX, e.clientY);
    }
    function guestMenu(e) {
        if (e.target.closest(".webgl-workload")) return;
        e.preventDefault();
        clearTimers();
        pointer.classList.remove("shown");
        openMenu("guest", e.clientX, e.clientY);
    }
    source.addEventListener("contextmenu", hostMenu);
    guest.addEventListener("contextmenu", guestMenu);
    source.onclick = () => {
        clearTimers();
        source.classList.toggle("selected");
        say("Right-click Project.zip and select Copy. On a touch screen, press and hold.");
    };
    source.addEventListener("keydown", e => {
        if (e.key === "ContextMenu" || e.shiftKey && e.key === "F10") {
            e.preventDefault();
            const r = source.getBoundingClientRect();
            openMenu("host", r.right, r.top + 15);
        }
    });
    let hold;
    source.addEventListener("pointerdown", e => {
        if (e.pointerType !== "mouse") {
            hold = setTimeout(() => {
                clearTimers();
                openMenu("host", e.clientX, e.clientY);
            }, 550);
        }
    });
    source.addEventListener("pointerup", () => clearTimeout(hold));
    guest.addEventListener("pointerdown", touchGuest);
    function touchGuest(e) {
        if (e.pointerType !== "mouse") hold = setTimeout(() => {
            clearTimers();
            openMenu("guest", e.clientX, e.clientY);
        }, 550);
    }
    guest.addEventListener("pointerup", releaseHold);
    function releaseHold() {
        clearTimeout(hold);
    }
    function replay() {
        clearTimers();
        closeMenu();
        target?.remove();
        target = null;
        copied = false;
        done = false;
        source.classList.remove("copied");
        guest.dataset.fileTransfer = "pending";
        say("Watch: right-click a file on the host desktop.");
        moveTo(source);
        pointer.querySelector("span").textContent = "Right-click";
        later(() => {
            const r = source.getBoundingClientRect();
            openMenu("host", r.right, r.top + 20);
        }, 800);
        later(() => {
            const b = [ ...menu.querySelectorAll("button") ].find(x => x.textContent.startsWith("Copy"));
            moveTo(b);
            pointer.querySelector("span").textContent = "Copy";
        }, 1500);
        later(copy, 2200);
        later(() => {
            say("Next: right-click inside the VM desktop.");
            moveTo(guest, guest.clientWidth * .2, -guest.clientHeight * .1);
            pointer.querySelector("span").textContent = "Right-click";
        }, 2900);
        later(() => {
            const r = guest.getBoundingClientRect();
            openMenu("guest", r.left + r.width * .65, r.top + r.height * .4);
        }, 3800);
        later(() => {
            const b = [ ...menu.querySelectorAll("button") ].find(x => x.textContent.startsWith("Paste"));
            moveTo(b);
            pointer.querySelector("span").textContent = isMac ? "Paste Item" : "Paste";
        }, 4500);
        later(paste, 5300);
    }
    toast.querySelector(".file-replay").onclick = replay;
    toast.querySelector(".file-close").onclick = onClose;
    replay();
    return () => {
        document.removeEventListener("demo-user-input", pauseTour);
        fileObserver.disconnect();
        closed = true;
        clearTimers();
        clearTimeout(hold);
        closeMenu();
        source.remove();
        target?.remove();
        toast.remove();
        pointer.remove();
        guest.removeEventListener("contextmenu", guestMenu);
        guest.removeEventListener("pointerdown", touchGuest);
        guest.removeEventListener("pointerup", releaseHold);
        delete guest.dataset.fileTransfer;
    };
};
