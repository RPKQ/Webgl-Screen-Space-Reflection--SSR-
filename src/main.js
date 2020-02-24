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
	canvas: null,
	winSize: null
};
// -- program -- //

var programWindow = null;
var programDefer1 = null;
var programReflect = null;

var camera = null;

var dragonModel = null;
var sponzaModel = null;
var sphereModel = null;
var quadModel = null;
var cubeModel = null;

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
	gl.viewport(0, 0, window.innerWidth, window.innerHeight);

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
		[0.5, 20, 18],
		[0, 15, 0],
		window.innerWidth,
		window.innerHeight,
		window
	);

	// program
	programDefer1 = new Program.default(gl, "defer1V", "defer1F");
	programWindow = new Program.default(gl, "windowV", "windowF");
	programReflect = new Program.default(gl, "reflectV", "reflectF");

	// winModel
	winModel = new WinModel.default(gl);

	// FBO
	gbuffer = new Gbuffer.default(gl, window.innerWidth, window.innerHeight);

	// others
	global.winSize = glm.vec2.clone([window.innerWidth, window.innerHeight]);
}

async function loadAssets() {
	// texs
	let promises = [];
	promises.push(loadImage("./asset/a.png"));
	let results = await Promise.all(promises);
	rrtex = genTexture(results[0]);

	// dragon
	dragonModel = new ObjModel.default(gl, "./asset/dragon.obj", programDefer1);
	dragonModel.loadModel();
	dragonModel.setSc_Pos([1.0, 1.0, 1.0], [0, 10, 0]);

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
	// sphereModel = new ObjModel.default(gl, "./asset/sphere.obj", programDefer1);
	// sphereModel.loadModel();
	// sphereModel.setSc_Pos([1, 1, 1], [0, -2, 0]);

	// //sphere
	// cubeModel = new ObjModel.default(gl, "./asset/cube.obj", programDefer1);
	// cubeModel.loadModel();
	// cubeModel.setSc_Pos([1, 1, 1], [0, 5, 0]);

	// quad
	quadModel = new ObjModel.default(gl, "./asset/quad.obj", programDefer1);
	quadModel.loadModel();
	quadModel.setSc_Pos([15, 15, 15], [0, 10, 0]);
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
	gl.bindFramebuffer(gl.FRAMEBUFFER, gbuffer.id);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.useProgram(programDefer1.id);
	programDefer1.setMat4("pMat", camera.pMat);
	programDefer1.setMat4("vMat", camera.vMat);
	programDefer1.setMat4("camTransMat", camera.camTransMat);

	// quad
	programDefer1.setFloat("reflect", 0.5);
	programDefer1.setMat4("mMat", quadModel.modelMat);
	quadModel.draw(flag.useTex);

	// Dragon
	programDefer1.setFloat("reflect", 0.0);
	programDefer1.setMat4("mMat", dragonModel.modelMat);
	dragonModel.draw(flag.useTex);

	// cube
	// programDefer1.setFloat("reflect", 1.0);
	// programDefer1.setMat4("mMat", cubeModel.modelMat);
	// cubeModel.draw(false);

	// // Sphere
	// programDefer1.setFloat("reflect", 1.0);
	// programDefer1.setMat4("mMat", sphereModel.modelMat);
	// sphereModel.draw(false);

	// sponza
	// programDefer1.setFloat("reflect", 0.0);
	// programDefer1.setMat4("mMat", sponzaModel.modelMat);
	// sponzaModel.draw(flag.useTex);

	// draw to screen
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.clearColor(1.0, 1.0, 1.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// gl.useProgram(programDefer2.id);
	// programDefer2.setTex("depthTex", gbuffer.depthTex, 1);
	// programDefer2.setTex("colorTex", gbuffer.colorTex, 2);
	// programDefer2.setTex("reflectTex", gbuffer.reflectTex, 3);
	// programDefer2.setTex("normalVTex", gbuffer.normalVTex, 4);
	// programDefer2.setTex("posVTex", gbuffer.posVTex, 5);
	// programDefer2.setMat4("pMat", camera.pMat);
	// programDefer2.setMat4("invpMat", camera.inv_pMat);
	// programDefer2.setMat4("invvMat", camera.inv_vMat);
	// programDefer2.setVec2("mousePos", camera.mousePos);
	// programDefer2.setVec2(
	// 	"winSize",
	// 	glm.vec2.clone([window.innerWidth, window.innerHeight])
	// );

	// winModel.draw();

	gl.useProgram(programReflect.id);
	programReflect.setTex("depthTex", gbuffer.depthTex, 1);
	programReflect.setTex("colorTex", gbuffer.colorTex, 2);
	programReflect.setTex("reflectTex", gbuffer.reflectTex, 3);
	programReflect.setTex("normalVTex", gbuffer.normalVTex, 4);
	programReflect.setTex("posVTex", gbuffer.posVTex, 5);
	programReflect.setMat4("pMat", camera.pMat);
	programReflect.setMat4("vMat", camera.vMat);
	programReflect.setMat4("invpMat", camera.inv_pMat);
	programReflect.setMat4("invvMat", camera.inv_vMat);

	let a = glm.vec2.clone([
		camera.mousePos[0] / global.winSize[0],
		(global.winSize[1] - camera.mousePos[1]) / global.winSize[1]
	]);
	// console.log(a);
	programReflect.setVec2("mousePos", a);
	programReflect.setVec3("camPos", camera.camPos);

	winModel.draw();
	// console.log(`mousePos: ${camera.mousePos}`);
	// console.log(`winSize: ${global.winSize}`);

	// gl.useProgram(programObj.id);
	// programObj.setMat4("pvMat", camera.getPVMat());

	// // dragonModel.setPos([5, 7, 5]);
	// programObj.setMat4("mMat", dragonModel.modelMat);
	// dragonModel.draw(flag.useTex);

	// gl.useProgram(programWindow.id);
	// programWindow.setTex("tex", gbuffer.posVTex, 6);
	// winModel.draw(flag.useTex);
}

window.onresize = () => {
	let canvas = document.querySelector("canvas");
	gbuffer.reshape(window.innerWidth, window.innerHeight);
	global.winSize = glm.vec2.clone([window.innerWidth, window.innerHeight]);

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
