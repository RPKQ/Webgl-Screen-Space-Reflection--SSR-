import * as glm from "gl-matrix";
var gl = null;

export default class Camera {
	constructor(Gl, pos, center, winW, winH) {
		gl = Gl;
		this.pos = pos;
		this.center = center;

		this.vMat = glm.mat4.create();
		this.pMat = glm.mat4.create();

		glm.mat4.lookAt(this.vMat, this.pos, this.center, [0, 1, 0]);
		this.reshape(winW, winH);
	}

	setPos(pos) {
		this.pos = pos;
		glm.mat4.lookAt(this.vMat, this.pos, this.center, [0, 1, 0]);
	}

	setCenter(cen) {
		this.center = center;
		glm.mat4.lookAt(this.vMat, this.pos, this.center, [0, 1, 0]);
	}

	getPVMat() {
		let a = glm.mat4.create();
		glm.mat4.mul(a, this.vMat, this.pMat);
		return a;
	}

	reshape(winW, winH) {
		glm.mat4.perspective(this.pMat, Math.PI * 0.5, winW / winH, 0.1, 100.0);
	}
}
