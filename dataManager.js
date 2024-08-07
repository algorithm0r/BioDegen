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

    // logData() {
    //     let villageLearning = [];
    //     let villageSocial = [];
    //     let villageGeneTraits = [];
    
    //     // Aggregate data from each village
    //     for (let i = 0; i < this.world.length; i++) {
    //         for (let j = 0; j < this.world[i].length; j++) {
    //             let village = this.world[i][j];
    //             villageLearning.push(village.villageLearning);
    //             villageSocial.push(village.villageSocial);
    //             villageGeneTraits.push(village.villageAverageGenes);
    //         }
    //     }
    
    //     let data = {
    //         db: PARAMETERS.db,
    //         collection: PARAMETERS.collection,
    //         data: {
    //             run: "X1",
    //             params: PARAMETERS,
    //             population: this.popGraph,
    //             geneTickets: this.geneGraph,
    //             learningTickets: this.learningGraph,
    //             socialTickets: this.socialGraph,
    //             villageLearning: villageLearning,
    //             villageSocial: villageSocial,
    //             villageGeneTraits: villageGeneTraits
    //         }
    //     };
    
    //     // Send data to the server or database
    //     if (socket) socket.emit("insert", data);
    // }
    
}