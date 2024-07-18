class World {
    constructor(gameEngine) {
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
        // this.geneTraits = [];

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
        this.humanGraph = new Graph(gameEngine, 1020, 10, this, [this.data.popGraph], "Population", ["population"]);
        gameEngine.addEntity(this.humanGraph);


        this.graph = new Graph(gameEngine, 1020, 210, this, [this.data.socialGraph, this.data.learningGraph, this.data.geneTraits], "Combined tickets", ["social T", "learning T", "gene traits"]);
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
        this.data.learningGraph.push(villageCount > 0 ? totalLearningTAverage / villageCount : 0);
        this.data.socialGraph.push(villageCount > 0 ? totalSocialTAverage / villageCount : 0);
        this.data.geneGraph.push(villageCount > 0 ? totalAvgTraits / villageCount : 0);
        this.data.popGraph.push(this.humanPop); // Total population

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
        if(PARAMETERS.day % PARAMETERS.epoch === 0) {
            this.data.logData();
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
            this.currentVillage.updateVillageData(); // Update data for the new village
            this.updateGraph(); // Update the graph to reflect new data
            console.log(`Village at ${col}, ${row} was clicked.`);      
           
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
                [this.currentVillage.data.villageLearning, this.currentVillage.data.villageSocial, this.currentVillage.data.villageAverageGenes],
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
