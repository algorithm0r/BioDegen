function Automata(game) {
    this.game = game;
    this.game.board = this;
    this.x = 0;
    this.y = 0;

    this.run = 0;

    loadParameters();
    this.buildAutomata();
};