// ============================================================================================================================================================================
// Initial Code 

var socket = io.connect("http://73.19.38.112:8888");


socket.on("connect", function () {
    databaseConnected();
});

socket.on("disconnect", function () {
    databaseDisconnected();
});

// this is just for all of the data that is being sent to the database
// document.addEventListener("DOMContentLoaded", function () {
//         // Emit a socket event with fixed parameters or those derived from other parts of your application
//         console.log("Sent find message");
//         socket.emit("find", { 
//             db: PARAMETERS.db, 
//             collection: PARAMETERS.collection, 
//             query: {}, 
//             // query: {"params.numTraits": 10}, 
//             // query: {run: "X2"}
//             limit: 1000,
//         });
//         socket.emit("test", "This is a test.");
//         socket.emit("count", { 
//             db: PARAMETERS.db, 
//             collection: PARAMETERS.collection, 
//             query: {}, // Your fixed or dynamic query
//         });
// });

socket.on("log", (data) => {
    // Assume db is already connected and collection is accessible
    console.log(data);
});

socket.on("find", (data) => {
    // Assume db is already connected and collection is accessible
    console.log(data);
});

// ============================================================================================================================================================================
//  to find the latest couple runs on X2

document.addEventListener("DOMContentLoaded", function () {
    console.log("Requesting the latest run...");

    canvas = document.getElementById("chart");
    context = canvas.getContext("2d");

    // Emit a socket event to fetch the latest run
    socket.emit("find", { 
        db: PARAMETERS.db, 
        collection: PARAMETERS.collection, 
        // run2, run1, X2, testAVG
        query: {run: PARAMETERS.run}, // Fetch all runs
        limit: 20, // modify this number to see how many you want to average for now its 5
    });
});


// document.addEventListener("DOMContentLoaded", function () {
//     console.log("Requesting the latest run...");

//     canvas = document.getElementById("chart");
//     context = canvas.getContext("2d");

//     // Emit a socket event to fetch the latest run
//     socket.emit("find", { 
//         db: PARAMETERS.db, 
//         collection: PARAMETERS.collection, 
//         query: {run: "testAVG"}, // Fetch all runs
//         limit: 20, // modify this number to see how many you want to average for now its 5
//     });
// });


// all averaged data attempt
socket.on("find", (data) => {
    if (data && data.length > 0) {
        console.log(`Found ${data.length} runs. Computing averages...`);

        // Compute Average Data
        const avgPopulation = averagePopulation(data);
        const avgGeneTickets = averageGeneTickets(data);
        const avgSocialTickets = averageSocialTickets(data);
        const avgLearningTickets = averageLearningTickets(data);

        console.log("Averaged Population:", avgPopulation);
        console.log("Averaged Gene Tickets:", avgGeneTickets);
        console.log("Averaged Social Tickets:", avgSocialTickets);
        console.log("Averaged Learning Tickets:", avgLearningTickets);

        // Simulating a game engine object since Graph requires `game.ctx`
        const gameEngine = { ctx: context };

        // **Clear previous graphs before redrawing**
        // context.clearRect(0, 0, canvas.width, canvas.height);

        // Graph: Averaged Population
        humanAvgGraph = new Graph(gameEngine, 50, 50, { day: avgPopulation.length }, 
                               [avgPopulation], "Averaged Population", ["Population"]);

        // Graph: Averaged Tickets
        ticketAvgGraph = new Graph(gameEngine, 50, 300, { day: avgGeneTickets.length }, 
                               [avgGeneTickets, avgSocialTickets, avgLearningTickets], 
                               "Averaged Tickets", ["Gene Tickets", "Social Tickets", "Learning Tickets"]);

        // Ensure we only draw the averaged data
        humanAvgGraph.update();
        humanAvgGraph.draw(context);

        ticketAvgGraph.update();
        ticketAvgGraph.draw(context);
    } else {
        console.error("No runs found.");
    }
});

// ============================================================================================================================================================================
// **Compute Average Population**
function averagePopulation(data) {
    if (!data.length) return [];

    let maxTicks = Math.max(...data.map(run => (run.population ? run.population.length : 0)));
    let avgPop = new Array(maxTicks).fill(0);
    let counts = new Array(maxTicks).fill(0);

    data.forEach(run => {
        if (run.population && run.population.length > 0) {
            run.population.forEach((value, index) => {
                avgPop[index] += value;
                counts[index]++;
            });
        }
    });

    return avgPop.map((sum, index) => (counts[index] > 0 ? sum / counts[index] : 0));
}

// **Compute Average Gene Tickets**
function averageGeneTickets(data) {
    if (!data.length) return [];

    let maxTicks = Math.max(...data.map(run => (run.geneTickets ? run.geneTickets.length : 0)));
    let avgGene = new Array(maxTicks).fill(0);
    let counts = new Array(maxTicks).fill(0);

    data.forEach(run => {
        if (run.geneTickets && run.geneTickets.length > 0) {
            run.geneTickets.forEach((value, index) => {
                avgGene[index] += value;
                counts[index]++;
            });
        }
    });

    return avgGene.map((sum, index) => (counts[index] > 0 ? sum / counts[index] : 0));
}

// **Compute Average Social Tickets**
function averageSocialTickets(data) {
    if (!data.length) return [];

    let maxTicks = Math.max(...data.map(run => (run.socialTickets ? run.socialTickets.length : 0)));
    let avgSocial = new Array(maxTicks).fill(0);
    let counts = new Array(maxTicks).fill(0);

    data.forEach(run => {
        if (run.socialTickets && run.socialTickets.length > 0) {
            run.socialTickets.forEach((value, index) => {
                avgSocial[index] += value;
                counts[index]++;
            });
        }
    });

    return avgSocial.map((sum, index) => (counts[index] > 0 ? sum / counts[index] : 0));
}

// **Compute Average Learning Tickets**
function averageLearningTickets(data) {
    if (!data.length) return [];

    let maxTicks = Math.max(...data.map(run => (run.learningTickets ? run.learningTickets.length : 0)));
    let avgLearning = new Array(maxTicks).fill(0);
    let counts = new Array(maxTicks).fill(0);

    data.forEach(run => {
        if (run.learningTickets && run.learningTickets.length > 0) {
            run.learningTickets.forEach((value, index) => {
                avgLearning[index] += value;
                counts[index]++;
            });
        }
    });

    return avgLearning.map((sum, index) => (counts[index] > 0 ? sum / counts[index] : 0));
}

// ============================================================================================================================================================================
// **Simplified Averaging Function (Only Population)**

// function averagePopulation(data) {
//     if (!data.length) return [];

//     let maxTicks = Math.max(...data.map(run => (run.population ? run.population.length : 0)));
//     let avgPop = new Array(maxTicks).fill(0);
//     let counts = new Array(maxTicks).fill(0);

//     data.forEach(run => {
//         if (run.population && run.population.length > 0) {
//             run.population.forEach((value, index) => {
//                 avgPop[index] += value;
//                 counts[index]++;
//             });
//         }
//     });

//     return avgPop.map((sum, index) => (counts[index] > 0 ? sum / counts[index] : 0));
// }
// ============================================================================================================================================================================
// Graphing the Latest Averaged Population

// socket.on("find", (data) => {
//     if (data && data.length > 0) {
//         console.log(`Found ${data.length} runs. Computing averages...`);

//         // **Compute Average Population**
//         const avgPopulation = averagePopulation(data);

//         console.log("Averaged Population:", avgPopulation);

//         const gameEngine = { ctx: context };

//         // **Graph: Averaged Population**
//         humanAvgGraph = new Graph(gameEngine, 800, 50, { day: avgPopulation.length }, 
//                                [avgPopulation], "Averaged Population", ["Populations"]);

//         // **Graph: Averaged Tickets **

        
//         // Update and draw the graph
//         humanAvgGraph.update();
//         humanAvgGraph.draw(context);
//     } else {
//         console.error("No runs found.");
//     }
// });

// =======================================================================================================================
// ============================================================================================================================================================================
//  Old GRAPHING LOGIC

// Handle the 'find' event to process and graph the latest run
// socket.on("find", (data) => {
//     if (data && data.length > 0) {
//         // Assuming the last element in the array is the latest
//         const latestRun = data[data.length - 1];
//         console.log("Latest run found:", latestRun);

//         // Extract relevant data
//         const popGraphData = latestRun.population || [];
//         const geneTickets = latestRun.geneTickets || [];
//         const socialTickets = latestRun.socialTickets || [];
//         const learningTickets = latestRun.learningTickets || [];

//         if (!popGraphData.length) {
//             console.error("No population data found in the latest run.");
//             return;
//         }

//         // Log the extracted information
//         console.log("Gene Tickets:", geneTickets);
//         console.log("Social Tickets:", socialTickets);
//         console.log("Learning Tickets:", learningTickets);

//         // Simulating a game engine object since Graph requires `game.ctx`
//         const gameEngine = { ctx: context };

//         // Create the Population Graph
//         humanGraph = new Graph(gameEngine, 50, 50, { day: popGraphData.length }, [popGraphData], "Population", ["Population"]);

//         // Create the Tickets Graph (combining Gene, Social, and Learning Tickets)
//         ticketGraph = new Graph(gameEngine, 50, 300, { day: geneTickets.length }, [geneTickets, socialTickets, learningTickets], 
//                                 "Tickets Distribution", ["Gene Tickets", "Social Tickets", "Learning Tickets"]);

//         // Update and draw the graphs
//         // humanGraph.update();
//         humanGraph.draw(context);

//         ticketGraph.update();
//         ticketGraph.draw(context);
//     } else {
//         console.error("No runs found.");
//     }
// }); 
// ============================================================================================================================================================================











