class DataManager {
    constructor(world) {
        this.world = world;

            // world
        this.popGraph = [];
        this.geneGraph = [];
        this.learningGraph = [];
        this.socialGraph = [];
        this.geneTraits = [];
            
            // village
        this.villageLearning = [];
        this.villageSocial = [];
        this.villageAverageGenes = [];
    };



    logData() {
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