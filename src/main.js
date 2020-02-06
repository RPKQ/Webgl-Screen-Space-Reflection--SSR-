import * as glm from "gl-matrix";
import * as Stats from "stats-js";
import * as Dat from "dat.gui";

// global variable
var gl = window.WebGL2RenderingContext.prototype; // specify type for code snippet
var stats = null;
var gui = null;

var global = {
	start: null
};
var flag = {
	use: false
};

// -- program -- //

var programOrigin = {
	id: null,
	umvp: null,
	utex: null
};
var programWindow = {
	id: null,
	utex: null
};

// -- Model -- //

var winModel = {
	vao: null
};
var cubeModel = {
	vao: null,
	atex: null,
	mm: null,
	mv: null,
	mp: null
};

// -- FBO -- //

var fbo = {
	id: null,
	tex: null,
	rbo: null
};
var Gbuffer = {
	id: null,
	posTex: null,
	UVtex: null,
	TBNtex: null,
	normalTex: null,
	eyeTex: null,
	lightTex: null,
	depthTex: null
};

// -------- TOOLS ---------- //

async function loadObj(url) {
	// read file
	let lines = await _loadFile(url);

	// parse obj format
	let v = [];
	let vt = [];
	let vn = [];
	let idx = [];

	for (let line of lines) {
		line = line.split(" ");
		// console.log(line);
		if (line[0] == "v") {
			v.push(parseFloat(line[1]));
			v.push(parseFloat(line[2]));
			v.push(parseFloat(line[3]));
		} else if (line[0] == "vn") {
			vn.push(parseFloat(line[1]));
			vn.push(parseFloat(line[2]));
			vn.push(parseFloat(line[3]));
		} else if (line[0] == "vt") {
			vt.push(parseFloat(line[1]));
			// flip vertically
			vt.push(1.0 - parseFloat(line[2]));
		} else if (line[0] == "f") {
			// start from zero
			idx.push(parseInt(line[1].split("/")[0]) - 1);
			idx.push(parseInt(line[2].split("/")[0]) - 1);
			idx.push(parseInt(line[3].split("/")[0]) - 1);
		}
	}

	// compute tangent
	let tn = [];
	for (let i = 0; i < idx.length; i += 3) {
		let idx1 = idx[i];
		let idx2 = idx[i + 1];
		let idx3 = idx[i + 2];

		let p1 = glm.vec3.fromValues(
			v[idx1 * 3 + 0],
			v[idx1 * 3 + 1],
			v[idx1 * 3 + 2]
		);
		let p2 = glm.vec3.fromValues(
			v[idx2 * 3 + 0],
			v[idx2 * 3 + 1],
			v[idx2 * 3 + 2]
		);
		let p3 = glm.vec3.fromValues(
			v[idx3 * 3 + 0],
			v[idx3 * 3 + 1],
			v[idx3 * 3 + 2]
		);

		let n1 = glm.vec3.fromValues(
			vn[idx1 * 3 + 0],
			vn[idx1 * 3 + 1],
			vn[idx1 * 3 + 2]
		);
		let n2 = glm.vec3.fromValues(
			vn[idx2 * 3 + 0],
			vn[idx2 * 3 + 1],
			vn[idx2 * 3 + 2]
		);
		let n3 = glm.vec3.fromValues(
			vn[idx3 * 3 + 0],
			vn[idx3 * 3 + 1],
			vn[idx3 * 3 + 2]
		);

		let uv1 = glm.vec2.fromValues(vt[idx1 * 2 + 0], vt[idx1 * 2 + 1]);
		let uv2 = glm.vec2.fromValues(vt[idx2 * 2 + 0], vt[idx2 * 2 + 1]);
		let uv3 = glm.vec2.fromValues(vt[idx3 * 2 + 0], vt[idx3 * 2 + 1]);

		let dp1 = glm.vec3.create();
		glm.vec3.sub(dp1, p2, p1);
		let dp2 = glm.vec3.create();
		glm.vec3.sub(dp2, p3, p1);

		let duv1 = glm.vec2.create();
		glm.vec2.sub(duv1, uv2, uv1);
		let duv2 = glm.vec2.create();
		glm.vec2.sub(duv2, uv3, uv1);

		let r = 1.0 / (duv1[0] * duv2[1] - duv1[1] * duv2[0]);

		let t = glm.vec3.fromValues(
			(dp1[0] * duv2[1] - dp2[0] * duv1[1]) * r,
			(dp1[1] * duv2[1] - dp2[1] * duv1[1]) * r,
			(dp1[2] * duv2[1] - dp2[2] * duv1[1]) * r
		);

		let t1 = glm.vec3.create();
		glm.vec3.cross(t1, n1, t);
		let t2 = glm.vec3.create();
		glm.vec3.cross(t2, n2, t);
		let t3 = glm.vec3.create();
		glm.vec3.cross(t3, n3, t);

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
	console.log(
		`Load ${url}: ${v.length} vertices, ${vt.length} texcoords, ${vn.length} normals ` +
			`${tn.length} tangents ${idx.length / 3} faces`
	);

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
	gl.bufferData(
		gl.ARRAY_BUFFER,
		positions.byteLength +
			normals.byteLength +
			texcoords.byteLength +
			tangents.byteLength,
		gl.STATIC_DRAW
	);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
	gl.bufferSubData(gl.ARRAY_BUFFER, positions.byteLength, normals);
	gl.bufferSubData(
		gl.ARRAY_BUFFER,
		positions.byteLength + normals.byteLength,
		texcoords
	);
	gl.bufferSubData(
		gl.ARRAY_BUFFER,
		positions.byteLength + normals.byteLength + texcoords.byteLength,
		tangents
	);

	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, positions.byteLength);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(
		2,
		2,
		gl.FLOAT,
		false,
		0,
		positions.byteLength + normals.byteLength
	);
	gl.enableVertexAttribArray(2);
	gl.vertexAttribPointer(
		3,
		3,
		gl.FLOAT,
		false,
		0,
		positions.byteLength + normals.byteLength + texcoords.byteLength
	);
	gl.enableVertexAttribArray(3);

	// ebo
	let indices = new Uint32Array(idx);
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
		};
		img.src = url;
		img.crossOrigin = "anonymous";
	});
}

function _loadFile(url) {
	let fr = new FileReader();
	return new Promise((resolve, reject) => {
		let req = new XMLHttpRequest();
		req.open("GET", url, true);
		req.responseType = "blob";
		req.onload = () => {
			fr.readAsText(req.response);
			fr.onload = e => {
				let f = e.target.result;
				let ls = f.split(/\r?\n/);
				resolve(ls);
			};
		};
		req.onerror = () => {
			reject(new Error(`Failed to load file's url: ${url}`));
		};
		req.send();
	});
}

function createShader(vsID, fsID) {
	// get shader string
	let vsSrc = document.getElementById(vsID).innerText.trim();
	let fsSrc = document.getElementById(fsID).innerText.trim();

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
	const program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error(gl.getProgramInfoLog(program));
	}
	return program;
}

// ------- END TOOLS -------- //

// --------- INIT ----------- //

function initWebGL() {
	let canvas = document.createElement("canvas");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	document.querySelector("body").appendChild(canvas);

	gl = canvas.getContext("webgl2");
	if (!gl) {
		alert("WebGL 2 not available");
	}

	// webgl setting
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	// gl.depthFunc(gl.LEQUAL);
	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

	// fps
	stats = new Stats();
	stats.domElement.classList.add("navbar");
	document.body.appendChild(stats.domElement);

	// gui
	gui = new Dat.GUI();
	gui.domElement.classList.add("navbar");
	let nmFolder = gui.addFolder("Normal");
	nmFolder.add(flag, "use").onChange(val => {
		gl.uniform1i(1, val);
	});
	nmFolder.open();
}

function initVar() {
	// matrix
	cubeModel.mm = glm.mat4.create();
	cubeModel.mv = glm.mat4.create();
	cubeModel.mp = glm.mat4.create();
	glm.mat4.lookAt(
		cubeModel.mv,
		glm.vec3.fromValues(1, 1, 0.5),
		glm.vec3.fromValues(0, 0, 0),
		glm.vec3.fromValues(0, 1, 0)
	);
	glm.mat4.perspective(
		cubeModel.mp,
		Math.PI * 0.5,
		gl.drawingBufferWidth / gl.drawingBufferHeight,
		0.1,
		100.0
	);
}

function initProgram() {
	// shader
	programOrigin.id = createShader("vertex", "fragment");
	programOrigin.umvp = gl.getUniformLocation(programOrigin.id, "mvp");
	programOrigin.utex = gl.getUniformLocation(programOrigin.id, "tex");

	//window program
	programWindow.id = createShader("windowV", "windowF");
	programWindow.utex = gl.getUniformLocation(programWindow.id, "tex");
	gl.useProgram(programWindow.id);
	gl.uniform1i(programWindow.utex, 0);
}

function initFBO() {
	if (fbo.id) gl.deleteFramebuffer(fbo.id);
	if (fbo.tex) gl.deleteTexture(fbo.tex);
	if (fbo.rbo) gl.deleteRenderbuffer(fbo.rbo);

	// Create a frame buffer object (FBO)
	fbo.id = gl.createFramebuffer();
	if (!fbo.id) {
		console.log("Failed to create frame buffer object");
		return;
	}

	// Create a texture object and set its size and parameters
	fbo.tex = gl.createTexture(); // Create a texture object
	if (!fbo.tex) {
		console.log("Failed to create texture object");
		return;
	}
	gl.bindTexture(gl.TEXTURE_2D, fbo.tex); // Bind the object to target
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA,
		window.innerWidth,
		window.innerHeight,
		0,
		gl.RGBA,
		gl.UNSIGNED_BYTE,
		null
	);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

	// Create a renderbuffer object and Set its size and parameters
	fbo.rbo = gl.createRenderbuffer(); // Create a renderbuffer object
	if (!fbo.rbo) {
		console.log("Failed to create renderbuffer object");
		return;
	}
	gl.bindRenderbuffer(gl.RENDERBUFFER, fbo.rbo); // Bind the object to target
	gl.renderbufferStorage(
		gl.RENDERBUFFER,
		gl.DEPTH_COMPONENT16,
		window.innerWidth,
		window.innerHeight
	);

	// Attach the texture and the renderbuffer object to the FBO
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.id);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER,
		gl.COLOR_ATTACHMENT0,
		gl.TEXTURE_2D,
		fbo.tex,
		0
	);
	gl.framebufferRenderbuffer(
		gl.FRAMEBUFFER,
		gl.DEPTH_ATTACHMENT,
		gl.RENDERBUFFER,
		fbo.rbo
	);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
}

function genGbufferTex(fbo, target) {
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

	let tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texStorage2D(
		gl.TEXTURE_2D,
		1,
		gl.RGBA16F,
		gl.drawingBufferWidth,
		gl.drawingBufferHeight
	);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER,
		gl.COLOR_ATTACHMENT0 + target,
		gl.TEXTURE_2D,
		Gbuffer.posTex,
		0
	);

	return tex;
}

function initGbuffer() {
	// delete old

	if (Gbuffer.id) gl.deleteFramebuffer(Gbuffer.id);
	if (Gbuffer.posTex) gl.deleteTexture(Gbuffer.posTex);
	if (Gbuffer.UVtex) gl.deleteTexture(Gbuffer.UVtex);
	if (Gbuffer.eyeTex) gl.deleteTexture(Gbuffer.eyeTex);
	if (Gbuffer.TBNtex) gl.deleteTexture(Gbuffer.TBNtex);
	if (Gbuffer.lightTex) gl.deleteTexture(Gbuffer.lightTex);
	if (Gbuffer.normalTex) gl.deleteTexture(Gbuffer.normalTex);
	if (Gbuffer.depthTex) gl.deleteTexture(Gbuffer.depthTex);

	// FBO
	Gbuffer.id = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, Gbuffer.id);

	// color attachments
	gl.activeTexture(gl.TEXTURE0);

	Gbuffer.posTex = genGbufferTex(Gbuffer.id, 0);
	Gbuffer.UVTex = genGbufferTex(Gbuffer.id, 1);
	Gbuffer.eyeTex = genGbufferTex(Gbuffer.id, 2);
	Gbuffer.TBNTex = genGbufferTex(Gbuffer.id, 3);
	Gbuffer.lightTex = genGbufferTex(Gbuffer.id, 4);
	Gbuffer.normalTex = genGbufferTex(Gbuffer.id, 5);

	gl.drawBuffers([
		gl.COLOR_ATTACHMENT0,
		gl.COLOR_ATTACHMENT1,
		gl.COLOR_ATTACHMENT2,
		gl.COLOR_ATTACHMENT3,
		gl.COLOR_ATTACHMENT4,
		gl.COLOR_ATTACHMENT5
	]);

	// depth attachment
	Gbuffer.depthTex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, Gbuffer.depthTex);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texStorage2D(
		gl.TEXTURE_2D,
		1,
		gl.DEPTH_COMPONENT16,
		gl.drawingBufferWidth,
		gl.drawingBufferHeight
	);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER,
		gl.DEPTH_ATTACHMENT,
		gl.TEXTURE_2D,
		Gbuffer.depthTex,
		0
	);

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

async function initModels() {
	// windowModel

	winModel.vao = gl.createVertexArray();
	gl.bindVertexArray(winModel.vao);

	const screen_pos_texcoord = new Float32Array([
		1.0,
		-1.0,
		1.0,
		0.0,

		-1.0,
		-1.0,
		0.0,
		0.0,

		-1.0,
		1.0,
		0.0,
		1.0,

		1.0,
		1.0,
		1.0,
		1.0
	]);
	let vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, screen_pos_texcoord, gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * 4, 0);
	gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 4, 2 * 4);
	gl.enableVertexAttribArray(0);
	gl.enableVertexAttribArray(1);

	gl.bindVertexArray(null);

	// cubeModel

	cubeModel.vao = gl.createVertexArray();
	gl.bindVertexArray(cubeModel.vao);

	const positions = new Float32Array([
		// Front face
		-0.25,
		-0.25,
		0.25,
		0.25,
		-0.25,
		0.25,
		0.25,
		0.25,
		0.25,
		-0.25,
		0.25,
		0.25,

		// Back face
		-0.25,
		-0.25,
		-0.25,
		-0.25,
		0.25,
		-0.25,
		0.25,
		0.25,
		-0.25,
		0.25,
		-0.25,
		-0.25,

		// Top face
		-0.25,
		0.25,
		-0.25,
		-0.25,
		0.25,
		0.25,
		0.25,
		0.25,
		0.25,
		0.25,
		0.25,
		-0.25,

		// Bottom face
		-0.25,
		-0.25,
		-0.25,
		0.25,
		-0.25,
		-0.25,
		0.25,
		-0.25,
		0.25,
		-0.25,
		-0.25,
		0.25,

		// Right face
		0.25,
		-0.25,
		-0.25,
		0.25,
		0.25,
		-0.25,
		0.25,
		0.25,
		0.25,
		0.25,
		-0.25,
		0.25,

		// Left face
		-0.25,
		-0.25,
		-0.25,
		-0.25,
		-0.25,
		0.25,
		-0.25,
		0.25,
		0.25,
		-0.25,
		0.25,
		-0.25
	]);
	const texcoords = new Float32Array([
		// Front
		0.0,
		0.0,
		1.0,
		0.0,
		1.0,
		1.0,
		0.0,
		1.0,
		// Back
		0.0,
		0.0,
		1.0,
		0.0,
		1.0,
		1.0,
		0.0,
		1.0,
		// Top
		0.0,
		0.0,
		1.0,
		0.0,
		1.0,
		1.0,
		0.0,
		1.0,
		// Bottom
		0.0,
		0.0,
		1.0,
		0.0,
		1.0,
		1.0,
		0.0,
		1.0,
		// Right
		0.0,
		0.0,
		1.0,
		0.0,
		1.0,
		1.0,
		0.0,
		1.0,
		// Left
		0.0,
		0.0,
		1.0,
		0.0,
		1.0,
		1.0,
		0.0,
		1.0
	]);
	vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		positions.byteLength + texcoords.byteLength,
		gl.STATIC_DRAW
	);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
	gl.bufferSubData(gl.ARRAY_BUFFER, positions.byteLength, texcoords);
	gl.enableVertexAttribArray(0);
	gl.enableVertexAttribArray(1);
	gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
	gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, positions.byteLength);

	gl.bindAttribLocation(programOrigin.id, 0, "iPosition");
	gl.bindAttribLocation(programOrigin.id, 1, "iTexcoord");

	// cubeModel -- tex
	let promises = [];
	promises.push(loadImage("./asset/a.png"));
	let results = await Promise.all(promises);

	cubeModel.atex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, cubeModel.atex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, results[0]);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

// -------- END INIT ------- //

function animate(time) {
	if (!global.start) {
		global.start = time;
	}
	// in milliseconds
	let delta = time - global.start;
	global.start = time;

	glm.mat4.rotate(cubeModel.mm, cubeModel.mm, delta / 500.0, [0.25, 1.0, 0.5]);

	stats.update();

	render(delta, time);

	window.requestAnimationFrame(animate);
}

function render(delta, time) {
	// set uniform
	let mvp = glm.mat4.create();
	glm.mat4.multiply(mvp, cubeModel.mp, cubeModel.mv);
	glm.mat4.multiply(mvp, mvp, cubeModel.mm);

	// draw to fbo

	gl.useProgram(programOrigin.id);
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.id);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, cubeModel.atex);
	gl.uniform1i(programOrigin.utex, 0);
	gl.uniformMatrix4fv(programOrigin.umvp, false, mvp);

	gl.bindVertexArray(cubeModel.vao);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 24);

	// draw to screen

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.useProgram(programWindow.id);
	gl.bindTexture(gl.TEXTURE_2D, fbo.tex);
	gl.uniform1i(programWindow.utex, 0);

	gl.bindVertexArray(winModel.vao);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

window.onresize = () => {
	initFBO();
	let canvas = document.querySelector("canvas");

	if (gl && canvas) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		glm.mat4.perspective(
			cubeModel.mp,
			Math.PI * 0.5,
			gl.drawingBufferWidth / gl.drawingBufferHeight,
			0.1,
			100.0
		);
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	}
};

window.onload = () => {
	initWebGL();
	initVar();
	initProgram();
	initFBO();
	initGbuffer();
	initModels().then(() => {
		// rendering loop
		window.requestAnimationFrame(animate);
	});
};
