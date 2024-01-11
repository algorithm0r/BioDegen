const gameEngine = new GameEngine();

const ASSET_MANAGER = new AssetManager();

function reset() {
	if (gameEngine.board) {
		gameEngine.board.reset();
	} else {
		gameEngine.entities = [];
		new Automata(gameEngine);
	}
};

ASSET_MANAGER.downloadAll(() => {
	const canvas = document.getElementById("gameWorld");
	const ctx = canvas.getContext("2d");

	gameEngine.init(ctx);

	gameEngine.addEntity(new World())

	gameEngine.start();
});
