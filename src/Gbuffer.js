var gl = null;
export default class Gbuffer {
	constructor(Gl) {
		gl = Gl;

		this.id = null;
		this.posTex = null;
		this.colorTex = null;
		this.depthTex = null;

		this.reshape();
	}

	reshape() {
		// delete old

		if (this.id) gl.deleteFramebuffer(this.id);
		if (this.posTex) gl.deleteTexture(this.posTex);
		if (this.colorTex) gl.deleteTexture(this.colorTex);

		// FBO
		this.id = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);

		// color attachments
		gl.activeTexture(gl.TEXTURE0);

		this.posTex = this.genGbufferTex(0);
		this.colorTex = this.genGbufferTex(1);

		gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

		// depth attachment
		this.depthTex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.depthTex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texStorage2D(
			gl.TEXTURE_2D,
			1,
			gl.DEPTH_COMPONENT16,
			gl.drawingBufferWidth,
			gl.drawingBufferHeight
		);
		gl.framebufferTexture2D(
			gl.FRAMEBUFFER,
			gl.DEPTH_ATTACHMENT,
			gl.TEXTURE_2D,
			this.depthTex,
			0
		);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}

	genGbufferTex(target) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.id);

		let tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texStorage2D(
			gl.TEXTURE_2D,
			1,
			gl.RGBA16F,
			gl.drawingBufferWidth,
			gl.drawingBufferHeight
		);
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
