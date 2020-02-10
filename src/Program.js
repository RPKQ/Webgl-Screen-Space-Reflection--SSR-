var gl = null;

export default class Program {
	constructor(Gl, vsID, fsID) {
		gl = Gl;
		this.id = gl.createProgram();
		this.compilShader(vsID, fsID);
	}

	setMat4(name, val) {
		let loc = gl.getUniformLocation(this.id, name);
		gl.uniformMatrix4fv(loc, false, val);
	}
	setVec2(name, val) {
		let loc = gl.getUniformLocation(this.id, name);
		gl.uniform2fv(loc, val);
	}
	setVec3(name, val) {
		let loc = gl.getUniformLocation(this.id, name);
		gl.uniform3fv(loc, val);
	}
	setInt(name, val) {
		let loc = gl.getUniformLocation(this.id, name);
		gl.uniform1i(loc, val);
	}
	setFloat(name, val) {
		let loc = gl.getUniformLocation(this.id, name);
		gl.uniform1f(loc, val);
	}
	setTex(name, texID, activeTex) {
		gl.activeTexture(gl.TEXTURE0 + activeTex);
		gl.bindTexture(gl.TEXTURE_2D, texID);
		let loc = gl.getUniformLocation(this.id, name);
		gl.uniform1i(loc, activeTex);
	}

	compilShader(vsID, fsID) {
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
		gl.attachShader(this.id, vs);
		gl.attachShader(this.id, fs);
		gl.linkProgram(this.id);

		if (!gl.getProgramParameter(this.id, gl.LINK_STATUS)) {
			console.error(gl.getProgramInfoLog(this.id));
		}
	}
}
