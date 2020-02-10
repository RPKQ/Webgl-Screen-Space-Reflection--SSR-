import * as glm from "gl-matrix";
import * as Stats from "stats-js";
import * as Dat from "dat.gui";
import * as Program from "./Program";
import * as Camera from "./Camera";
import * as WinModel from "./WinModel";

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

var programOrigin = null;
var programWindow = null;
var programDefer1 = null;
var camera = null;

// -- Model -- //

var winModel = null;

var cubeModel = {
	vao: null,
	atex: null,
	mm: null
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
	colorTex: null,
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

	if (!gl.getExtension("EXT_color_buffer_float")) {
		console.error("FLOAT color buffer not available");
		document.body.innerHTML =
			"This example requires EXT_color_buffer_float which is unavailable on this system.";
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

	// camera
	camera = new Camera.default(
		gl,
		[1, 1, 0.5],
		[0, 0, 0],
		gl.drawingBufferWidth,
		gl.drawingBufferHeight
	);

	// program
	programDefer1 = new Program.default(gl, "defer1V", "defer1F");
	programWindow = new Program.default(gl, "windowV", "windowF");
	programOrigin = new Program.default(gl, "vertex", "fragment");

	// winModel
	winModel = new WinModel.default(gl);
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
		tex,
		0
	);

	return tex;
}

function initGbuffer() {
	// delete old

	if (Gbuffer.id) gl.deleteFramebuffer(Gbuffer.id);
	if (Gbuffer.posTex) gl.deleteTexture(Gbuffer.posTex);
	if (Gbuffer.colorTex) gl.deleteTexture(Gbuffer.colorTex);

	// FBO
	Gbuffer.id = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, Gbuffer.id);

	// color attachments
	gl.activeTexture(gl.TEXTURE0);

	Gbuffer.posTex = genGbufferTex(Gbuffer.id, 0);
	Gbuffer.colorTex = genGbufferTex(Gbuffer.id, 1);

	gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

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
	let vbo = gl.createBuffer();
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

	// ASSIMP
	var scene = new THREE.Scene();
	var loader = new THREE.AssimpJSONLoader();
	//var group = new THREE.Object3D();

	loader.load("./asset/assimp/spider.obj.assimp.json", function(model) {
		console.log(model);

		model.traverse(function(child) {
			if (child instanceof THREE.Mesh) {
				// child.material = new THREE.MeshLambertMaterial({color:0xaaaaaa});
				console.log(child.geometry);
			}
		});

		model.scale.set(0.1, 0.1, 0.1);

		scene.add(model);
	});
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
	glm.mat4.multiply(mvp, camera.pMat, camera.vMat);
	glm.mat4.multiply(mvp, mvp, cubeModel.mm);

	// gl.useProgram(programOrigin.id);
	// gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.id);
	// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// gl.activeTexture(gl.TEXTURE0);
	// gl.bindTexture(gl.TEXTURE_2D, cubeModel.atex);
	// gl.uniform1i(programOrigin.utex, 0);
	// gl.uniformMatrix4fv(programOrigin.umvp, false, mvp);

	// gl.bindVertexArray(cubeModel.vao);
	// gl.drawArrays(gl.TRIANGLE_FAN, 0, 24);

	// draw to fbo
	gl.useProgram(programDefer1.id);
	gl.bindFramebuffer(gl.FRAMEBUFFER, Gbuffer.id);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	programDefer1.setMat4("mvp", mvp);
	programDefer1.setMat4("m", cubeModel.mm);
	programDefer1.setTex("tex", cubeModel.atex, 0);

	gl.bindVertexArray(cubeModel.vao);
	gl.drawArrays(gl.TRIANGLE_FAN, 0, 24);

	// draw to screen

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.useProgram(programWindow.id);
	programWindow.setTex("tex", Gbuffer.colorTex, 0);

	winModel.draw();
}

window.onresize = () => {
	initFBO();
	let canvas = document.querySelector("canvas");

	if (gl && canvas) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		camera.reshape(window.innerWidth, window.innerHeight);
		gl.viewport(0, 0, window.innerWidth, window.innerHeight);
	}
};

window.onload = () => {
	initWebGL();
	initVar();
	initFBO();
	initGbuffer();
	initModels().then(() => {
		// rendering loop
		window.requestAnimationFrame(animate);
	});
};
