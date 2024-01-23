class Village {
    constructor(world, x, y) {
        Object.assign(this, {world, x, y});

        this.environmentalBonuses = [];
        for(let i = 0; i < PARAMETERS.numTraits; i++) {
            if(PARAMETERS.randomEnvironmentalBonuses) this.environmentalBonuses.push(randomInt(PARAMETERS.maxEnvironmentalBonus + 1));
            else {
                this.environmentalBonuses.push(0);
                while(Math.random() < 0.5) this.environmentalBonuses[i]++;
            }
        }
        this.totalBonus = this.environmentalBonuses.reduce((accumulator, currentValue) => accumulator + currentValue, 0);

        this.population = [];
        this.penalty = 0;

        this.addHuman(new Human(this));
    };

    averageGenes() {
        return this.population[0]?.genes.map((_, geneIndex) => {
            const sum = this.population.reduce((accumulator, human) => accumulator + human.genes[geneIndex], 0);
            return sum / this.population.length;
        });
    };

    averageMemes() {
        return this.population[0]?.memes.map((_, geneIndex) => {
            const sum = this.population.reduce((accumulator, human) => accumulator + human.memes[geneIndex], 0);
            return sum / this.population.length;
        });
    };

    addHuman(human) {
        this.population.push(human);
    };

    migrate() {
        if(Math.random() < PARAMETERS.migrationRate) {
            let newX = this.x;
            let newY = this.y;
            while(newX === this.x && newY === this.y) {
                newX = this.x + randomInt(2) - 1;
                newY = this.y + randomInt(2) - 1;
            }
            return this.world.world[wrap(newX)][wrap(newY)];
        }
        return this;
    };

    update() {
        this.penalty = this.population.length/PARAMETERS.populationSoftCap;

        this.population.map(human => human.update());

        this.population = this.population.filter(human => Math.random() > PARAMETERS.deathRate && human.energy >= 0);

        this.geneAverages = this.averageGenes();
        this.memeAverages = this.averageMemes();
    };

    draw(ctx) {
        const canvasWidth = ctx.canvas.height;
        const canvasHeight = ctx.canvas.height;

        const cellWidth = canvasWidth/PARAMETERS.worldDimension;
        const cellHeight = canvasHeight/PARAMETERS.worldDimension;

        const traitWidth = cellWidth/PARAMETERS.numTraits;

        const x = this.x*cellWidth;
        const y = this.y*cellWidth;

        // draw transparent green squares for each village representing the total bonus
        ctx.fillStyle = "green";
        ctx.strokeStyle = "black";

        ctx.globalAlpha = this.totalBonus/(PARAMETERS.numTraits*PARAMETERS.maxEnvironmentalBonus);
        ctx.fillRect(x, y, cellWidth, cellHeight);
        ctx.globalAlpha = 1;
        ctx.strokeRect(x, y, cellWidth, cellHeight);
       

        // draws a human at a random point in the village
        function getRandomPoint() {
            const centerX = cellWidth/2; // X-coordinate of the center point
            const centerY = cellHeight/2; // Y-coordinate of the center point
          
            // Generate normally distributed random numbers using Box-Muller transform
            const u = 1 - Math.random(); // Uniform random value between 0 and 1
            const v = 1 - Math.random(); // Uniform random value between 0 and 1
            const radius = cellHeight/10*Math.sqrt(-2 * Math.log(u));
            const angle = 2 * Math.PI * v;
          
            // Calculate the coordinates of the random point
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
          
            return { x, y };
        };

        // draw humans
        ctx.globalAlpha = 0.5;
        this.population.forEach(human => {
            let blue = human.genes[PARAMETERS.numTraits] > 0 ? 255 : 0;
            let red = human.genes[PARAMETERS.numTraits + 1] > 0 ? 255 : 0;
            ctx.fillStyle = rgb(red, 0, blue);
            let plot = getRandomPoint();
            ctx.fillRect(x+plot.x,y+plot.y,2,2);
        });
        ctx.globalAlpha = 1;
        
        // draw bonuses
        const scale = 2;
        
        for(let i = 0; i < PARAMETERS.numTraits; i++) {
            const bonus = this.environmentalBonuses[i] * scale;
            const gene = this.geneAverages ? this.geneAverages[i] * scale : 0;
            const meme = this.memeAverages ? Math.min(this.memeAverages[i], PARAMETERS.traitThreshold*2) * scale : 0;
            ctx.fillStyle = "green";
            ctx.fillRect(x + i*traitWidth, y + cellHeight - bonus, traitWidth, bonus);
            ctx.fillStyle = "blue";
            ctx.fillRect(x + i*traitWidth, y + cellHeight - bonus - gene, traitWidth, gene);
            ctx.fillStyle = "red";
            ctx.fillRect(x + i*traitWidth, y + cellHeight - bonus - gene - meme, traitWidth, meme);
        }
        const gene = this.geneAverages ? this.geneAverages[PARAMETERS.numTraits] * scale : 0;
        const meme = this.geneAverages ? this.geneAverages[PARAMETERS.numTraits + 1] * scale : 0;
        ctx.fillStyle = "blue";
        ctx.fillRect(x + (PARAMETERS.numTraits-2)*traitWidth, y, traitWidth, gene);
        ctx.fillStyle = "red";
        ctx.fillRect(x + (PARAMETERS.numTraits-1)*traitWidth, y, traitWidth, meme);

        ctx.strokeStyle = "black";
        ctx.setLineDash([5,5]);
        ctx.beginPath();
        ctx.moveTo(x, y + cellHeight - PARAMETERS.traitThreshold * scale);
        ctx.lineTo(x + cellWidth, y + cellHeight - PARAMETERS.traitThreshold * scale);
        ctx.stroke();
        ctx.setLineDash([1,0]);
        
        // write population total
        ctx.font = "12px Times New Roman";
        ctx.fillStyle = "black";
        ctx.fillText(`Pop: ${this.population.length}`, x + 40, y + 12);

     
    };
};
