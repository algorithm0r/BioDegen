class World {
    constructor() {
        this.world = [];
        for(let i = 0; i < PARAMETERS.worldDimension; i++) {
            this.world.push([]);
            for(let j = 0; j < PARAMETERS.worldDimension; j++) {
                this.world[i].push(new Village(this, i, j));
            }
        }
        this.day = 0;
    };

    updateData() {
        // for(let i = 0; i < PARAMETERS.worldDimension; i++) {
        //     for(let j = 0; j < PARAMETERS.worldDimension; j++) {
        //        this.world[i].push(new Village(this, i, j));
        //        humanPop = this.world.Village.population;
        //     }
        // }
    }

    update() {
        document.getElementById("day").innerHTML = `Day: ${++this.day}`;
        for(let i = 0; i < PARAMETERS.worldDimension; i++) {
            for(let j = 0; j < PARAMETERS.worldDimension; j++) {
                this.world[i][j].update();
            }
        }
        // if (this.day % PARAMETERS.reportingPeriod === 0) {
        //     this.updateData();
        // }
    
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
