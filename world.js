class World {
    constructor(gameEngine) {
        this.world = [];
        this.popGraph = [];
        // need to implement this properly in main or world constructor here
       
    
    

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
    };

    updateData() {
        // let humanPop = 0;
        for (let i = 0; i < PARAMETERS.worldDimension; i++) {
            for (let j = 0; j < PARAMETERS.worldDimension; j++) {
                let cell = this.world[i][j];
                // seedPop += cell.seeds.length;
                this.popGraph.push(cell.population.length);
                //change this to cell.population.length.
                // humanPop += cell.population.length;
            }
        }
    

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
