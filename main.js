const gameEngine = new GameEngine();

const ASSET_MANAGER = new AssetManager();

var socket = null;
if (window.io !== undefined) {
	console.log("Database connected!");

	socket = io.connect('https://73.19.38.112:8888');

	socket.on("connect", function () {
		databaseConnected();
	});
	
	socket.on("disconnect", function () {
		databaseDisconnected();
	});

	socket.addEventListener("error", console.log);
	socket.addEventListener("log", console.log);
}


function reset() {

	// testing 
	if (gameEngine.World) {
		gameEngine.World.reset();
	} else {
		gameEngine.entities = [];
		new World();
	}

	// ==================================================================

	// Old way
	// destroy();

	// // Load parameters or call a method to load them
	
    // loadParameters();
	
    // buildWorld();
	// gameEngine.World.nextRun();

}

function destroy() {
	gameEngine.entities = [];
	PARAMETERS.day = 0;
}

function buildWorld() {
	gameEngine.addEntity(new World(gameEngine));
}


ASSET_MANAGER.downloadAll(() => {
	const canvas = document.getElementById("gameWorld");
	const ctx = canvas.getContext("2d");

	gameEngine.init(ctx);

	gameEngine.addEntity(new World(gameEngine))
	
	reset();
	gameEngine.start();
});
