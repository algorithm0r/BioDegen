function Graph(game, x, y, world, data, label, labels) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.world = world;
    this.data = data;

  
    this.label = label;
    this.labels = labels;

    this.xSize = 600;
    this.ySize = 175;
    this.ctx = game.ctx;
    
    this.colors = ["#00BB00", "#BB0000", "#00BBBB", "#CCCCCC"];
    this.maxVal = 0;
}



Graph.prototype.update = function () {
    // this.data = [];
   

    //tester logic for now 
    // let graphDataList = this.world.getData();
    // let currentGraphData = graphDataList.find(item => item.name === this.label); // 'this.label' identifies the graph type

    // if (currentGraphData) {
    //     this.data = currentGraphData.data; // Update the graph's data
    //     this.maxVal = Math.max(...this.data); // Recalculate maxVal for scaling
    // }

    // let dataList = this.world.getData();
    
    this.updateMax();
}

Graph.prototype.draw = function (ctx) {

    // this.clear();

    if (this.data[0].length > 1) {
        for(var j = 0; j < this.data.length; j++) {
            var data = this.data[j];

            this.ctx.strokeStyle = this.colors[j];
            this.ctx.lineWidth = 2;
    
            this.ctx.beginPath();
            var xPos = this.x;
            var yPos = data.length > this.xSize ? this.y + this.ySize - Math.floor(data[data.length - this.xSize] / this.maxVal * this.ySize)
                                            : this.y + this.ySize - Math.floor(data[0] / this.maxVal * this.ySize);
            this.ctx.moveTo(xPos, yPos);
            var length = data.length > this.xSize ?
                this.xSize : data.length;
            for (var i = 1; i < length; i++) {
                var index = data.length > this.xSize ?
                            data.length - this.xSize - 1 + i : i;
                xPos++;
                yPos = this.y + this.ySize - Math.floor(data[index] / this.maxVal * this.ySize);
                if (yPos <= 0) {
                    yPos = 0;
                }
    
                this.ctx.lineTo(xPos, yPos);
            }
            this.ctx.stroke();
            this.ctx.closePath();
    
            this.ctx.strokeStyle = "#000000";
            this.ctx.fillSytle = "#000000";
            this.ctx.fillText(data[data.length - 1], this.x + this.xSize + 15, yPos + 10);
    
            // Drawing the label underneath the graph
            this.ctx.fillStyle = "#000000"; // Set the text color
            this.ctx.textAlign = "center"; // Center the text below the graph
            // Position the label below the graph. Adjust the y value as needed to place it correctly
            this.ctx.fillText(this.label, this.x + this.xSize / 2, this.y + this.ySize + 20);
        }


    }
    var firstTick = 0;
    firstTick = this.data[0].length > this.xSize ? this.data[0].length - this.xSize : 0;
    this.ctx.fillText(firstTick * PARAMETERS.reportingPeriod, this.x, this.y + this.ySize + 10);
    this.ctx.textAlign = "right";
    this.ctx.fillText(this.world.day - 1, this.x + this.xSize - 5, this.y + this.ySize + 10);


    // Draw the legend
    var legendX = (this.x + this.xSize) - 300; // Adjust as needed
    var legendY = this.y + 155;
      
    for (var j = 0; j < this.data.length; j++) {
        // Draw the colored line or square
        this.ctx.fillStyle = this.colors[j];
        this.ctx.fillRect(legendX + j * 100, legendY, 60, 20); // Adjust as needed
      
        // Draw the label
        this.ctx.fillStyle = "#000000"; // Set the text color to black
        this.ctx.fillText(this.labels[j], legendX + j * 100 + 55, legendY + 15); // Adjust as needed
    }


    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(this.x, this.y, this.xSize, this.ySize);
}

Graph.prototype.updateMax = function () {
    this.maxVal = Math.max(...[].concat(...this.data));
}

// keep testing this clear method
Graph.prototype.clearGraphData = function() {
    this.ctx.clearRect(this.x, this.y, this.xSize, this.ySize);

    console.log("Clearing graph data before reset:", JSON.stringify(this.data));
    this.data = this.data.map(() => []);
    this.updateMax();
    console.log("Graph data after reset:", JSON.stringify(this.data));
};

Graph.prototype.clear = function () {
    this.ctx.clearRect(this.x, this.y, this.xSize, this.ySize);
};