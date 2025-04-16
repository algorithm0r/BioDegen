class World {
    constructor(gameEngine) {
        gameEngine.world = this;
        this.game = gameEngine;
        this.world = [];
        this.currentVillage = null;
       
        this.Trow = 0;
        this.Tcol = 0;
      
        this.data = new DataManager(this);
        // Graphs
        // this.popGraph = [];
        // this.geneGraph = [];
        // this.socialGraph = [];
        // this.learningGraph = [];

        //Village graphs
        // this.villageLearning = [];
        // this.villageSocial = [];
        // this.villageAverageGenes = [];

        // this.agentCounter = 0;
        this.run = 0;

        for(let i = 0; i < PARAMETERS.worldDimension; i++) {
            this.world.push([]);
            for(let j = 0; j < PARAMETERS.worldDimension; j++) {
                this.world[i].push(new Village(this, i, j));
            }
        }
        

        //added in the graphs here with the last graph being just all the of the information at once
        this.humanGraph = new Graph(gameEngine, 1020, 10, this, [this.data.popGraph], "Population", ["population"]);
        gameEngine.addEntity(this.humanGraph);


        this.graph = new Graph(gameEngine, 1020, 210, this, [this.data.socialGraph, this.data.learningGraph, this.data.geneGraph], "Combined tickets", ["social T", "learning T", "gene traits"]);
        gameEngine.addEntity(this.graph);
        
        // testing
        // this.reset();
        // this.nextRun();
       
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
                 // village data testing
                this.world[i][j].updateVillageData();
            }
        }
    
        // Overall average across villages
        this.data.learningGraph.push(villageCount > 0 ? totalLearningTAverage / villageCount : 0);
        this.data.socialGraph.push(villageCount > 0 ? totalSocialTAverage / villageCount : 0);
        this.data.geneGraph.push(villageCount > 0 ? totalAvgTraits / villageCount : 0);
        this.data.popGraph.push(this.humanPop); // Total population


        // village data testing
        // for(let i = 0; i < PARAMETERS.worldDimension; i++) {
        //     for(let j = 0; j < PARAMETERS.worldDimension; j++) {
        //         this.world[i][j].updateVillageData();
        //     }
        // }

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
           
            // testing
            // for(let i = 0; i < PARAMETERS.worldDimension; i++) {
            //     for(let j = 0; j < PARAMETERS.worldDimension; j++) {
            //         this.world[i][j].updateVillageData();
            //     }
            // }
            // ===================================================
        }
        
        if(this.game.click) {
            this.handleClickOnVillage(this.game.ctx);
            setTimeout(() => {
                this.game.click = false; // Reset the click state
            }, 10); 
        }
        if(PARAMETERS.day % PARAMETERS.epoch === 0) {
            this.data.logData(this.currentVillage);
            reset();
            // this.data.clearData();
        }
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
            
            if (this.currentVillage) {
                this.currentVillage.isSelected = false; // Deselect the previous village
            }
            this.currentVillage = this.world[col][row];
            this.currentVillage.isSelected = true; // Select the new village
           
            
            // data manager update
            // this.data.logData(this.currentVillage);

            this.updateGraph(); // Update the graph to reflect new data
            console.log(`Village at ${col}, ${row} was clicked.`);      
           
        }
    }


    // =========================
    // experimental
    

    // nextRun() {
    //     this.runIndex = (this.runIndex + 1) % runs.length;
    //     Object.assign(PARAMETERS, runs[this.runIndex]);
    
    //     // Update the HTML input field
    //     const thresHoldStep = document.getElementById("ReproThresholdStep");
    //     if (thresHoldStep) {
    //         thresHoldStep.value = PARAMETERS.reproductionThresholdStep;
    //     }
    
    //     console.log(`Switched to run: ${PARAMETERS.run}`);
    // }
    
    nextRun() {
            const thresHoldStep = document.getElementById("ReproThresholdStep");
        
            // const popSoftCap = document.getElementById("population_soft_cap");
            // const envBonus = document.getElementById("maxEnvBonus");
            // const run = document.getElementById("run");
            // const traitNum = document.getElementById("numTraits");
            // const thresHoldbase = document.getElementById("ReproThresholdBase");
            // const indiv = document.getElementById("individualSeedSeparation");
            // const share = document.getElementById("sharedPlantingSeeds");
        
        
            // update params
            this.run = (this.run + 1) % runs.length;
            Object.assign(PARAMETERS, runs[this.run]);
        
            // update HTML
            // run.innerHTML = PARAMETERS.runName;
            thresHoldStep.value = PARAMETERS.reproductionThresholdStep;
            // popSoftCap.value = PARAMETERS.populationSoftCap;
            // envBonus.value = PARAMETERS.maxEnvironmentalBonus;
            // traitNum.value = PARAMETERS.numTraits;
            // thresHoldbase.value = PARAMETERS.reproductionThresholdBase;
            // indiv.checked = PARAMETERS.individualSeedSeparation;
            // share.checked = PARAMETERS.sharedPlantingSeeds;
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
