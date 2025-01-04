/// <reference path="../node_modules/@types/p5/lib/addons/p5.sound.d.ts" />
/// <reference path="../node_modules/@types/p5/global.d.ts" />
/// <reference path="../node_modules/@types/p5/literals.d.ts" />
/// <reference path="../node_modules/@types/p5/constants.d.ts" />
/// <reference path="../node_modules/@types/p5/index.d.ts" />
// Keep these comments alive.
// They will help you while writing code.
let areas = [];
let video;
let vscale = 16;
let ws;

function setup() {
	ws = new WebSocket("ws://localhost:3000/ws");
	ws.onmessage = (event) => {
		console.log(event.data);
	};

	const canvas = createCanvas(640, 480);
	canvas.parent("sketch");
	pixelDensity(1);
	video = createCapture(VIDEO, () => {
		// Define areas based on the scaled video dimensions
		const videoWidth = video.width;
		const videoHeight = video.height;
		areas = [
			{ x: 0, y: 0, w: floor(videoWidth / 3), h: floor(videoHeight / 3) }, // Left third
			{
				x: floor(videoWidth / 3),
				y: 0,
				w: floor(videoWidth / 3),
				h: floor(videoHeight / 3),
			}, // Middle third
			{
				x: floor((2 * videoWidth) / 3),
				y: 0,
				w: floor(videoWidth / 3),
				h: floor(videoHeight / 3),
			}, // Right third
		];
		console.log(areas);
	});
	video.size(width / vscale, height / vscale);
	background("black");
	video.hide();
}

function draw() {
	image(video, 0, 0, width, height);
	filter(GRAY);
	filter(DILATE);
	filter(POSTERIZE, 2);
	let data = [];

	// Load the pixel data from the video
	video.loadPixels();
	if (video.pixels.length > 0) {
		// Analyze each area for movement
		for (let i = 0; i < areas.length; i++) {
			let area = areas[i];
			let movementDetected = false;

			for (let y = area.y; y < area.y + area.h; y++) {
				for (let x = area.x; x < area.x + area.w; x++) {
					let idx = (x + y * video.width) * 4;
					let r = video.pixels[idx];
					let g = video.pixels[idx + 1];
					let b = video.pixels[idx + 2];

					// Simple threshold for movement detection
					if (r > 200 || g > 200 || b > 200) {
						movementDetected = true;
						// break;
					}
				}
				if (movementDetected) break;
			}

			// Log 1 if movement is detected, otherwise log 0
			if (movementDetected) {
				// console.log(`Area ${i + 1}: ${movementDetected ? 1 : 0}`);
				data[i] = 1;
			} else {
				data[i] = 0;
			}
		}
		console.log(data);
		ws.send(JSON.stringify(data));
	} else {
		console.log("Video pixels not loaded.");
	}
}
