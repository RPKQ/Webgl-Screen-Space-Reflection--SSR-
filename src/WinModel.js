var gl = null;

export default class WinModel {
	constructor(Gl) {
		gl = Gl;
		this.vao = gl.createVertexArray();
		this._initModel();
	}

	draw() {
		gl.bindVertexArray(this.vao);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
	}

	_initModel() {
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

		gl.bindVertexArray(this.vao);

		let vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, screen_pos_texcoord, gl.STATIC_DRAW);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * 4, 0);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 4, 2 * 4);
		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);

		gl.bindVertexArray(null);
	}
}
