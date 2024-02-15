class World {
    constructor(gameEngine) {
        this.world = [];
        
        // Graphs
        this.popGraph = [];
        this.geneGraph = [];
        this.socialGraph = [];
        this.learningGraph = [];
        this.geneAverageTest = [];
        // this.agentCounter = 0;

        for(let i = 0; i < PARAMETERS.worldDimension; i++) {
            this.world.push([]);
            for(let j = 0; j < PARAMETERS.worldDimension; j++) {
                this.world[i].push(new Village(this, i, j));
            }
        }
        this.day = 0;

        //added in the graph for population here
        this.humanGraph = new Graph(gameEngine, 1040, 20, this, "Population");
        gameEngine.addEntity(this.humanGraph);

        // tickets graph
        this.ticketsGraph = new Graph(gameEngine, 1040, 200, this, "Gene");
        gameEngine.addEntity(this.ticketsGraph);

        this.learnTGraph = new Graph(gameEngine, 1040, 400, this, "Learn ticket");
        gameEngine.addEntity(this.learnTGraph);

        this.socialTGraph = new Graph(gameEngine, 1040, 600, this, "social ticket");
        gameEngine.addEntity(this.socialTGraph);
    };

    updateData() {
        this.humanPop = 0;
        this.geneTickets = 0;
        this.learningT = 0;
        this.socialT = 0;
        this.traits = 0;
    
        // this.agentCounter = 0;
       
        // this.learningTAverage = 1;
        // this.socialTAverage = 1;

       
        for (let i = 0; i < PARAMETERS.worldDimension; i++) {
            for (let j = 0; j < PARAMETERS.worldDimension; j++) {
                this.humanPop += this.world[i][j].population.length;
                
               // add in other loop here for genes for the index of n - 2 and n-1 for social and learning tickets
               // for each agent average the tickets
               // seperate tickets into indvidual variables -2 is learning and -1 is social
               // group up the original n (which are 10 right now) and average them
               // keep this geneTickets but then average the tickets through the amount of agents

                for (let k = 0; k < this.world[i][j].population.length; k++) {
                    let agent = this.world[i][j].population[k];
                    let genesLength = agent.genes.length;
                    // this.agentCounter++;
                    if (genesLength >= 2) {
                        this.learningT += agent.genes[genesLength - 1];
                        this.socialT += agent.genes[genesLength - 2];
                       
                       
                        // this.learningT += agent.genes[genesLength - 1] / this.agentC;
                        // this.socialT += agent.genes[genesLength - 2] / this.agentC;
                        // this.traits += agent.genes
                        this.geneTickets += agent.genes[genesLength - 2] + agent.genes[genesLength - 1];

                        // this.learningTAverage += this.learningT / this.agentC;
                        // this.socialTAverage += this.socialT / this.agentC;
                        
                    }
                  
                }
           
            }
            
        }
        // this.learningT /= this.agentC;
        // this.socialT /= this.agentC;

  
        this.popGraph.push(this.humanPop);
        this.geneGraph.push(this.geneTickets);

        this.learningGraph.push(this.learningT);
        this.socialGraph.push(this.socialT);

        // this.learningGraph.push(this.learningTAverage);
        // this.socialGraph.push(this.socialTAverage);
  
    };

    getData() {
        return [
            {name: 'popGraph', data: this.popGraph},
            {name: 'geneGraph', data: this.geneGraph},
            {name: 'learningGraph', data: this.learningGraph},
            {name: 'socialGraph', data: this.socialGraph}
        ];
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
