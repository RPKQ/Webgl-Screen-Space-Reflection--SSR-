import * as glm from "gl-matrix";
import { _loadFile } from "./utils";

var gl = null;
export default class ObjModel {
	constructor(Gl, url) {
		gl = Gl;
		this.vao = gl.createVertexArray();
		this.indexCount = 0;

		this.modelMat = glm.mat4.create();
		this.tex = null;

		this.v = [];
		this.idx = [];
		this.vn = [];
		this.vt = [];
		this.tn = [];

		this.loadModel(url);
	}

	draw() {
		gl.bindVertexArray(this.vao);
		gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
		gl.bindVertexArray(null);
	}

	async loadModel(url) {
		await this.parseData(url);
		// stats
		console.log(
			`Load ${url}: ${this.v.length} vertices, ${this.vt.length} texcoords, ${this.vn.length} normals ` +
				`${this.tn.length} tangents, ${this.idx.length / 3} faces`
		);
		this.indexCount = this.idx.length;
		this.buildModel(url);
	}

	async parseData(url) {
		// read file
		let lines = await _loadFile(url);

		// parse obj format
		for (let line of lines) {
			line = line.split(" ");
			// console.log(line);
			if (line[0] == "v") {
				this.v.push(parseFloat(line[1]));
				this.v.push(parseFloat(line[2]));
				this.v.push(parseFloat(line[3]));
			} else if (line[0] == "vn") {
				this.vn.push(parseFloat(line[1]));
				this.vn.push(parseFloat(line[2]));
				this.vn.push(parseFloat(line[3]));
			} else if (line[0] == "vt") {
				this.vt.push(parseFloat(line[1]));
				// flip vertically
				this.vt.push(1.0 - parseFloat(line[2]));
			} else if (line[0] == "f") {
				// start from zero
				this.idx.push(parseInt(line[1].split("/")[0]) - 1);
				this.idx.push(parseInt(line[2].split("/")[0]) - 1);
				this.idx.push(parseInt(line[3].split("/")[0]) - 1);
			}
		}

		// compute tangent
		for (let i = 0; i < this.idx.length; i += 3) {
			let idx1 = this.idx[i];
			let idx2 = this.idx[i + 1];
			let idx3 = this.idx[i + 2];

			let p1 = glm.vec3.fromValues(
				this.v[idx1 * 3 + 0],
				this.v[idx1 * 3 + 1],
				this.v[idx1 * 3 + 2]
			);
			let p2 = glm.vec3.fromValues(
				this.v[idx2 * 3 + 0],
				this.v[idx2 * 3 + 1],
				this.v[idx2 * 3 + 2]
			);
			let p3 = glm.vec3.fromValues(
				this.v[idx3 * 3 + 0],
				this.v[idx3 * 3 + 1],
				this.v[idx3 * 3 + 2]
			);

			let n1 = glm.vec3.fromValues(
				this.vn[idx1 * 3 + 0],
				this.vn[idx1 * 3 + 1],
				this.vn[idx1 * 3 + 2]
			);
			let n2 = glm.vec3.fromValues(
				this.vn[idx2 * 3 + 0],
				this.vn[idx2 * 3 + 1],
				this.vn[idx2 * 3 + 2]
			);
			let n3 = glm.vec3.fromValues(
				this.vn[idx3 * 3 + 0],
				this.vn[idx3 * 3 + 1],
				this.vn[idx3 * 3 + 2]
			);

			let uv1 = glm.vec2.fromValues(
				this.vt[idx1 * 2 + 0],
				this.vt[idx1 * 2 + 1]
			);
			let uv2 = glm.vec2.fromValues(
				this.vt[idx2 * 2 + 0],
				this.vt[idx2 * 2 + 1]
			);
			let uv3 = glm.vec2.fromValues(
				this.vt[idx3 * 2 + 0],
				this.vt[idx3 * 2 + 1]
			);

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

			this.tn[idx1 * 3 + 0] = t1[0];
			this.tn[idx1 * 3 + 1] = t1[1];
			this.tn[idx1 * 3 + 2] = t1[2];

			this.tn[idx2 * 3 + 0] = t2[0];
			this.tn[idx2 * 3 + 1] = t2[1];
			this.tn[idx2 * 3 + 2] = t2[2];

			this.tn[idx3 * 3 + 0] = t3[0];
			this.tn[idx3 * 3 + 1] = t3[1];
			this.tn[idx3 * 3 + 2] = t3[2];
		}
	}

	buildModel(url) {
		// vao
		gl.bindVertexArray(this.vao);

		// vbo
		let positions = new Float32Array(this.v);
		let normals = new Float32Array(this.vn);
		let texcoords = new Float32Array(this.vt);
		let tangents = new Float32Array(this.tn);

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
		let indices = new Uint32Array(this.idx);
		let ebo = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

		gl.bindVertexArray(null);
	}
}
