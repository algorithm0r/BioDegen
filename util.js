function databaseConnected() {
    const dbDiv = document.getElementById("db");
    dbDiv.classList.remove("db-disconnected");
    dbDiv.classList.add("db-connected");
};

function databaseDisconnected() {
    const dbDiv = document.getElementById("db");
    dbDiv.classList.remove("db-connected");
    dbDiv.classList.add("db-disconnected");
};


/** Global Parameters Object */
const PARAMETERS = { 
    // environment parameters
    worldDimension: 10,
    maxEnvironmentalBonus: 5,
    randomEnvironmentalBonuses: false,

    // village parameters
    populationSoftCap: 30,

    // human parameters
    numTraits: 10,
    traitThreshold: 5,
    reproductionThresholdStep: 30,
    reproductionThresholdBase: 50,
    migrationRate: 0.2,
    mutationRate: 0.05,
    learningRate: 0.01,
    deathRate: 0.005,
    socialLearningRate: 0.1,
    migratePeriod: 10,
    
    //data gathering
    reportingPeriod: 100,
    day: 0,
    
    // database parameters
    db: "BioDegenDB",
    collection: "test",
    // run4(longer faulty tests), run3(faulty tests), run2, run1, X2, testAVG
    run: "run4",
    // increased epoch to 20,000 to allow for more data to be collected
    epoch: 20000
};

const wrap = coord => (coord + PARAMETERS.worldDimension) % PARAMETERS.worldDimension;
/**
 * @param {Number} n
 * @returns Random Integer Between 0 and n-1
 */
const randomInt = n => Math.floor(Math.random() * n);

/**
 * @param {Number} r Red Value
 * @param {Number} g Green Value
 * @param {Number} b Blue Value
 * @returns String that can be used as a rgb web color
 */
const rgb = (r, g, b) => `rgba(${r}, ${g}, ${b})`;

/**
 * @param {Number} r Red Value
 * @param {Number} g Green Value
 * @param {Number} b Blue Value
 * @param {Number} a Alpha Value
 * @returns String that can be used as a rgba web color
 */
const rgba = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${a})`;

/**
 * @param {Number} h Hue
 * @param {Number} s Saturation
 * @param {Number} l Lightness
 * @returns String that can be used as a hsl web color
 */
const hsl = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;

/** Creates an alias for requestAnimationFrame for backwards compatibility */
window.requestAnimFrame = (() => {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        /**
         * Compatibility for requesting animation frames in older browsers
         * @param {Function} callback Function
         * @param {DOM} element DOM ELEMENT
         */
        ((callback, element) => {
            window.setTimeout(callback, 1000 / 60);
        });
})();

/**
 * Returns distance from two points
 * @param {Number} p1, p2 Two objects with x and y coordinates
 * @returns Distance between the two points
 */
const getDistance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

function loadParameters() {
    // params.size = parseInt(document.getElementById("cell_size").value);
    // params.dimension = parseInt(document.getElementById("dimension").value);
    // params.riverWidth = parseInt(document.getElementById("river_width").value);
    // params.dry = 1 - parseInt(document.getElementById("bank_size").value);

    // params.randomSeeds = document.getElementById("random_seeds").checked;
    // params.germThreshold = parseInt(document.getElementById("germ_threshold").value);
    // params.fullGrown = parseInt(document.getElementById("full_growth").value);
    // params.seedDeathChance = parseFloat(document.getElementById("seed_death_chance").value);
    // params.growthPenalty = parseInt(document.getElementById("growth_penalty").value);

    PARAMETERS.populationSoftCap = parseFloat(document.getElementById("population_soft_cap").value);
    PARAMETERS.randomEnvironmentalBonuses = document.getElementById("randEnvBonus").checked;
    PARAMETERS.maxEnvironmentalBonus = parseFloat(document.getElementById("maxEnvBonus").value);
    PARAMETERS.numTraits = parseFloat(document.getElementById("numTraits").value);
    PARAMETERS.traitThreshold = parseFloat(document.getElementById("traitThreshold").value);
    PARAMETERS.reproductionThresholdStep = parseFloat(document.getElementById("ReproThresholdStep").value);
    PARAMETERS.reproductionThresholdBase = parseFloat(document.getElementById("ReproThresholdBase").value);
    PARAMETERS.migrationRate = parseFloat(document.getElementById("migrationRate").value);
    PARAMETERS.mutationRate = parseFloat(document.getElementById("mutationRate").value);
    PARAMETERS.learningRate = parseFloat(document.getElementById("learnRate").value);
    PARAMETERS.deathRate = parseFloat(document.getElementById("deathRate").value);
    PARAMETERS.socialLearningRate = parseFloat(document.getElementById("socialRate").value);

    // params.sharedPlantingSeeds = document.getElementById("sharedPlantingSeeds").checked;
    // params.plantSelectionChance = parseFloat(document.getElementById("plantSelectionChance").value);
    // params.plantSelectionStrength = parseFloat(document.getElementById("plantSelectionStrength").value);
    // params.humanAddRate = parseFloat(document.getElementById("human_add_rate").value);
    // params.seedsDiffMetabolism = document.getElementById("seeds_metabolism").checked;
    // params.metabolicThreshold = parseInt(document.getElementById("metabolic_threshold").value);
    // params.metabolicUnit = parseInt(document.getElementById("metabolic_unit").value);
    // params.skinSize = parseInt(document.getElementById("skin_size").value);
    // params.scoopSize = parseInt(document.getElementById("scoop_size").value);
    // params.basketSize = parseInt(document.getElementById("basket_size").value);
    // params.seedStrategy = document.getElementById("seed_selection").value;
    // params.plantStrategy = document.getElementById("plant_selection").value;

    console.log(PARAMETERS);
};