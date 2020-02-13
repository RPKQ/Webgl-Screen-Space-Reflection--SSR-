var gl = null;
export default class Gbuffer {
	constructor(Gl, winW, winH) {
		gl = Gl;

		this.id = null;
		this.colorTex = null;
		this.normalVTex = null;
		// this.reflectTex = null;
		this.depthTex = null;

		this.reshape(winW, winH);
	}

	reshape(winW, winH) {
		// delete old

		if (this.id) gl.deleteFramebuffer(this.id);
		if (this.colorTex) gl.deleteTexture(this.colorTex);
		if (this.normalVTex) gl.deleteTexture(this.normalVTex);
		if (this.reflectTex) gl.deleteTexture(this.reflectTex);
		if (this.depthTex) gl.deleteTexture(this.depthTex);

		// FBO
		this.id = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);

		// color attachments
		gl.activeTexture(gl.TEXTURE1);

		this.colorTex = this.genGbufferTex(0, winW, winH);
		this.normalVTex = this.genGbufferTex(1, winW, winH);
		this.reflectTex = this.genGbufferTex(2, winW, winH);

		gl.drawBuffers([
			gl.COLOR_ATTACHMENT0,
			gl.COLOR_ATTACHMENT1,
			gl.COLOR_ATTACHMENT2
		]);

		// depth attachment
		this.depthTex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.depthTex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT16, winW, winH);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.DEPTH_ATTACHMENT,
			gl.TEXTURE_2D,
			this.depthTex,
			0
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	genGbufferTex(target, winW, winH) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);

		let tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, winW, winH);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.COLOR_ATTACHMENT0 + target,
			gl.TEXTURE_2D,
			tex,
			0
		);

		return tex;
	}
}
