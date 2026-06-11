// This game shell was happily modified from Googler Seth Ladd's "Bad Aliens" game and his Google IO talk in 2011

class Timer {
    constructor() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
    this.ticks = [];
    this.fps = 0;
    };

    tick() {
        var wallCurrent = performance.now();
        var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
        this.wallLastTimestamp = wallCurrent;
    
        var gameDelta = Math.min(wallDelta, this.maxStep);
        this.gameTime += gameDelta;
    
        this.ticks.push(wallDelta);
    
        let index = this.ticks.length - 1;
        let sum = 0;
        while(sum <= 1 && index >= 0) {
            sum += this.ticks[index--];
        }
        index++;
    
        this.ticks.splice(0,index);
    
        return gameDelta;
    };

    calculateFPS() {
        let sum = this.ticks.reduce((a, b) => a + b, 0);
        let frameCount = this.ticks.length;
        if (sum > 0) {
            this.fps = frameCount / sum;
        }
        return this.fps;
    }

    displayFps() {
    document.getElementById('fpsCounter').textContent = `FPS: ${this.fps.toFixed(2)}`;
    };

};


// Timer.prototype.tick = function () {

// };


//     tick() {
//         const current = Date.now();
//         const delta = (current - this.lastTimestamp) / 1000;
//         this.lastTimestamp = current;

//         const gameDelta = Math.min(delta, this.maxStep);
//         this.gameTime += gameDelta;
//         return gameDelta;
//     };
// };