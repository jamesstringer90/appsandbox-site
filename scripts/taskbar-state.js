(() => {
    const manager = document.querySelector(".manager");
    let active = manager, signature = "", pending = 0;
    const styles = document.createElement("style");
    styles.textContent = `.shell-task{position:relative;width:38px;height:39px;border:0;border-radius:5px;background:transparent;color:white;display:grid;place-items:center;padding:6px}.shell-task:hover{background:#ffffff66}.shell-task.running:after{content:'';position:absolute;bottom:2px;width:6px;height:3px;border-radius:4px;background:#697888}.shell-task.active{background:#ffffff70}.shell-task.active:after{width:17px;background:#1769b0}.shell-task svg,.shell-task img{width:25px;height:25px}.manager[hidden]{display:none!important}.manager.maximized{left:2%!important;top:40px!important;width:96%!important;height:calc(100% - 100px)!important}.manager>.titlebar>.window-controls{display:flex;gap:0}.manager .window-controls button{border:0;background:transparent;color:inherit;width:32px;height:30px;cursor:pointer}.manager .window-controls button:hover{background:#ffffff25}.manager .window-controls button:last-child:hover{background:#c84242}.mac-host .manager .window-controls{position:absolute;left:8px;top:0}.mac-host .manager .window-controls button{width:16px;font-size:0}.mac-host .manager .window-controls button:before{content:'';display:block;width:10px;height:10px;border-radius:50%;background:#ffbd44}.mac-host .manager .window-controls button:nth-child(2):before{background:#00ca4e}.mac-host .manager .window-controls button:last-child:before{background:#ff605c}`;
    styles.textContent += `.capability-window.shell-maximized{left:2%!important;top:40px!important;width:96%!important;height:calc(100% - 100px)!important}.terminal-title>span:first-child{flex:1}.terminal-title button{width:30px}.mac-host .terminal-title{position:relative;justify-content:center;padding-left:68px;padding-right:68px}.mac-host .terminal-title>span:first-child{text-align:center}.mac-host .terminal-title .terminal-close,.mac-host .terminal-title .terminal-minimize,.mac-host .terminal-title .terminal-maximize{position:absolute;top:9px;width:12px;height:12px;min-width:12px;border-radius:50%;font-size:0;padding:0;border:1px solid #0002}.mac-host .terminal-title .terminal-close{left:12px;background:#ff605c}.mac-host .terminal-title .terminal-minimize{left:32px;background:#ffbd44}.mac-host .terminal-title .terminal-maximize{left:52px;background:#00ca4e}.mac-host .terminal-title .agent-replay{position:absolute;right:8px;width:auto}.mac-host .mac-host-dock [role=button]{cursor:pointer}.mac-host .mac-host-dock [role=button]:focus-visible{outline:2px solid white;border-radius:8px}.shell-maximized>.window-resize{display:none}`;
    document.head.append(styles);
    const ctl = manager.querySelector(".window-controls");
    ctl.innerHTML = '<button aria-label="Minimize AppSandbox">−</button><button aria-label="Maximize AppSandbox">□</button><button aria-label="Close AppSandbox">×</button>';
    ctl.children[0].onclick = () => {
        manager.hidden = true;
        manager.dataset.minimized = "true";
        update();
    };
    ctl.children[1].onclick = () => manager.classList.toggle("maximized");
    ctl.children[2].onclick = () => {
        manager.hidden = true;
        delete manager.dataset.minimized;
        manager.dataset.closed = "true";
        update();
    };
    function focus(el) {
        el.hidden = false;
        delete el.dataset.minimized;
        delete el.dataset.closed;
        active = el;
        if (el.matches(".guest-window")) {
            el.classList.add("connected");
            delete el.dataset.shellMinimized;
        }
        el.dispatchEvent(new PointerEvent("pointerdown", {
            bubbles: true,
            pointerType: "mouse",
            button: 0,
            isPrimary: true
        }));
        update();
    }
    function appGroupOpen() {
        const existing=document.querySelector('.shell-app-picker');if(existing){existing.remove();return;}
        const windows=[manager,...document.querySelectorAll('.guest-window.connected,.guest-window[data-shell-minimized]')];
        if(windows.length===1){focus(manager);return;}
        const picker=document.createElement('div');picker.className='shell-app-picker';picker.setAttribute('role','menu');picker.setAttribute('aria-label','AppSandbox windows');
        picker.style.cssText='position:fixed;z-index:1000;bottom:54px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 24px);min-width:200px;background:#292929;color:#eee;border:1px solid #555;border-radius:7px;padding:5px;box-shadow:0 8px 28px #0008;font:12px Segoe UI,Arial,sans-serif';
        windows.forEach(el=>{const b=document.createElement('button');b.setAttribute('role','menuitem');b.textContent=el===manager?'AppSandbox':el.querySelector('.titlebar span')?.textContent||'VM display';b.style.cssText='display:block;width:100%;border:0;border-radius:4px;background:transparent;color:inherit;text-align:left;padding:10px 12px;font:inherit;cursor:pointer';b.onmouseenter=()=>b.style.background='#444';b.onmouseleave=()=>b.style.background='transparent';b.onclick=e=>{e.stopPropagation();picker.remove();focus(el);};picker.append(b);});
        document.body.append(picker);
        const dismiss=e=>{if(!picker.contains(e.target)&&!e.target.closest('.shell-manager')){picker.remove();document.removeEventListener('pointerdown',dismiss,true);}};document.addEventListener('pointerdown',dismiss,true);
        picker.addEventListener('keydown',e=>{if(e.key==='Escape')picker.remove()});
    }
    const terminalIcon = '<img src="assets/a782d32012d11c4f.svg" alt="Windows Terminal">';
    const vmIcon = '<img src="assets/1bd6d68bc7bcb9cb.svg" alt="App Sandbox viewer">';
    function terminalOpen() {
        const visible = [ ...document.querySelectorAll(".capability-window") ].find(e => e.querySelector(".xterm"));
        if (visible) {
            focus(visible);
            return;
        }
        document.querySelector('[data-feature="agent"]').click();
        const el = document.querySelector(".capability-window:not([hidden])");
        if (el) focus(el);
    }
    function terminalChrome(el) {
        if (el.dataset.shellChrome) {
            const tab = el.querySelector(".terminal-profile-tab");
            if (tab && !tab.querySelector("img")) {
                const icon = document.createElement("img");
                icon.src = "assets/a782d32012d11c4f.svg";
                icon.alt = "";
                tab.prepend(icon);
            }
            return;
        }
        el.dataset.shellChrome = "true";
        const h = el.querySelector(":scope>.titlebar");
        if (!h) return;
        h.classList.add("terminal-title");
        const label = h.querySelector("span:first-child");
        if (label) {
            label.classList.add("terminal-profile-tab");
            const title = document.createElement("span");
            title.className = "terminal-tab-label";
            title.textContent = label.textContent;
            label.replaceChildren(title);
            const tabClose = document.createElement("button");
            tabClose.className = "terminal-tab-close";
            tabClose.setAttribute("aria-label", "Close terminal tab");
            tabClose.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13"/></svg>';
            tabClose.onclick = () => h.querySelector(":scope>.terminal-close")?.click();
            label.append(tabClose);
            const icon = document.createElement("img");
            icon.src = "assets/a782d32012d11c4f.svg";
            icon.alt = "";
            label.prepend(icon);
            const tools = document.createElement("span");
            tools.className = "terminal-tabs-tools";
            tools.innerHTML = '<span class="terminal-new-tab" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M8 2v12M2 8h12"/></svg></span><span class="terminal-tab-menu" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3 6 5 5 5-5"/></svg></span>';
            h.insertBefore(tools, label.nextSibling);
        }
        const close = h.querySelector(":scope>button:last-child");
        close?.classList.add("terminal-close");
        for (const [name, text, fn] of [ [ "minimize", "−", () => {
            el.hidden = true;
            el.dataset.minimized = "true";
            queue();
        } ], [ "maximize", "□", () => el.classList.toggle("shell-maximized") ] ]) {
            const b = document.createElement("button");
            b.className = "terminal-" + name;
            b.setAttribute("aria-label", name + " terminal");
            b.textContent = text;
            b.onclick = fn;
            h.insertBefore(b, close);
        }
    }
    function update() {
        pending = 0;
        const tops = [ ...document.querySelectorAll(".manager:not([hidden]),.guest-window.connected,.capability-window:not([hidden])") ].sort((a, b) => (parseInt(getComputedStyle(b).zIndex) || 0) - (parseInt(getComputedStyle(a).zIndex) || 0));
        if (tops[0]) active = tops[0];
        document.querySelectorAll(".capability-window").forEach(terminalChrome);
        const mac = document.querySelector(".host-taskbar .mac-host-dock");
        if (mac) {
            const shortcut = document.querySelector("[data-feature=ssh]");
            if (shortcut.dataset.shellIcon !== "mac") {
                shortcut.innerHTML = mac.querySelector("[aria-label=Terminal] svg").outerHTML + "<span>Terminal</span>";
                shortcut.dataset.shellIcon = "mac";
            }
            const app = mac.querySelector('[aria-label="App Sandbox"]'), terminal = mac.querySelector('[aria-label="Terminal"]');
            for (const [el, fn] of [ [ app, () => focus(manager) ], [ terminal, terminalOpen ] ]) if (el) {
                el.setAttribute("role", "button");
                el.tabIndex = 0;
                el.onclick = fn;
                el.onkeydown = e => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fn();
                    }
                };
            }
            const openTerm = [ ...document.querySelectorAll(".capability-window") ].some(e => e.querySelector(".xterm") && (!e.hidden || e.dataset.minimized));
            app?.classList.toggle("mac-running", !manager.dataset.closed);
            terminal?.classList.toggle("mac-running", openTerm);
            return;
        }
        const shortcut = document.querySelector("[data-feature=ssh]");
        if (shortcut.dataset.shellIcon !== "windows") {
            shortcut.innerHTML = '<img class="terminal-shortcut-icon" src="assets/a782d32012d11c4f.svg" alt=""><span>Terminal</span>';
            shortcut.dataset.shellIcon = "windows";
        }
        const bar = document.querySelector(".host-taskbar .task-icons");
        if (!bar) return;
        let pin = bar.querySelector(".shell-manager");
        if (!pin) {
            const img = bar.querySelector('img[alt="App Sandbox"]');
            if (!img) return;
            pin = document.createElement("button");
            pin.className = "shell-task shell-manager";
            pin.setAttribute("aria-label", "Open AppSandbox");
            img.replaceWith(pin);
            pin.append(img);
            pin.onclick = appGroupOpen;
        }
        let terminalPin = bar.querySelector(".shell-terminal");
        if (!terminalPin) {
            terminalPin = document.createElement("button");
            terminalPin.className = "shell-task shell-terminal";
            terminalPin.setAttribute("aria-label", "Open Terminal");
            terminalPin.innerHTML = terminalIcon;
            terminalPin.onclick = terminalOpen;
            bar.append(terminalPin);
        }
        const guests = [ ...document.querySelectorAll(".guest-window.connected,.guest-window[data-shell-minimized]") ], terms = [ ...document.querySelectorAll(".capability-window:not([hidden])") ].filter(e => e.querySelector(".xterm"));
        terminalPin.classList.toggle("running", terms.length > 0 || [ ...document.querySelectorAll(".capability-window") ].some(e => e.dataset.minimized));
        terminalPin.classList.toggle("active", terms.includes(active));
        const groupActive=(active===manager&&!manager.hidden)||guests.includes(active);
        pin.classList.toggle("running",!manager.dataset.closed||guests.length>0);
        pin.classList.toggle("active",groupActive);
        pin.setAttribute("aria-pressed",String(groupActive));
        pin.setAttribute("aria-label","AppSandbox windows");
        pin.setAttribute("aria-haspopup","menu");
        bar.querySelectorAll(".shell-dynamic").forEach(e=>e.remove());
    }
    document.addEventListener("click", update);
    window.addEventListener("message", () => setTimeout(update, 0));
    function queue() {
        if (!pending) pending = setTimeout(update, 0);
    }
    document.addEventListener("pointerdown", e => {
        const el = e.target.closest(".manager,.guest-window,.capability-window");
        if (el) {
            active = el;
            queue();
        }
    });
    window.addEventListener("blur", () => {
        if (document.activeElement === document.querySelector("#app")) {
            active = manager;
            queue();
        }
    });
    document.querySelector(".host-icons")?.addEventListener("dblclick", () => focus(manager));
    document.querySelector("#minimize-guest").addEventListener("click", () => {
        document.querySelector("#guest").dataset.shellMinimized = "true";
        queue();
    });
    document.querySelector("#close-guest").addEventListener("click", () => {
        delete document.querySelector("#guest").dataset.shellMinimized;
        queue();
    });
    new MutationObserver(queue).observe(document.querySelector(".host-desktop"), {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [ "class", "hidden" ]
    });
    update();
})();
