//@ts-check
import { SerialPort } from "serialport";
import { parseArgs } from "node:util";
import fastify from "fastify";
import fastifySensible from "@fastify/sensible";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import path from "path";

let serialPort = null;
const app = fastify();
app.register(fastifySensible);
app.register(fastifyWebsocket);
app.register(async function (fastify) {
	fastify.get(
		"/ws",
		{ websocket: true },
		(socket /* WebSocket */, req /* FastifyRequest */) => {
			socket.on("message", (message) => {
				const data = JSON.parse(Buffer.from(message).toString());
				// Convert to simple buffer of 3 bytes
				const buffer = Buffer.from(data);
				serialPort.write(buffer);
				console.log("Sending bytes:", [...buffer]); // debug
				socket.send("hi from server");
			});
		}
	);
});

app.register(fastifyStatic, {
	root: path.resolve(process.cwd(), "./client"),
});

app.get("/", (req, res) => {
	res.sendFile("index.html");
});

async function listPorts() {
	const ports = await SerialPort.list();
	console.log("Available ports:");
	console.log(ports.map((p) => p.path).join("\n"));
}

async function main() {
	try {
		const { values } = parseArgs({
			options: {
				noSerial: {
					type: "boolean",
					short: "n",
					default: false,
					required: false,
				},
				port: {
					type: "string",
					short: "p",
					required: true,
				},
			},
			allowPositionals: false,
		});
		// Destructure with default to make TypeScript happy
		const { port } = values;

		if (!port) {
			console.error("Usage: node server.js --port <port>");
			await listPorts();
			process.exit(1);
		}

		const ports = await SerialPort.list();
		const p = ports.find((p) => p.path === port);
		if (!p) {
			console.error(`Port ${port} not found`);
			await listPorts();
			process.exit(1);
		}

		serialPort = new SerialPort({
			path: p.path,
			baudRate: 9600,
		});

		serialPort.on("data", (data) => {
			console.log("Received data:", data.toString());
		});

		console.log("found port", port);
		// on ctrl+c, close the serial port
		process.on("SIGINT", () => {
			serialPort.close();
			process.exit(0);
		});

		// process.on("SIGTERM", () => {
		// 	serialPort.close();
		// 	process.exit(0);
		// });

		// server

		app.listen({ port: 3000 }, (err) => {
			if (err) {
				console.error(err);
				app.log.error(err);
				process.exit(1);
			}
		});
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
}

main().catch(console.error);
