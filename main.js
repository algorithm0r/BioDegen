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
	destroy();

	// Load parameters or call a method to load them
	
    loadParameters();
	gameEngine.world.nextRun();
    // // Destroy and rebuild the world
    // if (gameEngine.world) {
    //     gameEngine.world.resetWorld(); // delegate to World class
    // }
	
    buildWorld();
	// gameEngine.world.nextRun();
}

function destroy() {
	gameEngine.entities = [];
	PARAMETERS.day = 0;
}

function buildWorld() {
	gameEngine.addEntity(new World(gameEngine));
	// this.humanGraph = new Graph(gameEngine, 1040, 20, this, "Population");
	// gameEngine.addEntity(this.humanGraph);
}


ASSET_MANAGER.downloadAll(() => {
	const canvas = document.getElementById("gameWorld");
	const ctx = canvas.getContext("2d");

	gameEngine.init(ctx);

	gameEngine.addEntity(new World(gameEngine))
	
	gameEngine.start();
});
