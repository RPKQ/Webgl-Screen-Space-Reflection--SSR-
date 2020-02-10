import * as glm from "gl-matrix";
import * as Stats from "stats-js";
import * as Dat from "dat.gui";
import * as Program from "./Program";
import * as Camera from "./Camera";
import * as WinModel from "./WinModel";
import * as ObjModel from "./ObjModel";
import { loadImage, _loadFile } from "./utils";

// global variable
var gl = window.WebGL2RenderingContext.prototype; // specify type for code snippet
var stats = null;
var gui = null;

var global = {
	start: null,
	canvas: null
};
// -- program -- //

var programObj = null;
var programCube = null;
var programWindow = null;
var programDefer1 = null;

var camera = null;

var model = null;

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

var rrtex = null;

// --------- INIT ----------- //

function initWebGL() {
	global.canvas = document.createElement("canvas");
	global.canvas.width = window.innerWidth;
	global.canvas.height = window.innerHeight;
	document.querySelector("body").appendChild(global.canvas);

	gl = global.canvas.getContext("webgl2");
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
	// nmFolder.add(flag, "use").onChange(val => {
	// 	gl.uniform1i(1, val);
	// });
	nmFolder.open();

	// control
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
		gl.drawingBufferHeight,
		window
	);

	// program
	programDefer1 = new Program.default(gl, "defer1V", "defer1F");
	programWindow = new Program.default(gl, "windowV", "windowF");
	programCube = new Program.default(gl, "vertex", "fragment");
	programObj = new Program.default(gl, "objV", "objF");

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
	// var scene = new THREE.Scene();
	// var loader = new THREE.AssimpJSONLoader();
	// //var group = new THREE.Object3D();

	// loader.load("./asset/assimp/spider.obj.assimp.json", function(model) {
	// 	console.log(model);

	// 	model.traverse(function(child) {
	// 		if (child instanceof THREE.Mesh) {
	// 			// child.material = new THREE.MeshLambertMaterial({color:0xaaaaaa});
	// 			console.log(child.geometry);
	// 		}
	// 	});

	// 	model.scale.set(0.1, 0.1, 0.1);

	// 	scene.add(model);
	// });

	// obj
	model = new ObjModel.default(gl, "./asset/ladybug.obj");
}

// -------- END INIT ------- //

function animate(time) {
	if (!global.start) {
		global.start = time;
	}
	// in milliseconds
	let delta = time - global.start;
	global.start = time;

	// glm.mat4.rotate(cubeModel.mm, cubeModel.mm, delta / 500.0, [0.25, 1.0, 0.5]);

	stats.update();

	render(delta, time);

	window.requestAnimationFrame(animate);
}

function render(delta, time) {
	// set uniform
	let mvp = glm.mat4.create();
	glm.mat4.multiply(mvp, camera.pMat, camera.vMat);
	glm.mat4.multiply(mvp, mvp, cubeModel.mm);

	// gl.useProgram(programCube.id);
	// gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.id);
	// gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// gl.activeTexture(gl.TEXTURE0);
	// gl.bindTexture(gl.TEXTURE_2D, cubeModel.atex);
	// gl.uniform1i(programCube.utex, 0);
	// gl.uniformMatrix4fv(programCube.umvp, false, mvp);

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

	// gl.useProgram(programObj.id);
	// programObj.setInt("useTex", 1);
	// programObj.setTex("tex", cubeModel.atex, 0);
	// programObj.setMat4("pvMat", camera.getPVMat());
	// programObj.setMat4("modelMat", cubeModel.mm);

	model.draw();
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
