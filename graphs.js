
// ============================================================================================================================================================================
// Initial Code 

var socket = io.connect("http://73.19.38.112:8888");


socket.on("connect", function () {
    databaseConnected();
});

socket.on("disconnect", function () {
    databaseDisconnected();
});

document.addEventListener("DOMContentLoaded", function () {
        // Emit a socket event with fixed parameters or those derived from other parts of your application
        console.log("Sent find message");
        socket.emit("find", { 
            db: PARAMETERS.db, 
            collection: PARAMETERS.collection, 
            query: {}, 
            // query: {"params.numTraits": 10}, 
            // query: {run: "X2"}
            limit: 1000,
        });
        socket.emit("test", "This is a test.");
        socket.emit("count", { 
            db: PARAMETERS.db, 
            collection: PARAMETERS.collection, 
            query: {}, // Your fixed or dynamic query
        });
});

socket.on("log", (data) => {
    // Assume db is already connected and collection is accessible
    console.log(data);
});

socket.on("find", (data) => {
    // Assume db is already connected and collection is accessible
    console.log(data);
});

// ============================================================================================================================================================================
//  to find the latest run

document.addEventListener("DOMContentLoaded", function () {
    console.log("Requesting the latest run...");


    
    canvas = document.getElementById("chart");
    context = canvas.getContext("2d");

    // Emit a socket event to fetch the latest run
    socket.emit("find", { 
        db: PARAMETERS.db, 
        collection: PARAMETERS.collection, 
        query: {run: "X2"}, // Fetch all runs
        limit: 100, // Limit to the latest run
    });
});

// Handle the 'find' event to log the latest run
// socket.on("find", (data) => {
//     if (data && data.length > 0) {
//         // Assuming the last element in the array is the latest (sorted by `_id`)
//         const latestRun = data[data.length - 1];
//         console.log("Latest run found:", latestRun);
//     } else {
//         console.error("No runs found.");
//     }
// });

// ============================================================================================================================================================================
//  LOOK AT THE GRAPHING HERE

// Handle the 'find' event to process and graph the latest run
socket.on("find", (data) => {
    if (data && data.length > 0) {
        // Assuming the last element in the array is the latest
        const latestRun = data[data.length - 1];
        console.log("Latest run found:", latestRun);

        // Extract relevant data
        const popGraphData = latestRun.population || [];
        const geneTickets = latestRun.geneTickets || [];
        const socialTickets = latestRun.socialTickets || [];
        const learningTickets = latestRun.learningTickets || [];

        if (!popGraphData.length) {
            console.error("No population data found in the latest run.");
            return;
        }

        // Log the extracted information
        console.log("Gene Tickets:", geneTickets);
        console.log("Social Tickets:", socialTickets);
        console.log("Learning Tickets:", learningTickets);

        // Simulating a game engine object since Graph requires `game.ctx`
        const gameEngine = { ctx: context };

        // Create the Population Graph
        humanGraph = new Graph(gameEngine, 50, 50, { day: popGraphData.length }, [popGraphData], "Population", ["Population"]);

        // Create the Tickets Graph (combining Gene, Social, and Learning Tickets)
        ticketGraph = new Graph(gameEngine, 50, 300, { day: geneTickets.length }, [geneTickets, socialTickets, learningTickets], 
                                "Tickets Distribution", ["Gene Tickets", "Social Tickets", "Learning Tickets"]);

        // Update and draw the graphs
        humanGraph.update();
        humanGraph.draw(context);

        ticketGraph.update();
        ticketGraph.draw(context);
    } else {
        console.error("No runs found.");
    }
}); 















// later stuff i wanna test
// ============================================================================================================================================================================
// socket.on("find", (data) => {
//     if (data && data.length > 0) {
//         console.log(`Found ${data.length} runs. Averaging data...`);

//         // Compute averaged data
//         const avgPopulation = averageData(data, "population");
//         const avgGeneTickets = averageData(data, "geneTickets");
//         const avgSocialTickets = averageData(data, "socialTickets");
//         const avgLearningTickets = averageData(data, "learningTickets");

//         // Log averaged data
//         console.log("Averaged Population:", avgPopulation);
//         console.log("Averaged Gene Tickets:", avgGeneTickets);
//         console.log("Averaged Social Tickets:", avgSocialTickets);
//         console.log("Averaged Learning Tickets:", avgLearningTickets);

//         // Simulating a game engine object since Graph requires `game.ctx`
//         const gameEngine = { ctx: context };

//         // Create the Population Graph
//         humanGraph = new Graph(gameEngine, 50, 50, { day: avgPopulation.length }, [avgPopulation], "Average Population", ["Population"]);

//         // Create the Tickets Graph (combining Gene, Social, and Learning Tickets)
//         ticketGraph = new Graph(gameEngine, 50, 300, { day: avgGeneTickets.length }, 
//                                 [avgGeneTickets, avgSocialTickets, avgLearningTickets], 
//                                 "Average Tickets Distribution", ["Gene Tickets", "Social Tickets", "Learning Tickets"]);

//         // Update and draw the graphs
//         humanGraph.update();
//         humanGraph.draw(context);

//         ticketGraph.update();
//         ticketGraph.draw(context);
//     } else {
//         console.error("No runs found.");
//     }
// });

// // Function to average multiple runs of data
// function averageData(runs, key) {
//     if (!runs.length) return [];

//     // Find the maximum length of the datasets
//     let maxLength = Math.max(...runs.map(run => (run[key] ? run[key].length : 0)));

//     // Initialize an array of zeros with maxLength
//     let avgArray = new Array(maxLength).fill(0);

//     // Count valid data points for each index
//     let counts = new Array(maxLength).fill(0);

//     // Sum up values at each time step
//     runs.forEach(run => {
//         if (run[key] && run[key].length > 0) {
//             run[key].forEach((value, index) => {
//                 avgArray[index] += value;
//                 counts[index]++;
//             });
//         }
//     });

//     // Compute the average for each time step
//     return avgArray.map((sum, index) => (counts[index] > 0 ? sum / counts[index] : 0));
// }



// ============================================================================================================================================================================