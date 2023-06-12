class Human {
    constructor(village, other) {
        Object.assign(this, {village});

        this.genes = [];
        this.memes = [];
        for(let i = 0; i < PARAMETERS.numTraits; i++) {
            this.genes.push(other ? other.genes[i] : 0);
            this.memes.push(0);
        }
        this.genes.push(other ? other.genes[PARAMETERS.numTraits] : 0); // learning tickets
        this.genes.push(other ? other.genes[PARAMETERS.numTraits + 1] : 0); // social learning tickets
        this.geneTotal = this.genes.reduce((accumulator, currentValue) => accumulator + currentValue, 1);
        this.reproductionThreshold = PARAMETERS.reproductionThresholdBase + PARAMETERS.reproductionThresholdStep * this.geneTotal;

        this.mutate();
        this.performTasks();
        this.energy = PARAMETERS.reproductionThresholdBase;
    };

    normalize(gene) {
        if(gene < 0) gene = 0;
        return gene;
    };

    mutate() {
        this.genes = this.genes.map(gene => Math.random() < PARAMETERS.mutationRate ? Math.random() < 0.5 ? gene + 1 : this.normalize(gene - 1) : gene);
    };

    crossover(other) {
        this.genes = this.genes.map((gene, index) => Math.random() < 0.5 ? gene : other.genes[index]);
    };

    performTasks() {
        this.successes = 0;
        for(let i = 0; i < PARAMETERS.numTraits; i++) {
            if(this.genes[i] + this.memes[i] + this.village.environmentalBonuses[i] >= PARAMETERS.traitThreshold) this.successes++;
        }
    };

    reproduce() {
        const newVillage = this.village.migrate();
        const otherParent = newVillage.population[randomInt(newVillage.population.length)];
        const newHuman = new Human(newVillage, this);
        if(otherParent) newHuman.crossover(otherParent);
        newVillage.addHuman(newHuman);
        this.energy -= PARAMETERS.reproductionThresholdStep;
    };

    learn() {
        if(Math.random() < PARAMETERS.learningRate) {
            this.memes[randomInt(this.memes.length)]++;
        }
    };

    socialLearn() {
        if(Math.random() < PARAMETERS.socialLearningRate) {
            const other = this.village.population[randomInt(this.village.population.length)];
            const memeIndex = randomInt(PARAMETERS.numTraits);
            if(this.memes[memeIndex] < other.memes[memeIndex]) this.memes[memeIndex] = other.memes[memeIndex];
        }
    };

    update() {
        this.performTasks();
        
        this.energy += this.successes - this.village.penalty;
        if (this.energy >= this.reproductionThreshold) {
           this.reproduce();
        }

        let learningTickets = this.genes[this.genes.length-2];
        let socialTickets = this.genes[this.genes.length-1];

        while(learningTickets-- > 0) {
            this.learn();
        }

        while(socialTickets-- > 0) {
            this.socialLearn();
        }
    };

    draw(){
    };
};
