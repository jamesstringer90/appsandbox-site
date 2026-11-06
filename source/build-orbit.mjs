/* SPDX-FileCopyrightText: 2023 Blender Authors
 * SPDX-License-Identifier: GPL-2.0-or-later
 * Suzanne geometry adapted from Blender source/blender/bmesh/operators/bmo_primitive.cc
 * (monkeyv/monkeyf arrays). Modified for this website: geometry converted to JavaScript
 * arrays; subdivision, normals, WebGL/software rendering and interactive controls integrated.
 * Modification notice recorded 2026-11-06. Distributed without warranty.
 * See licenses/suzanne-GPL.txt and licenses/ATTRIBUTION.txt.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=fs.readFileSync(root+'/source/orbit-studio/main.js','utf8').trimEnd();
const css=fs.readFileSync(root+'/source/orbit-studio/style.css','utf8').replace(/^\/\*[^]*?\*\/\n/,'');
const markup=fs.readFileSync(root+'/source/orbit-studio/body.html','utf8').replace(/^<!--[^]*?-->\n/,'');
const build=function() {
        new Function(this.script);
        const html = '<!doctype html><html><head><meta charset="utf-8"><style>' + this.css + "</style></head><bo" + "dy>" + this.markup + "<script>" + this.script + "<\/script></body></html>";
        return {
            html: html,
            bytes: (new TextEncoder).encode(html).length,
            files: [ "src/main.js", "src/style.css", "dist/index.html" ]
        };
    };
fs.writeFileSync(root+'/scripts/design-build.js',"/* SPDX-FileCopyrightText: 2023 Blender Authors\n * SPDX-License-Identifier: GPL-2.0-or-later\n * Suzanne geometry adapted from Blender source/blender/bmesh/operators/bmo_primitive.cc\n * (monkeyv/monkeyf arrays). Modified for this website: geometry converted to JavaScript\n * arrays; subdivision, normals, WebGL/software rendering and interactive controls integrated.\n * Modification notice recorded 2026-11-06. Distributed without warranty.\n * See licenses/suzanne-GPL.txt and licenses/ATTRIBUTION.txt.\n */\n"+'window.DesignProject={script:'+JSON.stringify(script)+',css:'+JSON.stringify(css)+',markup:'+JSON.stringify(markup)+',build:'+build.toString()+'};\n');
