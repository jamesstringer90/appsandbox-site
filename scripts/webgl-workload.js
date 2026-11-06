window.mountWebGLWorkload = function(container, onClose) {
    const layer = document.createElement("section");
    layer.className = "webgl-workload";
    layer.innerHTML = '<div class="webgl-title"><span>GPU Lab · Live 3D</span><button class="webgl-pause">Pause</button><button class="webgl-close" aria-label="Close 3D workload">×</button></div><div class="webgl-view"><canvas aria-label="Six dynamically rendered rotating 3D cubes"></canvas><div class="webgl-labels">' + [ "01 · Vertex colors", "02 · Perspective", "03 · Depth", "04 · Surface lighting", "05 · Rotation", "06 · Triangle mesh" ].map(t => "<span>" + t + "</span>").join("") + '</div></div><div class="webgl-status" aria-live="polite">Starting browser WebGL…</div>';
    container.append(layer);
    const canvas = layer.querySelector("canvas"), hud = layer.querySelector(".webgl-status"), view = layer.querySelector(".webgl-view");
    const gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: true
    });
    let raf = 0, disposed = false, paused = false;
    const cleanup = () => {
        disposed = true;
        cancelAnimationFrame(raf);
        if (gl) {
            gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
        layer.remove();
    };
    layer.querySelector(".webgl-close").onclick = onClose;
    if (!gl) {
        const stopSoftware = mountSoftware3D(layer, canvas, hud, view);
        return () => {
            stopSoftware();
            cleanup();
        };
    }
    const vertex = `attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uProjection;uniform mat4 uModel;varying vec3 vColor;void main(){vec3 n=normalize(mat3(uModel)*aNormal);float light=.28+.72*max(dot(n,normalize(vec3(-.5,.8,1.))),0.);vColor=aColor*light;gl_Position=uProjection*uModel*vec4(aPosition,1.);}`;
    const fragment = `precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.);}`;
    function shader(type, source) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, source);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(sh));
        return sh;
    }
    let program;
    try {
        program = gl.createProgram();
        gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
        gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    } catch (e) {
        hud.textContent = "WebGL shader error: " + e.message;
        canvas.dataset.webgl = "shader-error";
        return cleanup;
    }
    gl.useProgram(program);
    const vertices = [];
    const faces = [ {
        p: [ [ -1, -1, 1 ], [ 1, -1, 1 ], [ 1, 1, 1 ], [ -1, 1, 1 ] ],
        n: [ 0, 0, 1 ],
        c: [ .14, .7, 1 ]
    }, {
        p: [ [ 1, -1, -1 ], [ -1, -1, -1 ], [ -1, 1, -1 ], [ 1, 1, -1 ] ],
        n: [ 0, 0, -1 ],
        c: [ .6, .25, 1 ]
    }, {
        p: [ [ 1, -1, 1 ], [ 1, -1, -1 ], [ 1, 1, -1 ], [ 1, 1, 1 ] ],
        n: [ 1, 0, 0 ],
        c: [ .13, 1, .72 ]
    }, {
        p: [ [ -1, -1, -1 ], [ -1, -1, 1 ], [ -1, 1, 1 ], [ -1, 1, -1 ] ],
        n: [ -1, 0, 0 ],
        c: [ 1, .35, .28 ]
    }, {
        p: [ [ -1, 1, 1 ], [ 1, 1, 1 ], [ 1, 1, -1 ], [ -1, 1, -1 ] ],
        n: [ 0, 1, 0 ],
        c: [ 1, .78, .17 ]
    }, {
        p: [ [ -1, -1, -1 ], [ 1, -1, -1 ], [ 1, -1, 1 ], [ -1, -1, 1 ] ],
        n: [ 0, -1, 0 ],
        c: [ .9, .2, .65 ]
    } ];
    for (const f of faces) for (const i of [ 0, 1, 2, 0, 2, 3 ]) vertices.push(...f.p[i], ...f.n, ...f.c);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    for (const [name, offset] of [ [ "aPosition", 0 ], [ "aNormal", 12 ], [ "aColor", 24 ] ]) {
        const loc = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 36, offset);
    }
    const projection = gl.getUniformLocation(program, "uProjection"), model = gl.getUniformLocation(program, "uModel");
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.SCISSOR_TEST);
    const mul = (a, b) => {
        const r = new Float32Array(16);
        for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) r[c * 4 + row] += a[k * 4 + row] * b[c * 4 + k];
        return r;
    };
    const rotX = a => {
        const c = Math.cos(a), s = Math.sin(a);
        return new Float32Array([ 1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1 ]);
    };
    const rotY = a => {
        const c = Math.cos(a), s = Math.sin(a);
        return new Float32Array([ c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1 ]);
    };
    function perspective(aspect) {
        const f = 1 / Math.tan(Math.PI / 7), near = .1, far = 100;
        return new Float32Array([ f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0 ]);
    }
    let spin = 0, last = performance.now(), frames = 0, fpsFrames = 0, fpsAt = last, dragX = 0, dragY = 0, drag = null;
    canvas.dataset.webgl = "active";
    canvas.dataset.renderer = gl.getParameter(gl.RENDERER);
    canvas.dataset.frames = "0";
    layer.querySelector(".webgl-pause").onclick = () => {
        paused = !paused;
        layer.querySelector(".webgl-pause").textContent = paused ? "Resume" : "Pause";
    };
    canvas.addEventListener("pointerdown", e => {
        drag = {
            x: e.clientX,
            y: e.clientY
        };
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", e => {
        if (drag) {
            dragX += (e.clientX - drag.x) * .012;
            dragY += (e.clientY - drag.y) * .012;
            drag = {
                x: e.clientX,
                y: e.clientY
            };
        }
    });
    canvas.addEventListener("pointerup", () => drag = null);
    function draw(now) {
        if (disposed) return;
        const dt = Math.min((now - last) / 1e3, .05);
        last = now;
        if (!paused) spin += dt;
        const ratio = Math.min(devicePixelRatio || 1, 2), w = Math.max(1, Math.floor(view.clientWidth * ratio)), h = Math.max(1, Math.floor(view.clientHeight * ratio));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        const cw = Math.floor(w / 3), ch = Math.floor(h / 2);
        gl.scissor(0, 0, w, h);
        gl.clearColor(.025, .04, .065, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        for (let i = 0; i < 6; i++) {
            const x = i % 3 * cw, y = (1 - Math.floor(i / 3)) * ch;
            gl.viewport(x + 5, y + 5, cw - 10, ch - 10);
            gl.scissor(x + 5, y + 5, cw - 10, ch - 10);
            gl.clearColor(.04 + i % 3 * .008, .075, .11, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            let m = mul(rotY(spin * (.42 + i * .09) + i * .7 + dragX), rotX(spin * .32 + i * .3 + dragY));
            m[14] = -5.5;
            gl.uniformMatrix4fv(projection, false, perspective(cw / ch));
            gl.uniformMatrix4fv(model, false, m);
            gl.drawArrays(gl.TRIANGLES, 0, 36);
        }
        frames++;
        fpsFrames++;
        canvas.dataset.frames = String(frames);
        if (now - fpsAt > 500) {
            const fps = Math.round(fpsFrames * 1e3 / (now - fpsAt));
            hud.textContent = "WebGL 1.0 · " + fps + " FPS · " + (paused ? "Paused" : "Drag to rotate") + "";
            canvas.dataset.fps = String(fps);
            fpsFrames = 0;
            fpsAt = now;
        }
        raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return cleanup;
};

function mountSoftware3D(layer, canvas, hud, view) {
    const ctx = canvas.getContext("2d");
    let frame = 0, raf = 0, stopped = false, paused = false, time = 0, last = performance.now(), fpsAt = last, fpsFrames = 0, dx = 0, dy = 0, drag = null;
    if (!ctx) {
        hud.textContent = "Neither WebGL nor Canvas rendering is available.";
        canvas.dataset.webgl = "unavailable";
        return () => {};
    }
    canvas.dataset.webgl = "software-3d";
    canvas.dataset.renderer = "Canvas 2D · perspective-projected 3D geometry";
    const points = [ [ -1, -1, -1 ], [ 1, -1, -1 ], [ 1, 1, -1 ], [ -1, 1, -1 ], [ -1, -1, 1 ], [ 1, -1, 1 ], [ 1, 1, 1 ], [ -1, 1, 1 ] ];
    const faces = [ {
        i: [ 0, 3, 2, 1 ],
        n: [ 0, 0, -1 ],
        c: [ 60, 164, 250 ]
    }, {
        i: [ 4, 5, 6, 7 ],
        n: [ 0, 0, 1 ],
        c: [ 159, 82, 248 ]
    }, {
        i: [ 1, 2, 6, 5 ],
        n: [ 1, 0, 0 ],
        c: [ 41, 226, 180 ]
    }, {
        i: [ 0, 4, 7, 3 ],
        n: [ -1, 0, 0 ],
        c: [ 250, 96, 75 ]
    }, {
        i: [ 3, 7, 6, 2 ],
        n: [ 0, 1, 0 ],
        c: [ 255, 199, 53 ]
    }, {
        i: [ 0, 1, 5, 4 ],
        n: [ 0, -1, 0 ],
        c: [ 231, 73, 175 ]
    } ];
    const rotate = (p, a, b) => {
        const x = p[0], y = p[1] * Math.cos(a) - p[2] * Math.sin(a), z = p[1] * Math.sin(a) + p[2] * Math.cos(a);
        return [ x * Math.cos(b) + z * Math.sin(b), y, -x * Math.sin(b) + z * Math.cos(b) ];
    };
    layer.querySelector(".webgl-pause").onclick = () => {
        paused = !paused;
        layer.querySelector(".webgl-pause").textContent = paused ? "Resume" : "Pause";
    };
    canvas.addEventListener("pointerdown", e => {
        drag = {
            x: e.clientX,
            y: e.clientY
        };
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", e => {
        if (drag) {
            dx += (e.clientX - drag.x) * .012;
            dy += (e.clientY - drag.y) * .012;
            drag = {
                x: e.clientX,
                y: e.clientY
            };
        }
    });
    canvas.addEventListener("pointerup", () => drag = null);
    function draw(now) {
        if (stopped) return;
        const dt = Math.min((now - last) / 1e3, .05);
        last = now;
        if (!paused) time += dt;
        const ratio = Math.min(devicePixelRatio || 1, 2), w = Math.max(1, Math.floor(view.clientWidth * ratio)), h = Math.max(1, Math.floor(view.clientHeight * ratio));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        ctx.fillStyle = "#09121d";
        ctx.fillRect(0, 0, w, h);
        const cw = w / 3, ch = h / 2;
        for (let i = 0; i < 6; i++) {
            const left = i % 3 * cw, top = Math.floor(i / 3) * ch;
            ctx.fillStyle = "#0c1b2a";
            ctx.fillRect(left + 4, top + 4, cw - 8, ch - 8);
            const a = time * .32 + i * .3 + dy, b = time * (.42 + i * .09) + i * .7 + dx;
            const pp = points.map(p => rotate(p, a, b));
            const visible = faces.map(f => ({
                ...f,
                n: rotate(f.n, a, b),
                depth: f.i.reduce((s, j) => s + pp[j][2], 0) / 4
            })).filter(f => f.n[2] < 0).sort((a, b) => b.depth - a.depth);
            const scale = Math.min(cw, ch) * 1.35;
            for (const f of visible) {
                const light = .3 + .7 * Math.max(0, (-.3 * f.n[0] + .5 * f.n[1] - f.n[2]) / 1.158);
                ctx.beginPath();
                f.i.forEach((j, k) => {
                    const p = pp[j], z = p[2] + 5;
                    const x = left + cw / 2 + p[0] * scale / z, y = top + ch / 2 - p[1] * scale / z + 7 * ratio;
                    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
                });
                ctx.closePath();
                ctx.fillStyle = "rgb(" + f.c.map(c => Math.round(c * light)).join(",") + ")";
                ctx.fill();
                ctx.strokeStyle = "rgba(220,245,255,.32)";
                ctx.lineWidth = ratio * .65;
                ctx.stroke();
            }
        }
        frame++;
        fpsFrames++;
        canvas.dataset.frames = String(frame);
        canvas.dataset.angle = time.toFixed(4);
        if (now - fpsAt > 500) {
            const fps = Math.round(fpsFrames * 1e3 / (now - fpsAt));
            canvas.dataset.fps = String(fps);
            hud.textContent = "Software 3D · " + fps + " FPS · " + (paused ? "Paused" : "Drag to rotate") + " · WebGL unavailable here";
            fpsFrames = 0;
            fpsAt = now;
        }
        raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => {
        stopped = true;
        cancelAnimationFrame(raf);
    };
}
