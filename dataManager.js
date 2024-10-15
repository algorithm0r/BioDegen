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

    };


    logData(village) {
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
                
                //  pulls directly from the current village we have clicked and gets the data from that village
                villageLearning: village.villageLearning,
                villageSocial: village.villageSocial,
                villageGeneTraits: village.villageAverageGenes
            }
    
         }
    // Each list like popGraph, geneGraph, learningGraph, socialGraph should already be updated regularly in the world updates
         if (socket) socket.emit("insert", data);
    };

}