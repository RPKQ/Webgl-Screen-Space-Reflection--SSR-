import * as glm from "gl-matrix";
import { _loadFile } from "./utils";

var gl = null;
export default class ObjModel {
	constructor(Gl, url) {
		gl = Gl;
		this.vaos = [];
		this.name = [];
		this.indexCounts = [];
		this.usemtl = [];

		this.modelMat = glm.mat4.create();
		this.tex = null;

		this.loadModel(url);
	}

	async draw() {
		for (let i = 0; i < this.vaos.length; i++) {
			gl.bindVertexArray(this.vaos[i]);
			gl.drawElements(gl.TRIANGLES, this.indexCounts[i], gl.UNSIGNED_INT, 0);
			gl.bindVertexArray(null);
		}
	}

	async loadModel(url) {
		// read file
		let lines = await _loadFile(url);

		this.idx = [];
		this.v = [];
		this.vn = [];
		this.vt = [];

		let firstAccess = true;

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
			} else if (line[0] == "usemtl") {
				if (line[1] == "0") this.usemtl.push(null);
				else this.usemtl.push(line[1]);
			} else if (line[0] == "o") {
				if (!firstAccess) {
					this.indexCounts.push(this.idx.length);
					await this.buildModel();
					this.idx = [];
					this.v = [];
					this.vn = [];
					this.vt = [];
				}
				firstAccess = false;
				this.name.push(line[1]);
			}
		}

		await this.buildModel();
		this.indexCounts.push(this.idx.length);
		this.idx = [];
		this.v = [];
		this.vn = [];
		this.vt = [];
	}

	buildModel() {
		// vao
		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);
		this.vaos.push(vao);

		// vbo
		let positions = new Float32Array(this.v);
		let normals = new Float32Array(this.vn);
		let texcoords = new Float32Array(this.vt);

		let vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			positions.byteLength + normals.byteLength + texcoords.byteLength,
			gl.STATIC_DRAW
		);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
		gl.bufferSubData(gl.ARRAY_BUFFER, positions.byteLength, normals);
		gl.bufferSubData(
			gl.ARRAY_BUFFER,
			positions.byteLength + normals.byteLength,
			texcoords
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

		// ebo
		let indices = new Uint32Array(this.idx);
		let ebo = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

		gl.bindVertexArray(null);
		console.log(
			`Build a mesh with ${this.v.length} vertices, ${this.vn.length} normals, ` +
				`${this.vt.length} UV , ${this.idx.length} indices`
		);
	}
}
