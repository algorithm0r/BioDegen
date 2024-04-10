class World {
    constructor(gameEngine) {
        this.world = [];
        
        // Graphs
        this.popGraph = [];
        this.geneGraph = [];
        this.socialGraph = [];
        this.learningGraph = [];
        this.geneTraits = [];
        // this.agentCounter = 0;

        for(let i = 0; i < PARAMETERS.worldDimension; i++) {
            this.world.push([]);
            for(let j = 0; j < PARAMETERS.worldDimension; j++) {
                this.world[i].push(new Village(this, i, j));
            }
        }
        this.day = 0;

        //added in the graphs here with the last graph being just all the of the information at once
        this.humanGraph = new Graph(gameEngine, 1020, 10, this, [this.popGraph], "Population");
        gameEngine.addEntity(this.humanGraph);

        // this.ticketsGraph = new Graph(gameEngine, 1040, 210, this, [this.geneGraph], "genes");
        // gameEngine.addEntity(this.ticketsGraph);

        // this.learnTGraph = new Graph(gameEngine, 1040, 250, this, [this.learningGraph], "Learning Tickets");
        // gameEngine.addEntity(this.learnTGraph);

        // this.socialTGraph = new Graph(gameEngine, 1040, 500, this, [this.socialGraph], "Social Tickets");
        // gameEngine.addEntity(this.socialTGraph);

        // this.geneTGraph = new Graph(gameEngine, 1040, 250, this, [this.geneTraits], "Gene Traits");
        // gameEngine.addEntity(this.geneTGraph);


        this.graph = new Graph(gameEngine, 1020, 210, this, [this.socialGraph, this.learningGraph, this.geneTraits], "Combined tickets");
        gameEngine.addEntity(this.graph);
    
    };

    updateData() {
        this.humanPop = 0;
        let totalLearningTAverage = 0;
        let totalSocialTAverage = 0;
        let totalAvgTraits = 0;
        let villageCount = 0;
    
        for (let i = 0; i < PARAMETERS.worldDimension; i++) {
            for (let j = 0; j < PARAMETERS.worldDimension; j++) {
                let villagePop = this.world[i][j].population.length;
                this.humanPop += villagePop;
                if (villagePop > 0) {
                    let learningT = 0, socialT = 0, geneTraits = 0;
                    for (let k = 0; k < villagePop; k++) {
                        let agent = this.world[i][j].population[k];
                        let genesLength = agent.genes.length;
                        if (genesLength >= 2) {
                            learningT += agent.genes[genesLength - 2];
                            socialT += agent.genes[genesLength - 1];
                            let sumOfFirstTenGenes = agent.genes.slice(0, 10).reduce((acc, curr) => acc + curr, 0);
                            geneTraits += sumOfFirstTenGenes/10; // Add this sum to geneTraits
                        }
                      
                    }
                    // Averages for this village
                    totalLearningTAverage += learningT / villagePop;
                    totalSocialTAverage += socialT / villagePop;
                    totalAvgTraits += geneTraits / villagePop;
                    villageCount++;
                }
            }
        }
    
        // Overall average across villages
        this.learningGraph.push(villageCount > 0 ? totalLearningTAverage / villageCount : 0);
        this.socialGraph.push(villageCount > 0 ? totalSocialTAverage / villageCount : 0);
        this.geneTraits.push(villageCount > 0 ? totalAvgTraits / villageCount : 0);
        this.popGraph.push(this.humanPop); // Total population
    };
    

    update() {
        document.getElementById("day").innerHTML = `Day: ${++this.day}`;
        for(let i = 0; i < PARAMETERS.worldDimension; i++) {
            for(let j = 0; j < PARAMETERS.worldDimension; j++) {
                this.world[i][j].update();
            }
        }
        if (this.day % PARAMETERS.reportingPeriod === 0) {
            this.updateData();
        }
    
    };



  
    draw(ctx){
        ctx.fillStyle = "#cc9966";
        ctx.fillRect(0,0,ctx.canvas.height,ctx.canvas.height);

        for(let i = 0; i < PARAMETERS.worldDimension; i++) {
            for(let j = 0; j < PARAMETERS.worldDimension; j++) {
                this.world[i][j].draw(ctx);
            }
        }

      
    };
};
