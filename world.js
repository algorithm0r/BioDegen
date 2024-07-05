class World {
    constructor(gameEngine) {
        this.game = gameEngine;
        this.world = [];
        this.currentVillage = null;
       
        this.Trow = 0;
        this.Tcol = 0;
      
        // Graphs
        this.popGraph = [];
        this.geneGraph = [];
        this.socialGraph = [];
        this.learningGraph = [];
        this.geneTraits = [];

        //Village graphs
        // this.villageLearning = [];
        // this.villageSocial = [];
        // this.villageAverageGenes = [];

        // this.agentCounter = 0;

        for(let i = 0; i < PARAMETERS.worldDimension; i++) {
            this.world.push([]);
            for(let j = 0; j < PARAMETERS.worldDimension; j++) {
                this.world[i].push(new Village(this, i, j));
            }
        }
        

        //added in the graphs here with the last graph being just all the of the information at once
        this.humanGraph = new Graph(gameEngine, 1020, 10, this, [this.popGraph], "Population", ["population"]);
        gameEngine.addEntity(this.humanGraph);

        // this.ticketsGraph = new Graph(gameEngine, 1040, 210, this, [this.geneGraph], "genes");
        // gameEngine.addEntity(this.ticketsGraph);

        // this.learnTGraph = new Graph(gameEngine, 1040, 250, this, [this.learningGraph], "Learning Tickets");
        // gameEngine.addEntity(this.learnTGraph);

        // this.socialTGraph = new Graph(gameEngine, 1040, 500, this, [this.socialGraph], "Social Tickets");
        // gameEngine.addEntity(this.socialTGraph);

        // this.geneTGraph = new Graph(gameEngine, 1040, 250, this, [this.geneTraits], "Gene Traits");
        // gameEngine.addEntity(this.geneTGraph);


        this.graph = new Graph(gameEngine, 1020, 210, this, [this.socialGraph, this.learningGraph, this.geneTraits], "Combined tickets", ["social T", "learning T", "gene traits"]);
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
        
        // Current village graph data 
        // if (this.currentVillage != null) {
        //     let vLearning = 0;
        //     let vSocial = 0;
        //     let totalGeneTraits = 0;
        //     let populationSize = this.currentVillage.population.length;
        //     let genesLength = 0;

        //     if (populationSize === 0) {
        //         this.currentVillage = null;
        //         return;
        //     }

        //     for (let vPop = 0;  vPop< this.currentVillage.population.length; vPop++) {
        //         genesLength = this.currentVillage.population[vPop].genes.length;

        //         // change to averages
        //         vLearning += this.currentVillage.population[vPop].genes[genesLength - 2];   
        //         vSocial += this.currentVillage.population[vPop].genes[genesLength - 1];
                
                
        //         // Sum up all gene traits for each individual
        //         for (let i = 0; i < genesLength - 2; i++) {
        //             totalGeneTraits += this.currentVillage.population[vPop].genes[i];
        //         }    
        //     }

        //     let averageGeneTraits = totalGeneTraits / (populationSize * (genesLength - 2));
        //     let VLA = vLearning / populationSize;
        //     let VSA = vSocial / populationSize;

        //     this.villageLearning.push(VLA);
        //     this.villageSocial.push(VSA);
        //     this.villageAverageGenes.push(averageGeneTraits);
        //     this.updateGraph(this.currentVillage);
        // }
    
        // Overall average across villages
        this.learningGraph.push(villageCount > 0 ? totalLearningTAverage / villageCount : 0);
        this.socialGraph.push(villageCount > 0 ? totalSocialTAverage / villageCount : 0);
        this.geneTraits.push(villageCount > 0 ? totalAvgTraits / villageCount : 0);
        this.popGraph.push(this.humanPop); // Total population

        this.updateGraph();
    };
    

    update() {
        document.getElementById("day").innerHTML = `Day: ${++PARAMETERS.day}`;
        for(let i = 0; i < PARAMETERS.worldDimension; i++) {
            for(let j = 0; j < PARAMETERS.worldDimension; j++) {
                this.world[i][j].update();
            }
        }
        if (PARAMETERS.day % PARAMETERS.reportingPeriod === 0) {
            this.updateData();
        }
        
        if(this.game.click) {
            this.handleClickOnVillage(this.game.ctx);
            setTimeout(() => {
                this.game.click = false; // Reset the click state
            }, 10); 
        }
    
    };


    logData() {
        var data = {
            db: PARAMETERS.db,
            collection: PARAMETERS.collection,
            data: {
                run: "X1",
                params: PARAMETERS,
                // seedPop: this.seedPop,
                // humanPop: this.humanPop,
                // wildPop: this.wildPop,
                // domePop: this.domePop,
                // weightData: this.weightData,
                // rootData: this.rootData,
                // seedData: this.seedData,
                // energyData: this.energyData,
                // dispersalData: this.dispersalData,
                // weightDataWild: this.weightDataWild,
                // rootDataWild: this.rootDataWild,
                // seedDataWild: this.seedDataWild,
                // energyDataWild: this.energyDataWild,
                // dispersalDataWild: this.dispersalDataWild,
                // weightDataDomesticated: this.weightDataDomesticated,
                // rootDataDomesticated: this.rootsDataDomesticated,
                // seedDataDomesticated: this.seedDataDomesticated,
                // energyDataDomesticated: this.energyDataDomesticated,
                // dispersalDataDomesticated: this.dispersalDataDomesticated
            }
        };
    
        if (socket) socket.emit("insert", data);
    };
  

    handleClickOnVillage(ctx) {
        const cellWidth = ctx.canvas.height / PARAMETERS.worldDimension;
        const cellHeight = ctx.canvas.height / PARAMETERS.worldDimension;
        const clickX = this.game.clickCoords.x;
        const clickY = this.game.clickCoords.y;

        const col = Math.floor(clickX / cellWidth);
        const row = Math.floor(clickY / cellHeight);

        this.Tcol = col;
        this.Trow = row;    

        if (row >= 0 && row < PARAMETERS.worldDimension && col >= 0 && col < PARAMETERS.worldDimension) {
            const clickedVillage = this.world[col][row];
            console.log(`Village at ${col}, ${row} was clicked.`);      
            if (this.currentVillage !== clickedVillage) {
                this.currentVillage = clickedVillage;
                this.currentVillage.updateVillageData(); // Make sure this method updates the data and graph
            }
        }
    }


    updateGraph() {
        // Clear existing graph if any
        if (this.villageGraph) {
            const index = this.game.entities.indexOf(this.villageGraph);
            if (index > -1) {
                this.game.entities.splice(index, 1);
            }
        }

        // Assuming villageGraph is a method of the village
        if (this.currentVillage) {
            this.villageGraph = new Graph(this.game, 1020, 500, this.currentVillage,
                [this.currentVillage.villageLearning, this.currentVillage.villageSocial, this.currentVillage.villageAverageGenes],
                `Village (Col: ${this.Tcol}, Row: ${this.Trow})`, ["learning T", "social T", "gene traits"]);
            this.game.entities.push(this.villageGraph);
        }
    }

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
