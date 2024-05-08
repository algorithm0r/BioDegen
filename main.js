const gameEngine = new GameEngine();

const ASSET_MANAGER = new AssetManager();

var socket = null;
if (window.io !== undefined) {
	console.log("Database connected!");

	socket = io.connect('http://73.225.31.4:8888');

	socket.on("connect", function () {
		databaseConnected();
	});
	
	socket.on("disconnect", function () {
		databaseDisconnected();
	});

	socket.addEventListener("log", console.log);
}


function reset() {
	destroy();
	// Load parameters or call a method to load them
    loadParameters();

    // Destroy and rebuild the world
   
    buildWorld();
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
