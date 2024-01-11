function Automata(game) {
    this.game = game;
    this.game.board = this;
    this.x = 0;
    this.y = 0;

    this.run = 0;

    loadParameters();
    this.buildAutomata();
};

Automata.prototype.buildAutomata = function () {
    
    this.game.entities = [];
    this.game.addEntity(this);

    this.day = 0;
    //this.season = 0; // 0 = winter, 1 = spring, 2 = summer, 3 = autumn

    // this.shelter = { water: 0, seeds: [], plantSeeds: [] };

    // // agents
    // this.seeds = [];
    // this.humans = [];

    // // data gathering
    // this.weightData = [];
    // this.rootData = [];
    // this.seedData = [];
    // this.energyData = [];
    // this.dispersalData = [];
    // this.weightDataWild = [];
    // this.rootDataWild = [];
    // this.seedDataWild = [];
    // this.energyDataWild = [];
    // this.dispersalDataWild = [];
    // this.weightDataDomesticated = [];
    // this.rootsDataDomesticated = [];
    // this.seedDataDomesticated = [];
    // this.energyDataDomesticated = [];
    // this.dispersalDataDomesticated = [];

    // this.seedPop = [];
    // this.humanPop = [];
    // this.wildPop = [];
    // this.domePop = [];


    this.board = [];

    //probably need this later
    // this.createBoard();
};