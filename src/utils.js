export function loadImage(url) {
	return new Promise((resolve, reject) => {
		let img = new Image();
		img.onload = () => {
			resolve(img);
		};
		img.onerror = () => {
			reject(new Error(`Failed to load image's url: ${url}`));
		};
		img.src = url;
		img.crossOrigin = "anonymous";
	});
}

export function _loadFile(url) {
	let fr = new FileReader();
	return new Promise((resolve, reject) => {
		let req = new XMLHttpRequest();
		req.open("GET", url, true);
		req.responseType = "blob";
		req.onload = () => {
			fr.readAsText(req.response);
			fr.onload = e => {
				let f = e.target.result;
				let ls = f.split(/\r?\n/);
				resolve(ls);
			};
		};
		req.onerror = () => {
			reject(new Error(`Failed to load file's url: ${url}`));
		};
		req.send();
	});
}
