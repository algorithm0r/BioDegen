class DataManager {
    constructor(world) {
        this.world = world;

            // world
        this.popGraph = [];
        this.geneGraph = [];
        this.learningGraph = [];
        this.socialGraph = [];
        this.geneTraits = [];
            
            // village 2 dimensional
        this.villageLearning = [];
        this.villageSocial = [];
        this.villageAverageGenes = [];

        this.logVillageData();
    };


    logVillageData() {
        // resets the village data and pulls from the individual villages and initializes each village double forloop
        this.villageLearning = [];
        this.villageSocial = [];
        this.villageAverageGenes = [];

        for (let i = 0; i < this.world.worldDimension; i++) {
            this.villageLearning[i] = [];
            this.villageSocial[i] = [];
            this.villageAverageGenes[i] = [];
            for (let j = 0; j < this.world.worldDimension; j++) {
                this.villageLearning[i][j] = [];
                this.villageSocial[i][j] = [];
                this.villageAverageGenes[i][j] = [];
            }
        }
    }


    logData() {
            //  actually logs the village data
        for (let i = 0; i < this.world.worldDimension; i++) {
            for (let j = 0; j < this.world.worldDimension; j++) {
                let village = this.world.world[i][j];
                // Aggregate current data for each village
                this.villageLearning[i][j].push(...village.villageLearning);
                this.villageSocial[i][j].push(...village.villageSocial);
                this.villageAverageGenes[i][j].push(...village.villageAverageGenes);
            }
        }

        let data = {
            db: PARAMETERS.db,
            collection: PARAMETERS.collection,
            //maybe change this to query?
            data: {
                run: "X1",
                params: PARAMETERS,
                population: this.popGraph,
                geneTickets: this.geneGraph,
                learningTickets: this.learningGraph,
                socialTickets: this.socialGraph,
                
                villageLearning: this.villageLearning,
                villageSocial: this.villageSocial,
                villageGeneTraits: this.villageAverageGenes
            }
    
         }
    // Each list like popGraph, geneGraph, learningGraph, socialGraph should already be updated regularly in the world updates
         if (socket) socket.emit("insert", data);
    };

}