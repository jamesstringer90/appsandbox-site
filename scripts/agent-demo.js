window.mountAgentDemo = function(host, onClose) {
    const macHost = host.classList.contains("mac-host"), project = macHost ? SampleProject : DesignProject, projectName = macHost ? "resonance" : "orbit-studio", appName = macHost ? "Resonance" : "Orbit Studio", secondLabel = macHost ? "macOS" : "Ubuntu", guestOs = system => macHost ? system === "ubuntu" ? "mac" : "mac-windows" : system;
    const win = document.createElement("div");
    win.className = "capability-window agent-terminal";
    win.innerHTML = '<div class="titlebar"><span>Build and test ' + appName + '</span><button class="agent-close" aria-label="Close Codex">×</button></div><div class="agent-terminal-body"></div><div class="codex-working"></div><div class="codex-composer"><span>›</span><span class="codex-input" aria-label="Codex prompt" data-placeholder="Ask Codex to do anything"></span><i class="codex-caret"></i></div><div class="codex-footer">? for shortcuts</div>';
    host.append(win);
    host.dataset.mobilePhase = "codex";
    const term = new Terminal({
        cols: Math.max(36, Math.floor((win.clientWidth - 24) / 6.6)),
        rows: 18,
        disableStdin: true,
        fontSize: innerWidth <= 650 ? 14 : 12,
        fontFamily: '"Cascadia Mono",Consolas,"Courier New",monospace',
        convertEol: true,
        cursorBlink: true,
        theme: {
            background: "#0f0f18",
            foreground: "#eeeeef",
            green: "#7ac99a",
            cyan: "#39b9c5"
        }
    });
    term.open(win.querySelector(".agent-terminal-body"));
    if (term.textarea) {
        term.textarea.readOnly = true;
        term.textarea.inputMode = "none";
        term.textarea.tabIndex = -1;
    }
    const fitObserver = new ResizeObserver(() => {
        const b = win.querySelector(".agent-terminal-body"), fs = innerWidth <= 650 ? 14 : 12;
        term.options.fontSize = fs;
        const style = getComputedStyle(b), width = b.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight), height = b.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom), row = b.querySelector(".xterm-rows>div"), cellHeight = row?.getBoundingClientRect().height || Math.ceil(fs * 1.2), measure = b.querySelector(".xterm-char-measure-element"), cellWidth = measure?.getBoundingClientRect().width / Math.max(1, measure?.textContent.length || 1) || fs * .61;
        term.resize(Math.max(2, Math.floor(width / cellWidth)), Math.max(1, Math.floor(height / cellHeight)));
        term.scrollToBottom();
    });
    fitObserver.observe(win.querySelector(".agent-terminal-body"));
    let tourPaused = false, pausedState = "running";
    const pending = new Set;
    function schedule(fn, ms) {
        let left = ms, last = performance.now();
        const job = {
            id: null
        };
        pending.add(job);
        function tick() {
            const now = performance.now();
            if (closed) {
                pending.delete(job);
                return;
            }
            if (!tourPaused) left -= now - last;
            last = now;
            if (left <= 0) {
                pending.delete(job);
                fn();
            } else job.id = setTimeout(tick, Math.min(32, left));
        }
        job.id = setTimeout(tick, Math.min(32, left));
        return job;
    }
    function cancelTimer(job) {
        if (job) {
            clearTimeout(job.id);
            pending.delete(job);
        }
    }
    let audioEndTimer = null;
    function cancelAudioEnding() {
        clearTimeout(audioEndTimer);
        audioEndTimer = null;
        displays.forEach(w => {
            const music = w.querySelector("iframe")?.contentWindow;
            music?.cancelFade?.();
            music?.cancelRemix?.();
        });
    }
    let timer = null, closed = false, index = 0, displays = [], build = null;
    const composer = win.querySelector(".codex-input"), working = win.querySelector(".codex-working"), footer = win.querySelector(".codex-footer");
    const app = document.querySelector("#app"), send = (os, state, name) => app.contentWindow.postMessage({
        type: "demo-agent-state",
        os: guestOs(os),
        state: state,
        name: macHost ? name?.replace("ubuntu", "macos") : name
    }, "*");
    const line = (s, color = "", onPresented) => {
        if (macHost) s = s.replaceAll("Ubuntu", "macOS").replaceAll("ubuntu", "macos").replaceAll('osType="Linux"', 'osType="macOS"').replaceAll("gpuMode=1", "gpuMode=0").replaceAll("C:\\ISOs\\Windows11.iso", "/Users/user/Downloads/Windows11-arm64.iso").replaceAll("C:\\ISOs\\macos-26.04-desktop-amd64.iso", "/Users/user/Downloads/Restore.ipsw").replaceAll("/home/user/", "/Users/user/").replaceAll("bash /tmp/qa/smoke.sh", "zsh /tmp/qa/smoke.sh");
        if (s.startsWith("> ")) s = "  │ " + s.slice(2);
        term.writeln((color ? "[" + color + "m" : "") + s + "[0m", () => {
            term.scrollToBottom();
            if (onPresented) requestAnimationFrame(() => requestAnimationFrame(onPresented));
        });
    };
    function display(system) {
        const w = document.createElement("div");
        w.className = "guest-window connected agent-display " + (system === "ubuntu" ? "agent-ubuntu" : "agent-windows");
        w.dataset.agentOs = guestOs(system);
        w.dataset.workflowOs = system;
        w.innerHTML = '<div class="titlebar"><span>' + (system === "ubuntu" ? macHost ? "macos-qa" : "ubuntu-qa" : "win-qa") + ' — Display</span><span class="guest-title-actions vm-title-actions"><button class="vm-minimize" aria-label="Minimize ' + guestOs(system) + ' display">−</button><button class="vm-maximize" aria-label="Maximize ' + guestOs(system) + ' display">□</button><button class="vm-close" aria-label="Close ' + guestOs(system) + ' display">×</button></span></div><div class="guest-desktop ' + (macHost && system === "ubuntu" ? "mac" : system) + '">' + (system === "ubuntu" ? macHost ? MacDesktop.guest() : ubuntuDesktop() : windowsDesktop()) + "</div>";
        host.append(w);
        displays.push(w);
        w.querySelector(".vm-minimize").onclick = () => {
            w.classList.remove("connected");
            w.dataset.shellMinimized = "true";
        };
        w.querySelector(".vm-maximize").onclick = () => w.classList.toggle("maximized");
        w.querySelector(".vm-close").onclick = () => w.remove();
        return w;
    }
    function deploy(system) {
        const w = displays.find(w => w.dataset.workflowOs === system);
        if (!w || !build) return;
        const mock = document.createElement("div");
        mock.className = "agent-sample-app " + (macHost ? "music-sample" : "design-sample");
        mock.innerHTML = '<div class="agent-sample-title">' + appName + ' · dist/index.html</div><iframe title="' + appName + " on " + guestOs(system) + '" class="sample-runtime"></iframe>';
        w.querySelector(".guest-desktop").append(mock);
        const runtime = mock.querySelector("iframe");
        runtime.onload = () => {
            runtime.contentDocument.addEventListener("keydown", e => {
                if (e.isTrusted && e.target.matches("input,textarea,[contenteditable=true]")) document.dispatchEvent(new CustomEvent("demo-keyboard-editing", {
                    detail: true
                }));
            }, {
                capture: true
            });
            runtime.contentDocument.addEventListener("focusout", () => document.dispatchEvent(new CustomEvent("demo-keyboard-editing", {
                detail: false
            })), {
                capture: true
            });
            for (const type of [ "pointerdown", "pointerup", "pointercancel" ]) runtime.contentDocument.addEventListener(type, e => {
                if (e.isTrusted) document.dispatchEvent(new CustomEvent("demo-pointer-held", {
                    detail: type === "pointerdown"
                }));
            }, {
                capture: true,
                passive: true
            });
            for (const type of [ "pointerdown", "keydown", "touchstart" ]) runtime.contentDocument.addEventListener(type, e => {
                if (e.isTrusted) {
                    pauseTour();
                    document.dispatchEvent(new Event("demo-user-input"));
                }
            }, {
                capture: true,
                passive: true
            });
        };
        runtime.srcdoc = build.html;
    }
    let qaEpoch = 0;
    const qaWait = ms => new Promise(r => schedule(r, ms));
    async function test(system) {
        let keepMusicPlaying = false;
        const epoch = qaEpoch, w = displays.find(w => w.dataset.workflowOs === system), app = w?.querySelector(".agent-sample-app"), frame = app?.querySelector("iframe"), doc = frame?.contentDocument, input = doc?.querySelector(macHost ? "#music-search" : "#scale-value"), button = doc?.querySelector(macHost ? "#play-toggle" : "#material-coral");
        if (!input || !button) return;
        const desktop = w.querySelector(".guest-desktop"), cursor = document.createElement("div");
        cursor.className = "computer-use-cursor";
        cursor.innerHTML = '<svg viewBox="0 0 28 34"><path d="M3 2v25l7-6 5 10 5-3-5-9h10z" fill="white" stroke="#5b43ff" stroke-width="2"/></svg>';
        desktop.append(cursor);
        w.classList.add("computer-use-active");
        const alive = () => !closed && epoch === qaEpoch && w.isConnected;
        function point(el) {
            const r = el.getBoundingClientRect(), f = frame.getBoundingClientRect(), d = desktop.getBoundingClientRect();
            return {
                x: Math.round(f.left + r.left + r.width / 2 - d.left),
                y: Math.round(f.top + r.top + r.height / 2 - d.top)
            };
        }
        async function move(el) {
            const p = point(el);
            const fromX = parseFloat(cursor.style.left) || p.x, fromY = parseFloat(cursor.style.top) || p.y;
            cursor.style.transition = "none";
            await new Promise(resolve => {
                let last = performance.now(), elapsed = 0;
                function animate(now) {
                    if (!alive()) {
                        resolve();
                        return;
                    }
                    if (!tourPaused) elapsed += Math.min(50, now - last);
                    last = now;
                    const t = Math.min(1, elapsed / 850), f = t * t * (3 - 2 * t);
                    cursor.style.left = fromX + (p.x - fromX) * f + "px";
                    cursor.style.top = fromY + (p.y - fromY) * f + "px";
                    if (t < 1) requestAnimationFrame(animate); else resolve();
                }
                requestAnimationFrame(animate);
            });
            if (!alive()) return false;
            line("• Computer use · Click at " + p.x + ", " + (p.y + w.querySelector(".titlebar").offsetHeight), "36");
            cursor.classList.add("computer-use-click");
            await qaWait(250);
            cursor.classList.remove("computer-use-click");
            return alive();
        }
        try {
            line("• Computer use · " + (system === "windows" ? "win-qa" : macHost ? "macos-qa" : "ubuntu-qa"), "1");
            working.textContent = "• Computer use · " + (system === "windows" ? "win-qa" : macHost ? "macos-qa" : "ubuntu-qa");
            line("• Computer use · Find AppSandbox", "36");
            line("  └ AppSandbox");
            line("• Computer use · Find the VM display", "36");
            line("  └ " + (system === "windows" ? "win-qa" : macHost ? "macos-qa" : "ubuntu-qa") + " — Display");
            line("• Computer use · Inspect the VM display", "36");
            line("  └ Inspect the selected VM display");
            await qaWait(900);
            if (!alive() || !await move(input)) return;
            input.focus();
            input.value = "";
            line(macHost ? "    Search the music library" : "    Set object scale to 1.4");
            const value = macHost ? "Midnight" : "1.4";
            for (const c of value) {
                if (!alive()) return;
                input.value += c;
                input.dispatchEvent(new Event("input", {
                    bubbles: true
                }));
                await qaWait(65);
            }
            line("• Computer use · Type into the selected control", "36");
            if (!await move(button)) return;
            button.click();
            line(macHost ? "    Play selected album" : "    Apply coral material");
            await qaWait(macHost ? 4900 : 900);
            const actions = macHost ? [ [ "#next-track", "Play Neon Drift" ], [ "#save-track", "Save to library" ] ] : [ [ "#add-sphere", "Subdivide Suzanne to refine the surface" ], [ "[data-tool=orbit]", "Orbit the viewport with the mouse" ], [ "[data-tool=move]", "Move Suzanne with the mouse" ], [ "[data-tool=orbit]", "Face Suzanne toward camera" ] ];
            for (const [selector, label] of actions) {
                const control = doc.querySelector(selector);
                if (!control || !await move(control)) return;
                control.click();
                if (!macHost && (selector === "[data-tool=orbit]" || selector === "[data-tool=move]")) {
                    const view = doc.querySelector("canvas"), r = view.getBoundingClientRect(), x = r.left + r.width * .5, y = r.top + r.height * .5;
                    if (!await move(view)) return;
                    line(selector === "[data-tool=orbit]" ? "    Drag to inspect Suzanne from another angle" : "    Drag Suzanne across the viewport");
                    const front = label === "Face Suzanne toward camera", dx = front ? -117.5 : selector === "[data-tool=orbit]" ? 80 : 20, dy = front ? -.59 / .012 : selector === "[data-tool=orbit]" ? 20 : 0, cp = point(view);
                    cursor.style.transition = "none";
                    cursor.classList.add("computer-use-click");
                    const emitPointer = (type, px, py, buttons) => view.dispatchEvent(new PointerEvent(type, {
                        clientX: px,
                        clientY: py,
                        pointerId: 1,
                        pointerType: "mouse",
                        button: 0,
                        buttons: buttons,
                        bubbles: true
                    }));
                    emitPointer("pointerdown", x, y, 1);
                    let samples = 0;
                    await new Promise(resolve => {
                        const began = performance.now();
                        let lastFrame = began, progressMs = 0;
                        function tick(now) {
                            if (!alive()) {
                                emitPointer("pointercancel", x, y, 0);
                                resolve();
                                return;
                            }
                            if (tourPaused) {
                                lastFrame = now;
                                requestAnimationFrame(tick);
                                return;
                            }
                            progressMs += Math.min(50, Math.max(0, now - lastFrame));
                            lastFrame = now;
                            const t = Math.min(1, progressMs / 1200), f = t * t * (3 - 2 * t), mx = dx * f, my = dy * f;
                            cursor.style.left = cp.x + mx + "px";
                            cursor.style.top = cp.y + my + "px";
                            emitPointer("pointermove", x + mx, y + my, 1);
                            samples++;
                            if (t < 1) requestAnimationFrame(tick); else {
                                emitPointer("pointerup", x + mx, y + my, 0);
                                doc.body.dataset.agentDragSamples = String(samples);
                                doc.body.dataset.agentDragMs = String(Math.round(now - began));
                                doc.body.dataset.agentDragDx = String(dx);
                                doc.body.dataset.agentDragDy = String(dy);
                                resolve();
                            }
                        }
                        requestAnimationFrame(tick);
                    });
                    cursor.classList.remove("computer-use-click");
                    cursor.style.transition = "";
                }
                line("    " + label);
                await qaWait(500);
            }
            if (macHost && system === "windows" && doc.body.dataset.playing === "true") {
                if (!await move(button)) return;
                button.click();
                line("  └ Pause Windows playback");
                await qaWait(400);
            }
            line("• Computer use · Inspect the VM display", "36");
            line("  └ Verify the changed controls and current track");
            await qaWait(800);
            if (!alive()) return;
            const validationPassed = macHost ? doc.body.dataset.test === "passed" && doc.body.dataset.library === "passed" && doc.body.dataset.next === "passed" : Number(input.value) === 1.4 && doc.body.dataset.transform === "passed" && doc.body.dataset.material === "passed" && doc.body.dataset.primitive === "passed" && Number(doc.body.dataset.frames) > 5;
            const pass = true;
            app.dataset.validation = validationPassed ? "passed" : "unavailable";
            keepMusicPlaying = macHost && system === "ubuntu";
            app.dataset.qa = "passed";
            line("  └ " + (system === "windows" ? "Windows" : secondLabel) + ": " + appName + " controls → " + (pass ? "PASS" : "FAIL"), pass ? "32" : "31");
            await qaWait(800);
        } finally {
            if (macHost && (!keepMusicPlaying || !alive())) frame.contentWindow?.pauseAudio?.();
            cursor.remove();
            w.classList.remove("computer-use-active");
        }
    }
    const steps = [ () => {
        line("• I’ll use AppSandbox’s headless API, then SSH to deploy the build and run checks.", "36");
    }, () => {
        line("• Updated Plan", "1");
        line("  └ □ Build " + appName);
        line("    □ Create Windows and Ubuntu sandboxes");
        line("    □ Deploy the build and run smoke tests");
    }, () => {
        line("• Explored", "1");
        line("  └ Read src/main.js, src/style.css");
        line("    List src/ → main.js  style.css");
    }, () => {
        line("• Edited src/main.js", "1");
        project.script.split("\n").filter(x => x.trim()).slice(0, 5).forEach(x => line("  + " + x.slice(0, 100), "32"));
    }, () => {
        line("• Ran local browser build", "1");
        line("  └ Parse src/main.js");
        new Function(project.script);
        line("    Syntax check passed", "90");
    }, () => {
        build = project.build();
        line("    Bundle src/main.js + src/style.css", "90");
        line("    dist/index.html  " + build.bytes + " bytes", "32");
        line("    Build complete", "32");
    }, () => {
        line("• Ran python tools/provision.py", "1");
        line("> import asb, os, time");
        line("> c = asb.connect()");
        line("> c.version(); c.list()");
        line("  GET /v1/version · GET /v1/vms", "90");
        send("windows", "reset");
    }, () => {
        line('> c.create(name="win-qa", osType="Windows",');
        line('    imagePath=r"C:\\ISOs\\Windows11.iso", ramMb=8192,');
        line("    hddGb=64, cpuCores=4, gpuMode=1, networkMode=1,");
        line('    adminUser="user", adminPass=os.environ["ASB_PASSWORD"],');
        line("    sshEnabled=True, sshDeployKey=True)");
        line("  POST /v1/vms → 202 Accepted", "90");
        send("windows", "building", "win-qa");
    }, () => {
        line('> c.wait_online("win-qa", timeout=2400)');
        line("  building → installing → booting", "90");
        send("windows", "starting", "win-qa");
    }, () => {
        send("windows", "online", "win-qa");
        line("  win-qa online", "32");
        line('> c.ssh_info("win-qa")');
        line("  Wait for sshState == 4 and keyDeployed.", "90");
        line('> while not c.display_ready("win-qa"): time.sleep(1)');
        line('> c.open_display("win-qa")');
        line("  POST /v1/vm-ids/<returned-id>/display {}", "90");
        display("windows");
    }, () => {
        line('> c.create(name="ubuntu-qa", osType="Linux",');
        line('    imagePath=r"C:\\ISOs\\ubuntu-26.04-desktop-amd64.iso",');
        line("    ramMb=8192, hddGb=64, cpuCores=4, gpuMode=1,");
        line('    networkMode=1, adminUser="user",');
        line('    adminPass=os.environ["ASB_PASSWORD"],');
        line("    sshEnabled=True, sshDeployKey=True)");
        line("  POST /v1/vms → 202 Accepted", "90");
        send("ubuntu", "building", "ubuntu-qa");
    }, () => {
        line('> c.wait_online("ubuntu-qa", timeout=2400)');
        line("  building → installing → booting", "90");
        send("ubuntu", "starting", "ubuntu-qa");
    }, () => {
        send("ubuntu", "online", "ubuntu-qa");
        line("  ubuntu-qa online", "32");
        line('> c.ssh_info("ubuntu-qa")');
        line("  SSH ready; key deployed.", "90");
        line('> while not c.display_ready("ubuntu-qa"): time.sleep(1)');
        line('> c.open_display("ubuntu-qa")');
        display("ubuntu");
    }, () => {
        line("• Ran python tools/deploy.py --target win-qa", "1");
        line("  └ SCP dist/index.html → C:/QA/" + projectName + "/index.html");
        line("    SSH identity and forwarded port from asb.ssh_info");
        line("    Transfer 100% · " + build.bytes + " bytes", "90");
        deploy("windows");
    }, () => {
        line("• Ran python tools/deploy.py --target ubuntu-qa", "1");
        line("  └ SCP dist/index.html → /home/user/" + projectName + "/index.html");
        line("    Transfer 100% · " + build.bytes + " bytes", "90");
        deploy("ubuntu");
    }, async () => {
        host.dataset.mobilePhase = "vms";
        line("• Run computer-use QA on each VM display", "1");
        await test("windows");
        await test("ubuntu");
    }, () => {
        host.dataset.mobilePhase = "codex";
        const passed = true;
        line("");
        line(passed ? "• Windows and Ubuntu checks passed." : "• A check needs attention.", passed ? "32" : "31");
        line("• QA report", "1");
        for (const w of displays) {
            const ok = true, label = [ "windows", "mac-windows" ].includes(w.dataset.agentOs) ? "Windows" : secondLabel;
            line("  " + label + ": " + (ok ? "PASS" : "CHECK NEEDED") + " — " + (macHost ? "search, playback, next track, library save" : "scale, material, subdivision, orbit and move"), ok ? "32" : "31");
        }
        if (!passed) displays.forEach(w => w.querySelector("iframe")?.contentWindow?.pauseAudio?.());
        win.dataset.agentDemo = passed ? "report-ready" : "failed";
        document.querySelector("#demo-status").textContent = (passed ? "Complete" : "Check failed") + " · Windows and " + secondLabel;
    }, async () => {
        if (win.dataset.agentDemo !== "report-ready") return;
        const epoch = qaEpoch, alive = () => !closed && epoch === qaEpoch, prompt = "ok cool, make a PR with this branch and submit the qa results in the description";
        working.textContent = "";
        footer.textContent = "";
        composer.textContent = "";
        win.classList.add("codex-typing");
        win.dataset.promptState = "followup-typing";
        for (let n = 0; n < prompt.length; n++) {
            if (!alive()) return;
            composer.textContent += prompt[n];
            composer.parentElement.scrollTop = composer.parentElement.scrollHeight;
            await qaWait(35 + n % 5 * 10);
        }
        await qaWait(650);
        if (!alive()) return;
        line("");
        line("› " + prompt, "47;30");
        line("");
        composer.textContent = "";
        win.classList.remove("codex-typing");
        win.dataset.promptState = "followup-submitted";
        working.textContent = "• Working";
        line("• I’ll include the build and computer-use QA results for both platforms.");
        await qaWait(1150);
        if (!alive()) return;
        line("• Updated PR description", "1");
        line("  └ Windows: PASS");
        line("    " + secondLabel + ": PASS");
        line("    Checks: " + (macHost ? "search, playback, next track, library save" : "scale, material, subdivision, orbit and move"));
        await qaWait(1150);
        if (!alive()) return;
        line("• Ran gh pr create --fill --body-file /tmp/qa-report.md", "1");
        await qaWait(1150);
        if (!alive()) return;
        line("  └ Pull request created.", "32");
        working.textContent = "";
        footer.textContent = "? for shortcuts";
        await new Promise(resolve => line("• Done. The PR description includes the passing Windows and " + secondLabel + " QA results.", "32", () => {
            win.dataset.prPresentedAt = String(performance.timeOrigin + performance.now());
            resolve();
        }));
        if (!alive()) return;
        if (tourPaused) await qaWait(1);
        if (!alive()) return;
        if (macHost) {
            const music = displays.find(w => w.dataset.workflowOs === "ubuntu")?.querySelector("iframe")?.contentWindow;
            win.dataset.bassCue = music?.dropBass?.("pr-complete") ? "started" : "not-playing";
            win.dataset.bassCueAt = String(performance.timeOrigin + performance.now());
            audioEndTimer = setTimeout(() => {
                audioEndTimer = null;
                if (!closed) music?.fadeOut?.(3e3);
            }, 1e4);
        }
        win.dataset.completedAt = String(performance.now());
        win.dataset.agentDemo = "complete";
        document.dispatchEvent(new Event("demo-complete"));
        if (innerWidth <= 650) schedule(() => {
            if (closed) return;
            const about = document.createElement("section");
            about.className = "mobile-about";
            about.innerHTML = '<h2>App Sandbox</h2><p>Create isolated Windows, Linux and macOS virtual machines. Build, test and automate with the headless API.</p><a href="https://github.com/jamesstringer90/appsandbox" target="_blank" rel="noopener">App Sandbox on Github</a><button>Keep playing with the demo</button>';
            about.querySelector("button").onclick = () => {
                host.dataset.mobilePhase = "codex";
                about.remove();
            };
            host.append(about);
            host.dataset.mobilePhase = "about";
        }, 5e3);
        working.textContent = "";
        footer.textContent = "? for shortcuts";
    } ];
    async function step() {
        if (closed || index >= steps.length) {
            working.textContent = "";
            composer.textContent = "";
            footer.textContent = "? for shortcuts";
            return;
        }
        working.textContent = "• Working (" + Math.round(index * 1.15) + "s • esc to interrupt)";
        const epoch = qaEpoch;
        await steps[index++]();
        if (!closed && epoch === qaEpoch) {
            const qaTransition = index >= steps.length - 3;
            timer = schedule(step, qaTransition ? 2300 : 1150);
        }
    }
    const pauseTour = () => {
        cancelAudioEnding();
        if (tourPaused || win.dataset.agentDemo === "complete") return;
        tourPaused = true;
        pausedState = win.dataset.agentDemo;
        win.dataset.agentDemo = "paused";
        footer.textContent = "Paused";
    };
    const resumeTour = () => {
        if (!tourPaused || closed) return;
        tourPaused = false;
        win.dataset.agentDemo = pausedState;
        footer.textContent = "esc to interrupt";
    };
    document.addEventListener("demo-resume", resumeTour);
    document.addEventListener("demo-user-input", pauseTour);
    function typePrompt() {
        const prompt = macHost ? "Hey I need you to spin up a windows and macOS VM to verify this change runs and passes tests on both platforms; use computer use to do QA once the build is running on each VM, then give me a simple QA report in chat" : "Hey I need you to spin up a windows and ubuntu VM to verify this change runs and passes tests on both platforms; use computer use to do QA once the build is running on each VM, then give me a simple QA report in chat";
        let n = 0;
        composer.textContent = "";
        footer.textContent = "";
        win.classList.add("codex-typing");
        win.dataset.promptState = "typing";
        function type() {
            if (closed) return;
            if (n < prompt.length) {
                composer.textContent += prompt[n++];
                composer.parentElement.scrollTop = composer.parentElement.scrollHeight;
                timer = schedule(type, 30 + n % 6 * 10);
            } else {
                timer = schedule(() => {
                    line("");
                    line("› " + prompt, "47;30");
                    line("");
                    composer.textContent = "";
                    win.classList.remove("codex-typing");
                    win.dataset.promptState = "submitted";
                    footer.textContent = "esc to interrupt";
                    step();
                }, 700);
            }
        }
        type();
    }
    function run() {
        qaEpoch++;
        const pause = document.querySelector("#pause");
        if (pause.textContent === "Pause") pause.click();
        document.querySelector("#pause").disabled = true;
        document.querySelector("#pause").textContent = "Codex";
        document.querySelector("#replay").disabled = true;
        document.querySelector("#demo-status").textContent = "Agent workflow · headless API";
        cancelTimer(timer);
        send("windows", "reset");
        document.querySelectorAll(".additional-display").forEach(e => e.remove());
        displays.forEach(w => {
            w.querySelector("iframe")?.contentWindow?.pauseAudio?.();
            w.remove();
        });
        displays = [];
        index = 0;
        term.reset();
        win.dataset.agentDemo = "running";
        document.querySelector("#guest").classList.remove("connected");
        line(">_ OpenAI Codex", "1");
        line("   ~/project/" + projectName, "90");
        line("");
        typePrompt();
    }
    win.querySelector(".agent-close").onclick = onClose;
    timer = schedule(run, 400);
    return () => {
        cancelAudioEnding();
        document.removeEventListener("demo-user-input", pauseTour);
        document.removeEventListener("demo-resume", resumeTour);
        for (const job of pending) clearTimeout(job.id);
        pending.clear();
        document.querySelector("#pause").disabled = false;
        document.querySelector("#pause").textContent = "Play";
        document.querySelector("#replay").disabled = false;
        closed = true;
        qaEpoch++;
        cancelTimer(timer);
        fitObserver.disconnect();
        term.dispose();
        win.remove();
        host.querySelector(".mobile-about")?.remove();
        displays.forEach(w => {
            w.querySelector("iframe")?.contentWindow?.pauseAudio?.();
            w.remove();
        });
        app.contentWindow.postMessage({
            type: "demo-control",
            action: "reset",
            os: macHost ? "mac" : "windows"
        }, "*");
    };
};
