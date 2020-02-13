import * as glm from "gl-matrix";
import * as Stats from "stats-js";
import * as Dat from "dat.gui";
import * as Program from "./Program";
import * as Camera from "./Camera";
import * as WinModel from "./WinModel";
import * as ObjModel from "./ObjModel";
import * as Gbuffer from "./Gbuffer";
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
var programWindow = null;
var programDefer1 = null;

var camera = null;

var dragonModel = null;
var sponzaModel = null;
var sphereModel = null;

var winModel = null;

// -- FBO -- //

var fbo = {
	id: null,
	tex: null,
	rbo: null
};
var gbuffer = null;

var flag = {
	useTex: false
};

var rrtex = null;

// --------- TOOL ----------- //

function genTexture(image) {
	let tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	return tex;
}

// --------- TOOL END ----------- //

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
	let nmFolder = gui.addFolder("toggles");
	nmFolder.add(flag, "useTex").onChange(val => {
		flag.useTex = val;
	});
	nmFolder.open();

	// control
}

function initVar() {
	// camera
	camera = new Camera.default(
		gl,
		[0, 2, -10],
		[0, 0, 0],
		gl.drawingBufferWidth,
		gl.drawingBufferHeight,
		window
	);

	// program
	programDefer1 = new Program.default(gl, "defer1V", "defer1F");
	programWindow = new Program.default(gl, "windowV", "windowF");
	programObj = new Program.default(gl, "objV", "objF");

	// winModel
	winModel = new WinModel.default(gl);

	// FBO
	gbuffer = new Gbuffer.default(gl, window.innerWidth, window.innerHeight);
}

async function loadAssets() {
	// texs
	// let promises = [];
	// promises.push(loadImage("./asset/ladybug_co.png"));
	// let results = await Promise.all(promises);

	// dragon
	dragonModel = new ObjModel.default(gl, "./asset/dragon.obj", programDefer1);
	dragonModel.loadModel();

	// sponza
	// sponzaModel = new ObjModel.default(
	// 	gl,
	// 	"./asset/crytek/sponza.obj",
	// 	programDefer1
	// );
	// new Promise((resolve, reject) => {
	// 	resolve(sponzaModel.loadModel());
	// }).then(() => {
	// 	sponzaModel.loadMaterial();
	// });

	//sphere
	sphereModel = new ObjModel.default(gl, "./asset/sphere.obj", programObj);
	sphereModel.loadModel();
}

// -------- END INIT ------- //

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

function render(delta, time) {
	// draw to fbo
	gl.useProgram(programDefer1.id);
	gl.bindFramebuffer(gl.FRAMEBUFFER, gbuffer.id);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	programDefer1.setMat4("pvMat", camera.getPVMat());
	programDefer1.setMat4("vMat", camera.vMat);

	// // Dragon
	programDefer1.setMat4("mMat", dragonModel.modelMat);
	programDefer1.setFloat("reflect", 0.0);
	dragonModel.draw(flag.useTex);

	// Sphere
	programDefer1.setFloat("reflect", 1.0);
	sphereModel.setPos([10, 7, 10]);
	programDefer1.setMat4("mMat", sphereModel.modelMat);
	sphereModel.draw(false);

	// // draw to screen
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.useProgram(programWindow.id);
	programWindow.setTex("tex", gbuffer.reflectTex, 1);

	winModel.draw();

	// gl.useProgram(programObj.id);
	// programObj.setMat4("pvMat", camera.getPVMat());

	// sphereModel.setPos([5, 7, 5]);
	// programObj.setMat4("mMat", sphereModel.modelMat);
	// sphereModel.draw(false);

	// sphereModel.setPos([-0.5, 0, 0]);
	// programObj.setMat4("mMat", sphereModel.modelMat);
	// sphereModel.draw(false);

	// sphereModel.setPos([0, -5, 2.5]);
	// programObj.setMat4("mMat", sphereModel.modelMat);
	// sphereModel.draw(false);

	// sphereModel.setPos([-5, 2.5, 0]);
	// programObj.setMat4("mMat", sphereModel.modelMat);
	// sphereModel.draw(false);

	// sponzaModel.draw(flag.useTex);
	// dragonModel.draw(flag.useTex);
}

window.onresize = () => {
	let canvas = document.querySelector("canvas");
	gbuffer.reshape(window.innerWidth, window.innerHeight);

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
	loadAssets().then(() => {
		// rendering loop
		window.requestAnimationFrame(animate);
	});
};
