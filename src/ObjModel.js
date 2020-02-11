import * as glm from "gl-matrix";
import { _loadFile, loadImage } from "./utils";

var gl = null;
export default class ObjModel {
	constructor(Gl, url) {
		gl = Gl;
		this.vao = null;

		// global data
		this.v = [];
		this.vn = [];
		this.vt = [];
		this.mtl = [];
		this.idxs = [];
		this.idxs_t = [];
		this.idxs_n = [];

		// local data
		this.ebos = [];
		this.name = [];
		this.indexCounts = [];
		this.usemtl = [];

		this.modelMat = glm.mat4.create();

		this.loadModel(url);

		this.loadMaterial(url);
	}

	async draw() {
		gl.bindVertexArray(this.vao);
		for (let i = 0; i < this.ebos.length; i++) {
			let ebo = this.ebos[i];
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
			gl.bindTexture(gl.TEXTURE_2D, this.mtl[this.usemtl[i]]);
			await gl.drawElements(
				gl.TRIANGLES,
				this.indexCounts[i],
				gl.UNSIGNED_INT,
				0
			);
		}
		gl.bindVertexArray(null);
	}

	async loadMaterial(url) {
		// get mtl filename
		let mtlurl = url.slice(0, -3) + "mtl";
		let parentFolder = url.substring(0, url.lastIndexOf("/") + 1);
		console.log(parentFolder);

		let lines = await _loadFile(mtlurl);

		let name = null;
		for (let line of lines) {
			line = line.split(" ");
			if (line[0] == "newmtl") name = line[1];
			else if (line[0] == "map_Kd") {
				let image = await loadImage(parentFolder + line[1]);
				if (image) {
					console.log(`Load image ${parentFolder + line[1]}`);
					let tex = gl.createTexture();
					gl.bindTexture(gl.TEXTURE_2D, tex);
					gl.texImage2D(
						gl.TEXTURE_2D,
						0,
						gl.RGB,
						gl.RGB,
						gl.UNSIGNED_BYTE,
						image
					);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.GL_REPEAT);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.GL_REPEAT);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
					gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
					this.mtl[name] = tex;
				} else console.log(`Fail to load image ${parentFolder + line[1]}`);
			}
		}
	}

	async loadModel(url) {
		// read file
		let lines = await _loadFile(url);

		this.idx = [];

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
				this.idxs.push(parseInt(line[1].split("/")[0]) - 1);
				this.idxs.push(parseInt(line[2].split("/")[0]) - 1);
				this.idxs.push(parseInt(line[3].split("/")[0]) - 1);
				if (line[1].split("/")[1]) {
					this.idxs_t.push(parseInt(line[1].split("/")[1]) - 1);
					this.idxs_t.push(parseInt(line[2].split("/")[1]) - 1);
					this.idxs_t.push(parseInt(line[3].split("/")[1]) - 1);
				} else {
					this.idxs_t.push(parseInt(0));
					this.idxs_t.push(parseInt(0));
					this.idxs_t.push(parseInt(0));
				}
				this.idxs_n.push(parseInt(line[1].split("/")[2]) - 1);
				this.idxs_n.push(parseInt(line[2].split("/")[2]) - 1);
				this.idxs_n.push(parseInt(line[3].split("/")[2]) - 1);
			} else if (line[0] == "usemtl") {
				if (line[1] == "0") this.usemtl.push(null);
				else this.usemtl.push(line[1]);
			} else if (line[0] == "o") {
				if (!firstAccess) {
					await this.buildEbo();
					this.indexCounts.push(this.idx.length);
					this.idx = [];
				}
				firstAccess = false;
				this.name.push(line[1]);
			}
		}

		await this.buildEbo();
		this.indexCounts.push(this.idx.length);
		this.idx = [];

		this.buildModel();
	}

	buildEbo() {
		console.log(`Build a mesh with ${this.idx.length} vertices`);
		let indices = new Uint32Array(this.idx);
		let ebo = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
		this.ebos.push(ebo);
	}

	buildModel() {
		// --- convert the data with ebo --- //
		let vn_order = new Array(this.v.length);
		let vt_order = new Array((this.v.length / 3) * 2);

		for (let i = 0; i < this.idxs.length; i++) {
			let vid = this.idxs[i];
			if (vid > this.v.length) console.error(vid);
			let UVid = this.idxs_t[i];
			let nid = this.idxs_n[i];
			vt_order[vid * 2] = this.vt[UVid * 2];
			vt_order[vid * 2 + 1] = this.vt[UVid * 2 + 1];
			vn_order[vid * 3] = this.vn[nid * 3];
			vn_order[vid * 3 + 1] = this.vn[nid * 3 + 1];
			vn_order[vid * 3 + 2] = this.vn[nid * 3 + 2];
		}

		this.vt = [];
		this.vn = [];
		this.vt = vt_order;
		this.vn = vn_order;

		vt_order = [];
		vn_order = [];

		// vao
		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);

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

		gl.bindVertexArray(null);
	}
}
