const gameEngine = new GameEngine();

const ASSET_MANAGER = new AssetManager();


function reset() {
    // Load parameters or call a method to load them
    loadParameters();

    // Destroy and rebuild the world
    destroy();
    buildWorld();
}

function destroy() {
	gameEngine.entities = [];
}

function buildWorld() {
	gameEngine.addEntity(new World());
}


ASSET_MANAGER.downloadAll(() => {
	const canvas = document.getElementById("gameWorld");
	const ctx = canvas.getContext("2d");

	gameEngine.init(ctx);

	gameEngine.addEntity(new World())

	gameEngine.start();
	// reset();
});
