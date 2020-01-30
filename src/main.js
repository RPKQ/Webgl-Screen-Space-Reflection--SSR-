import * as glm from 'gl-matrix';
import * as Stats from 'stats-js';
import * as Dat from 'dat.gui';

// global variable
var gl = window.WebGL2RenderingContext.prototype; // specify type for code snippet
var stats = null;
var gui = null;

var global = {
    program: null,
    start: null,
};
var matrix = {
    m: null,
    v: null,
    p: null,
};
var uniform = {
    mvp: null,
    m: null,
    eye: null,
    light: null,
    co: null,
    nm: null,
    use: null,
};
var model = {
    vao: null,
    ctr: null,
    tex: [],
};
var flag = {
    use: false,
};

function initWebGL() {
    let canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.querySelector('body').appendChild(canvas);

    gl = canvas.getContext('webgl2');
    if (!gl) {
        alert('WebGL 2 not available');
    }

    // webgl setting
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    // gl.depthFunc(gl.LEQUAL);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    // fps
    stats = new Stats();
    stats.domElement.classList.add('navbar')
    document.body.appendChild(stats.domElement);

    // gui
    gui = new Dat.GUI();
    gui.domElement.classList.add('navbar');
    let nmFolder = gui.addFolder('Normal');
    nmFolder.add(flag, 'use').onChange((val) => {
        gl.uniform1i(uniform.use, val);
    });
    nmFolder.open();

    // matrix
    matrix.m = glm.mat4.create();
    matrix.v = glm.mat4.create();
    matrix.p = glm.mat4.create();
    glm.mat4.lookAt(matrix.v, glm.vec3.fromValues(0, 2.5, 5), glm.vec3.fromValues(0, 0, 0), glm.vec3.fromValues(0, 1, 0));
    glm.mat4.perspective(matrix.p, Math.PI * 0.5, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100.0);
}

function createShader() {
    // get shader string
    let vsSrc = document.getElementById('vertex').innerText.trim();
    let fsSrc = document.getElementById('fragment').innerText.trim();

    // create vertex shader
    let vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vsSrc);
    gl.compileShader(vs);

    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs));
    }

    // create fragment shader
    let fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fsSrc);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs));
    }

    // create shader program
    global.program = gl.createProgram();
    gl.attachShader(global.program, vs);
    gl.attachShader(global.program, fs);
    gl.linkProgram(global.program);

    if (!gl.getProgramParameter(global.program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(global.program));
    }

    // uniform location
    uniform.mvp = gl.getUniformLocation(global.program, 'uMVP');
    uniform.co = gl.getUniformLocation(global.program, 'uCO');
    uniform.nm = gl.getUniformLocation(global.program, 'uNM');
    uniform.m = gl.getUniformLocation(global.program, 'uM');
    uniform.eye = gl.getUniformLocation(global.program, 'uEye');
    uniform.light = gl.getUniformLocation(global.program, 'uLight');
    uniform.use = gl.getUniformLocation(global.program, 'uUse');

    gl.useProgram(global.program);
    gl.uniform1i(uniform.co, 0);
    gl.uniform1i(uniform.nm, 1);
    gl.uniform3fv(uniform.eye, glm.vec3.fromValues(0.0, 2.5, 0.0));
    gl.uniform1i(uniform.use, flag.use);
}

function _loadFile(url) {
    let fr = new FileReader();
    return new Promise((resolve, reject) => {
        let req = new XMLHttpRequest();
        req.open('GET', url, true);
        req.responseType = 'blob';
        req.onload = () => {
            fr.readAsText(req.response);
            fr.onload = (e) => {
                let f = e.target.result;
                let ls = f.split(/\r?\n/);
                resolve(ls);
            };
        }
        req.onerror = () => {
            reject(new Error(`Failed to load file's url: ${url}`));
        };
        req.send();
    });
}

async function loadObj(url) {
    // read file
    let lines = await _loadFile(url);

    // parse obj format
    let v = [];
    let vt = [];
    let vn = [];
    let idx = [];

    for (let line of lines) {
        line = line.split(' ');
        // console.log(line);
        if (line[0] == 'v') {
            v.push(parseFloat(line[1]));
            v.push(parseFloat(line[2]));
            v.push(parseFloat(line[3]));
        }
        else if (line[0] == 'vn') {
            vn.push(parseFloat(line[1]));
            vn.push(parseFloat(line[2]));
            vn.push(parseFloat(line[3]));
        }
        else if (line[0] == 'vt') {
            vt.push(parseFloat(line[1]));
            // flip vertically
            vt.push(1.0 - parseFloat(line[2]));
        }
        else if (line[0] == 'f') {
            // start from zero
            idx.push(parseInt(line[1].split('/')[0]) - 1);
            idx.push(parseInt(line[2].split('/')[0]) - 1);
            idx.push(parseInt(line[3].split('/')[0]) - 1);
        }
    }

    // compute tangent
    let tn = [];
    for (let i = 0; i < idx.length; i+=3) {
        let idx1 = idx[i];
        let idx2 = idx[i + 1];
        let idx3 = idx[i + 2];

        let p1 = glm.vec3.fromValues(v[idx1 * 3 + 0], v[idx1 * 3 + 1], v[idx1 * 3 + 2]);
        let p2 = glm.vec3.fromValues(v[idx2 * 3 + 0], v[idx2 * 3 + 1], v[idx2 * 3 + 2]);
        let p3 = glm.vec3.fromValues(v[idx3 * 3 + 0], v[idx3 * 3 + 1], v[idx3 * 3 + 2]);

        let n1 = glm.vec3.fromValues(vn[idx1 * 3 + 0], vn[idx1 * 3 + 1], vn[idx1 * 3 + 2]);
        let n2 = glm.vec3.fromValues(vn[idx2 * 3 + 0], vn[idx2 * 3 + 1], vn[idx2 * 3 + 2]);
        let n3 = glm.vec3.fromValues(vn[idx3 * 3 + 0], vn[idx3 * 3 + 1], vn[idx3 * 3 + 2]);

        let uv1 = glm.vec2.fromValues(vt[idx1 * 2 + 0], vt[idx1 * 2 + 1]);
        let uv2 = glm.vec2.fromValues(vt[idx2 * 2 + 0], vt[idx2 * 2 + 1]);
        let uv3 = glm.vec2.fromValues(vt[idx3 * 2 + 0], vt[idx3 * 2 + 1]);

        let dp1 = glm.vec3.create(); glm.vec3.sub(dp1, p2, p1);
        let dp2 = glm.vec3.create(); glm.vec3.sub(dp2, p3, p1);

        let duv1 = glm.vec2.create(); glm.vec2.sub(duv1, uv2, uv1);
        let duv2 = glm.vec2.create(); glm.vec2.sub(duv2, uv3, uv1);

        let r = 1.0 / (duv1[0] * duv2[1] - duv1[1] * duv2[0]);

        let t = glm.vec3.fromValues(
            (dp1[0] * duv2[1] - dp2[0] * duv1[1]) * r,
            (dp1[1] * duv2[1] - dp2[1] * duv1[1]) * r,
            (dp1[2] * duv2[1] - dp2[2] * duv1[1]) * r
        );

        let t1 = glm.vec3.create(); glm.vec3.cross(t1, n1, t);
        let t2 = glm.vec3.create(); glm.vec3.cross(t2, n2, t);
        let t3 = glm.vec3.create(); glm.vec3.cross(t3, n3, t);

        tn[idx1 * 3 + 0] = t1[0];
        tn[idx1 * 3 + 1] = t1[1];
        tn[idx1 * 3 + 2] = t1[2];

        tn[idx2 * 3 + 0] = t2[0];
        tn[idx2 * 3 + 1] = t2[1];
        tn[idx2 * 3 + 2] = t2[2];

        tn[idx3 * 3 + 0] = t3[0];
        tn[idx3 * 3 + 1] = t3[1];
        tn[idx3 * 3 + 2] = t3[2];
    }

    // stats
    console.log(`Load ${url}: ${v.length} vertices, ${vt.length} texcoords, ${vn.length} normals ` +
                `${tn.length} tangents ${idx.length / 3} faces`);
    
    // vao
    model.vao = gl.createVertexArray();
    gl.bindVertexArray(model.vao);

    // vbo
    let positions = new Float32Array(v);
    let normals = new Float32Array(vn);
    let texcoords = new Float32Array(vt);
    let tangents = new Float32Array(tn);

    let vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, positions.byteLength + normals.byteLength + texcoords.byteLength + tangents.byteLength, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
    gl.bufferSubData(gl.ARRAY_BUFFER, positions.byteLength, normals);
    gl.bufferSubData(gl.ARRAY_BUFFER, positions.byteLength + normals.byteLength, texcoords);
    gl.bufferSubData(gl.ARRAY_BUFFER, positions.byteLength + normals.byteLength + texcoords.byteLength, tangents);

    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, positions.byteLength);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, positions.byteLength + normals.byteLength);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 0, positions.byteLength + normals.byteLength + texcoords.byteLength);
    gl.enableVertexAttribArray(3);

    // ebo
    let indices  = new Uint32Array(idx);
    let ebo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    model.ctr = idx.length;
    
    // free array
    v.length = 0;
    vt.length = 0;
    vn.length = 0;
    idx.length = 0;
    tn.length = 0;

    gl.bindVertexArray(null);
    return true;
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        let img = new Image();
        img.onload = () => {
            resolve(img);
        };
        img.onerror = () => {
            reject(new Error(`Failed to load image's url: ${url}`));
        }
        img.src = url;
        img.crossOrigin = 'anonymous';
    });
}

async function loadAsset() {
    // obj
    let ret = await loadObj('./asset/ladybug.obj');

    // texture
    let promises = [];
    promises.push(loadImage('./asset/ladybug_co.png'));
    promises.push(loadImage('./asset/ladybug_nm.png'));
    let results = await Promise.all(promises);
    
    for (let i of [0, 1]) {
        model.tex[i] = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, model.tex[i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, results[i]);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }

    results.length = 0;
}

function render(delta, time) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(global.program);

    // set uniform
    // glm.mat4.rotateY(matrix.m, matrix.m, delta * 0.01 * Math.PI / 180.0);
    let mvp = glm.mat4.create();
    glm.mat4.multiply(mvp, matrix.p, matrix.v);
    glm.mat4.multiply(mvp, mvp, matrix.m);
    gl.uniformMatrix4fv(uniform.mvp, false, mvp);
    gl.uniformMatrix4fv(uniform.m, false, matrix.m);

    let light = glm.vec3.fromValues(
        40.0 * Math.sin(time * 0.001),
        30.0 + 20.0 * Math.cos(time * 0.001),
        40.0
    );
    gl.uniform3fv(uniform.light, light);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, model.tex[0]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, model.tex[1]);

    // drawing command
    gl.bindVertexArray(model.vao);
    gl.drawElements(gl.TRIANGLES, model.ctr, gl.UNSIGNED_INT, 0);
}

function animate(time) {
    if (!global.start) {
        global.start = time;
    }
    // in milliseconds
    let delta = time - global.start;
    global.start = time;

    stats.update();

    render(delta, time);

    window.requestAnimationFrame(animate);
}

window.onresize = () => {
    let canvas = document.querySelector('canvas');

    if (gl && canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        glm.mat4.perspective(matrix.p, Math.PI * 0.5, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100.0);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
}

window.onload = () => {
    initWebGL();
    createShader();
    loadAsset().then(() => {
        // rendering loop
        window.requestAnimationFrame(animate);
    });
}

