const gameEngine = new GameEngine();

const ASSET_MANAGER = new AssetManager();


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
	
	// this.popGraph = new Graph(this.gameEngine, 810, 0, this, "Population");
	// gameEngine.addEntity(this.popGraph);

	gameEngine.start();
	
	// reset();
});
