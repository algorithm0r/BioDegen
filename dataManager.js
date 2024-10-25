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
        // Parse through the data here for all villages
     // Iterate through each village to aggregate their data
        // Resetting village data arrays
        this.villageLearning = [];
        this.villageSocial = [];
        this.villageAverageGenes = [];

        // Aggregate data from each village
        for (let i = 0; i < this.world.world.length; i++) {
            for (let j = 0; j < this.world.world[i].length; j++) {
                let village = this.world.world[i][j];
                this.villageLearning.push([...village.villageLearning]);
                this.villageSocial.push([...village.villageSocial]);
                this.villageAverageGenes.push([...village.villageAverageGenes]);
            }
        }
        // =============================================
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
                // instead of it just pushing one list of these tickets for one village we want all the villages and for each of these lists to be 
                //  a list of lists for every village
                villageLearning: this.villageLearning.flat(),
                villageSocial: this.villageSocial.flat(),
                villageGeneTraits: this.villageAverageGenes.flat()
                
            }
    
         }
    // Each list like popGraph, geneGraph, learningGraph, socialGraph should already be updated regularly in the world updates
         if (socket) socket.emit("insert", data);
    };

}