import * as glm from "gl-matrix";
var gl = null;

export default class Camera {
	constructor(Gl, camPos, center, winW, winH, window) {
		this.speed = 0.5;
		this.rotateSpeed = 0.001;

		gl = Gl;
		this.camPos = glm.vec3.clone(camPos);
		this.center = glm.vec3.clone(center);

		this.rotating = false;
		this.lastPos = [-1, -1];

		this.mousePos = glm.vec2.clone([-1, -1]);

		this.vMat = glm.mat4.create();
		this.pMat = glm.mat4.create();
		this.camTransMat = glm.mat4.create();
		this.inv_vMat = glm.mat4.create();
		this.inv_pMat = glm.mat4.create();
		glm.mat4.invert(this.inv_vMat, this.vMat);
		glm.mat4.invert(this.inv_pMat, this.pMat);

		new Promise(() =>
			glm.mat4.lookAt(this.vMat, this.camPos, this.center, [0, 1, 0])
		).then(() => glm.mat4.invert(this.inv_vMat, this.vMat));
		glm.mat4.translate(this.camTransMat, this.camTransMat, -this.camPos);
		this.reshape(winW, winH);

		// Camera Control
		var self = this;
		window.onkeypress = function keyPress(e) {
			let upDir = glm.vec3.clone([0, 1, 0]);
			let lookDir = glm.vec3.clone([
				self.center[0] - self.camPos[0],
				self.center[1] - self.camPos[1],
				self.center[2] - self.camPos[2]
			]);
			let leftDir = glm.vec3.create();
			glm.vec3.cross(leftDir, upDir, lookDir);
			glm.vec3.normalize(lookDir, lookDir);
			glm.vec3.normalize(leftDir, leftDir);
			glm.vec3.scale(lookDir, lookDir, self.speed);
			glm.vec3.scale(leftDir, leftDir, self.speed);

			let backDir = glm.vec3.clone([-lookDir[0], -lookDir[1], -lookDir[2]]);
			let rightDir = glm.vec3.clone([-leftDir[0], -leftDir[1], -leftDir[2]]);

			switch (e.key) {
				case "a":
					glm.vec3.add(self.camPos, self.camPos, leftDir);
					glm.vec3.add(self.center, self.center, leftDir);
					break;
				case "d":
					glm.vec3.add(self.camPos, self.camPos, rightDir);
					glm.vec3.add(self.center, self.center, rightDir);
					break;
				case "w":
					glm.vec3.add(self.camPos, self.camPos, lookDir);
					glm.vec3.add(self.center, self.center, lookDir);
					break;
				case "s":
					glm.vec3.add(self.camPos, self.camPos, backDir);
					glm.vec3.add(self.center, self.center, backDir);
					break;
				case "z":
					self.camPos[1] -= self.speed;
					self.center[1] -= self.speed;
					break;
				case "x":
					self.camPos[1] += self.speed;
					self.center[1] += self.speed;
					break;
				case "t":
					console.log(`camPos: ${self.camPos}`);
					// console.log(`center: ${self.center}`);
					break;
			}

			glm.mat4.lookAt(self.vMat, self.camPos, self.center, [0, 1, 0]);
			glm.mat4.invert(self.inv_vMat, self.vMat);
			glm.mat4.translate(this.camTransMat, glm.mat4.create(), -this.camPos);
		};

		window.onmousedown = function mouseDown(e) {
			self.rotating = true;
			self.lastPos = [e.x, e.y];
			self.mousePos = glm.vec2.clone([e.x, e.y]);
		};

		window.onmouseup = function mouseUp(e) {
			self.rotating = false;
		};

		window.onmousemove = function mouseMove(e) {
			if (!self.rotating) return;

			if (self.lastPos[0] == -1 && self.lastPos[1] == -1) {
				self.lastPos = [e.x, e.y];
				return;
			}

			// update lastMouse
			let move_x = e.x - self.lastPos[0];
			let move_y = e.y - self.lastPos[1];
			self.lastPos[0] = e.x;
			self.lastPos[1] = e.y;

			let lookDir = glm.vec3.clone([
				self.center[0] - self.camPos[0],
				self.center[1] - self.camPos[1],
				self.center[2] - self.camPos[2]
			]);
			let upDir = glm.vec3.clone([0, 1, 0]);
			let leftDir = glm.vec3.create();
			glm.vec3.cross(leftDir, upDir, lookDir);
			let rightDir = glm.vec3.clone([-leftDir[0], -leftDir[1], -leftDir[2]]);

			// get rotate matrix
			let mouseMoveInSpace = glm.vec3.create();
			glm.vec3.scale(rightDir, rightDir, move_x);
			glm.vec3.scale(upDir, upDir, move_y);
			glm.vec3.sub(mouseMoveInSpace, rightDir, upDir);
			if (glm.vec3.length(mouseMoveInSpace) == 0) return;

			let rotateAxis = glm.vec3.create();
			let rotateMat = glm.mat4.create();
			glm.vec3.cross(rotateAxis, mouseMoveInSpace, lookDir);
			glm.mat4.rotate(
				rotateMat,
				rotateMat,
				glm.vec3.length(mouseMoveInSpace) * self.rotateSpeed,
				rotateAxis
			);

			// update lookDir and upDir
			lookDir = glm.vec4.clone([lookDir[0], lookDir[1], lookDir[2], 0.0]);
			glm.vec4.transformMat4(lookDir, lookDir, rotateMat);
			glm.vec4.normalize(lookDir, lookDir);
			lookDir = glm.vec3.clone([lookDir[0], lookDir[1], lookDir[2]]);
			glm.vec3.add(self.center, self.camPos, lookDir);

			// update viewMatrix
			glm.mat4.lookAt(self.vMat, self.camPos, self.center, [0, 1, 0]);
			glm.mat4.invert(self.inv_vMat, self.vMat);
		};
	}

	setPos(camPos) {
		this.camPos = camPos;
		new Promise(() =>
			glm.mat4.lookAt(this.vMat, this.camPos, this.center, [0, 1, 0])
		).then(() => {
			glm.mat4.translate(this.camTransMat, glm.mat4.create(), -this.camPos);
			glm.mat4.invert(this.inv_vMat, this.vMat);
		});
	}

	setCenter(cen) {
		this.center = center;
		new Promise(() =>
			glm.mat4.lookAt(this.vMat, this.camPos, this.center, [0, 1, 0])
		).then(() => {
			glm.mat4.translate(this.camTransMat, glm.mat4.create(), -this.camPos);
			glm.mat4.invert(this.inv_vMat, this.vMat);
		});
	}

	getPVMat() {
		let a = glm.mat4.create();
		glm.mat4.mul(a, this.pMat, this.vMat);
		return a;
	}

	reshape(winW, winH) {
		glm.mat4.perspective(this.pMat, Math.PI * 0.5, winW / winH, 0.1, 1000.0);
	}
}
