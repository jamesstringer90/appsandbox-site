(function () {
    'use strict';

    const VM_NAME = 'MySandbox';

    const logEl       = document.getElementById('demo-log');
    const statusEl    = document.getElementById('demo-status');
    const agentDotEl  = document.getElementById('demo-agent-dot');
    const startBtn    = document.getElementById('demo-start');
    const shutdownBtn = document.getElementById('demo-shutdown');
    const stopBtn     = document.getElementById('demo-stop');
    const iddBtn      = document.getElementById('demo-idd');
    const displayWin  = document.getElementById('demo-display-window');
    const displayImg  = displayWin ? displayWin.querySelector('img') : null;
    const cursor      = document.getElementById('demo-cursor');
    const stage       = document.querySelector('.demo-stage');
    /* Cursor is a sibling of the (zoom-scaled) stage, so its coord base is .demo. */
    const demoSection = document.querySelector('.demo');

    /* Fractional coordinates of the close (X) glyph inside the display
       screenshot — stays accurate at any rendered size. */
    const DISPLAY_CLOSE_X_PCT = 0.984;
    const DISPLAY_CLOSE_Y_PCT = 0.018;

    if (!stage || !cursor || !startBtn) return;

    let timers = [];

    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function log(msg) {
        const line = document.createElement('div');
        line.className = 'log-line';
        line.textContent = msg;
        logEl.appendChild(line);
        logEl.scrollTop = logEl.scrollHeight;
    }

    function currentStageZoom() {
        const z = parseFloat(stage.style.zoom);
        return (isNaN(z) || !z) ? 1 : z;
    }

    /* The arrow-tip of the 22x22 cursor SVG sits at viewBox (4, 2), which
       maps to CSS (3.67, 1.83). We want the tip (not the SVG's top-left) to
       land on the target point, so every call to translate must subtract the
       hotspot. Otherwise tiny mobile targets are missed by ~4 px to the right. */
    const CURSOR_HOTSPOT_X = 3.67;
    const CURSOR_HOTSPOT_Y = 1.83;

    function placeCursorAt(x, y) {
        cursor.style.transform =
            'translate(' + (x - CURSOR_HOTSPOT_X) + 'px, ' +
                           (y - CURSOR_HOTSPOT_Y) + 'px)';
    }

    function moveCursorTo(el, offsetX, offsetY) {
        const rect = el.getBoundingClientRect();
        const baseRect = demoSection.getBoundingClientRect();
        /* Fixed px offsets are authored for unscaled (desktop) geometry, so
           multiply by the current zoom to keep them proportional to the
           zoomed target. rect.width is already post-zoom, so the fallback
           center value doesn't need scaling. */
        const z = currentStageZoom();
        const ox = offsetX ? offsetX * z : rect.width  / 2;
        const oy = offsetY ? offsetY * z : rect.height / 2;
        placeCursorAt(rect.left - baseRect.left + ox,
                      rect.top  - baseRect.top  + oy);
    }

    /* Position the cursor at a fractional point inside an element's current
       rendered box. Works at any zoom/breakpoint because it reads the live
       bounding rect. */
    function moveCursorToPct(el, pctX, pctY) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const baseRect = demoSection.getBoundingClientRect();
        placeCursorAt(rect.left - baseRect.left + rect.width  * pctX,
                      rect.top  - baseRect.top  + rect.height * pctY);
    }

    /* The stage is a fixed design canvas (1200 normally, 1400 when the
       display window is on screen). Whenever the viewport is narrower than
       that design width we scale the whole stage down with CSS `zoom` so
       the layout keeps its proportions and the page never needs horizontal
       scrollbars. .wrap caps at 1400 so we cap availableW there too. */
    function updateDemoScale() {
        const displayVisible = displayWin.classList.contains('visible');
        const designW = displayVisible ? 1400 : 1200;
        const availableW = Math.min(window.innerWidth - 32, 1400);
        const scale = Math.min(1, availableW / designW);
        stage.style.zoom = scale >= 1 ? '' : scale;
    }

    function clickPulse() {
        cursor.classList.remove('clicking');
        /* force reflow so the animation restarts */
        void cursor.offsetWidth;
        cursor.classList.add('clicking');
    }

    function setStopped() {
        statusEl.className = 'status-stopped';
        statusEl.textContent = 'Stopped';
        agentDotEl.className = 'agent-dot disabled';
        startBtn.classList.remove('inactive');
        shutdownBtn.classList.add('inactive');
        stopBtn.classList.add('inactive');
        iddBtn.classList.add('inactive');
    }

    function setRunning() {
        statusEl.className = 'status-running';
        statusEl.textContent = 'Running';
        agentDotEl.className = 'agent-dot';
        startBtn.classList.add('inactive');
        shutdownBtn.classList.remove('inactive');
        stopBtn.classList.remove('inactive');
        iddBtn.classList.remove('inactive');
    }

    function setShuttingDown() {
        statusEl.className = 'status-shutting-down';
        statusEl.textContent = 'Shutting Down';
    }

    function setAgentOnline(on) {
        agentDotEl.className = 'agent-dot' + (on ? ' online' : '');
    }

    function showDisplay() {
        displayWin.classList.add('mounted');
        /* force reflow so the subsequent .visible toggle animates */
        void displayWin.offsetHeight;
        requestAnimationFrame(function () {
            displayWin.classList.add('visible');
            updateDemoScale();
        });
    }

    function hideDisplay() {
        /* .fading keeps .visible applied so :has() keeps the grid in 2-col
           while opacity animates back to 0. */
        displayWin.classList.add('fading');
        timers.push(setTimeout(function () {
            displayWin.classList.remove('visible');
            displayWin.classList.remove('fading');
            displayWin.classList.remove('mounted');
            updateDemoScale();
        }, 500));
    }

    function reset() {
        clearTimers();
        logEl.innerHTML = '';
        setStopped();
        displayWin.classList.remove('visible');
        displayWin.classList.remove('fading');
        displayWin.classList.remove('mounted');
    }

    function runCycle() {
        reset();

        /* Park cursor just above the Start button so the first move is visible */
        moveCursorTo(startBtn, -38, -26);

        /* -------- Boot phase -------- */
        at(900,  function () { moveCursorTo(startBtn, 10, 10); });
        at(1500, clickPulse);
        at(1600, function () {
            setRunning();
            log('Starting VM "' + VM_NAME + '"...');
        });
        at(1800, function () { log('VM "' + VM_NAME + '" started.'); });
        at(2000, function () { log('Sent 1 GPU share(s) to agent for "' + VM_NAME + '".'); });
        at(2300, function () { log('GPU copy progress for "' + VM_NAME + '": 8/23 files'); });
        at(2600, function () { log('GPU copy progress for "' + VM_NAME + '": 17/23 files'); });
        at(2900, function () { log('GPU copy progress for "' + VM_NAME + '": 23/23 files'); });
        at(3100, function () { log('GPU copy complete for "' + VM_NAME + '" (23 files).'); });
        at(3400, function () {
            setAgentOnline(true);
            log('Agent online for "' + VM_NAME + '".');
        });
        at(3500, function () { log('IDD probe: starting for "' + VM_NAME + '"'); });
        at(3900, function () { log('IDD probe: VDD ready for "' + VM_NAME + '", opening display'); });
        at(4000, showDisplay);
        /* Grid reflows when the display appears — resync cursor to the new Start position */
        at(4100, function () { moveCursorTo(startBtn, 10, 10); });

        /* -------- Hold phase (4000 -> 8000) -------- */

        /* -------- Phase 3a: user closes the display window via its X -------- */
        at(8000, function () { moveCursorToPct(displayImg, DISPLAY_CLOSE_X_PCT, DISPLAY_CLOSE_Y_PCT); });
        at(8800, clickPulse);
        /* hideDisplay starts a 500ms opacity fade; after that the grid reflows
           back to one column and the manager grows to its full width. */
        at(8900, hideDisplay);

        /* -------- Phase 3b: manager is full width again — navigate to Shutdown -------- */
        /* hideDisplay completes at ~9400. Give the reflow a beat to settle,
           then capture the shutdown button's new position and move the cursor. */
        at(9700, function () { moveCursorTo(shutdownBtn, 10, 10); });
        at(10500, clickPulse);

        /* -------- Phase 3c: only now does the shutdown animation start -------- */
        at(10600, function () {
            setShuttingDown();
            log('Sending shutdown signal to "' + VM_NAME + '"...');
        });
        at(10800, function () { log('Shutdown signal sent to "' + VM_NAME + '".'); });
        at(11100, function () { log('Guest OS shutting down for "' + VM_NAME + '".'); });
        at(11400, function () { log('Agent service stopped in "' + VM_NAME + '".'); });
        at(11500, function () { setAgentOnline(false); });
        at(11700, function () {
            log('VM "' + VM_NAME + '" exited.');
            agentDotEl.className = 'agent-dot disabled';
        });
        at(11900, function () {
            statusEl.className = 'status-stopped';
            statusEl.textContent = 'Stopped';
            startBtn.classList.remove('inactive');
            shutdownBtn.classList.add('inactive');
            stopBtn.classList.add('inactive');
            iddBtn.classList.add('inactive');
        });

        /* -------- Loop: cursor to Start, click, run again -------- */
        at(12600, function () { moveCursorTo(startBtn, 10, 10); });
        at(13400, clickPulse);
        at(13600, runCycle);
    }

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
        /* Static preview for motion-sensitive users */
        setRunning();
        setAgentOnline(true);
        log('Agent online for "' + VM_NAME + '".');
        log('IDD probe: VDD ready for "' + VM_NAME + '", opening display');
        displayWin.classList.add('mounted');
        displayWin.classList.add('visible');
        cursor.style.display = 'none';
    } else {
        updateDemoScale();
        window.addEventListener('resize', updateDemoScale);
        /* Let layout settle, then start the cycle */
        window.addEventListener('load', function () {
            updateDemoScale();
            setTimeout(runCycle, 400);
        });
        if (document.readyState === 'complete') {
            setTimeout(runCycle, 400);
        }
    }
})();
