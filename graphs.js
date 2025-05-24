// ============================================================================================================================================================================
// Initial Code 


// The six BioDegen run names in your DB:
// const bioRuns = ["Run11 - Step 5","Run12 - Step 10","Run13 - Step 15","Run14 - Step 20","Run15 - Step 25","Run16 - Step 30"];
// const bioRuns = ["Run17 - Step 5 on","Run18 - Step 5 off","Run19 - Step 10 on","Run20 - Step 10 off","Run21 - Step 15 on","Run22 - Step 15 off"];

// const bioRuns = ["Run17 - Step 5 on","Run19 - Step 10 on","Run21 - Step 15 on"];
const bioRuns = ["Run23 - Step 7 on", "Run24 - Step 9 on", "Run25 - Step 11 on", "Run26 - Step 13 on"];

var socket = io.connect("https://73.19.38.112:8888");


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

// socket.on("log", (data) => {
//     // Assume db is already connected and collection is accessible
//     console.log(data);
// });

// socket.on("find", (data) => {
//     // Assume db is already connected and collection is accessible
//     console.log(data);
// });



// // ============================================================================================================================================================================
// //  to find the latest couple runs on X2

// document.addEventListener("DOMContentLoaded", function () {
//     console.log("Requesting the latest run...");

//     canvas = document.getElementById("chart");
//     context = canvas.getContext("2d");

//     // Emit a socket event to fetch the latest run
//     socket.emit("find", { 
//         db: PARAMETERS.db, 
//         collection: PARAMETERS.collection, 
//         // run2, run1, X2, testAVG
//         query: {run: PARAMETERS.run}, // Fetch all runs
//         limit: 100, // modify this number to see how many you want to average for now its 5
//     });
// });


// // all averaged data attempt
// socket.on("find", (data) => {
//     if (data && data.length > 0) {
//         console.log(`Found ${data.length} runs. Computing averages...`);

//         // Compute Average Data
//         const avgPopulation = averagePopulation(data);
//         const avgGeneTickets = averageGeneTickets(data);
//         const avgSocialTickets = averageSocialTickets(data);
//         const avgLearningTickets = averageLearningTickets(data);

//         console.log("Averaged Population:", avgPopulation);
//         console.log("Averaged Gene Tickets:", avgGeneTickets);
//         console.log("Averaged Social Tickets:", avgSocialTickets);
//         console.log("Averaged Learning Tickets:", avgLearningTickets);

//         // Simulating a game engine object since Graph requires `game.ctx`
//         const gameEngine = { ctx: context };


//         // Graph: Averaged Population
//         humanAvgGraph = new Graph(gameEngine, 50, 50, { day: avgPopulation.length }, 
//                                [avgPopulation], "Averaged Population", ["Population"]);

//         // Graph: Averaged Tickets
//         ticketAvgGraph = new Graph(gameEngine, 50, 300, { day: avgGeneTickets.length }, 
//                                [avgGeneTickets, avgSocialTickets, avgLearningTickets], 
//                                "Averaged Tickets", ["Gene Tickets", "Social Tickets", "Learning Tickets"]);

//         humanAvgGraph.update();
//         humanAvgGraph.draw(context);

//         ticketAvgGraph.update();
//         ticketAvgGraph.draw(context);
//     } else {
//         console.error("No runs found.");
//     }
// });

// ============================================================================================================================================================================
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
// Downloading all the recent runs with new Steps

document.addEventListener("DOMContentLoaded", () => {
    const downloadAllBtn = document.getElementById("downloadAll");
    downloadAllBtn.addEventListener("click", async () => {
      const canvas = document.getElementById("chart");
      const ctx    = canvas.getContext("2d");
      const game   = { ctx };
  
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // Layout constants
      const cols      = 3;            // 3 columns
      const margin    = 30;           // outer margin
      const gapX      = 40;           // horizontal gap
      const gapY      = 50;           // vertical gap
      const graphW    = 500;          // new, smaller width
      const graphH    = 175;          // keep height
      const cellW     = graphW;       
      const cellH     = graphH * 2 + 10;
  
    //   Draw each run in a 3×3 grid
      for (let i = 0; i < bioRuns.length; i++) {
        const runName = bioRuns[i];
        const col = i % cols, row = Math.floor(i / cols);
        const baseX = margin + col * (cellW + gapX);
        const baseY = margin + row * (cellH + gapY);
  
        // Fetch data once
        socket.emit("find", {
          db:         PARAMETERS.db,
          collection: PARAMETERS.collection,
          query:      { run: runName },
          limit:      1000
        });
        const docs = await new Promise(res =>
          socket.once("find", data => res(data || []))
        );
        if (!docs.length) continue;
  
        // Compute averages
        const avgPop    = averagePopulation(docs);
        const avgGene   = averageGeneTickets(docs);
        const avgSocial = averageSocialTickets(docs);
        const avgLearn  = averageLearningTickets(docs);
  
        // <-- NEW: log everything for each runName
        console.group(`Run ${runName}`);
        console.log("Raw docs array:", docs);
        // console.log("  avgPop:",    avgPop);
        // console.log("  avgGene:",   avgGene);
        // console.log("  avgSocial:", avgSocial);
        // console.log("  avgLearn:",  avgLearn);
        console.groupEnd();

        // Population graph
        const popG = new Graph(
          game,
          baseX,
          baseY,
          { day: avgPop.length },
          [ avgPop ],
          `${runName} — Population`,
          ["Population"]
        );
        popG.xSize = graphW;         
        popG.update();
        popG.draw(ctx);
  
        // Tickets graph
        const tickG = new Graph(
          game,
          baseX,
          baseY + graphH + 10,
          { day: avgGene.length },
          [ avgGene, avgSocial, avgLearn ],
          `${runName} — Tickets`,
          ["Gene","Social","Learning"]
        );
        tickG.xSize = graphW;              
        tickG.update();
        tickG.draw(ctx);
      }
  
      console.log("All BioDegen runs graphed with smaller width.");
    });
  });
//   =============================================================================================================================================================================
//  Singular RUNS from QUERY button 

// emit your query once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    const queryBtn = document.getElementById("query");
    const info     = document.getElementById("query_info");
    const canvas   = document.getElementById("chart");
    const ctx      = canvas.getContext("2d");
    const game     = { ctx };
  
    queryBtn.addEventListener("click", async () => {
      // clear old drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // status update
      info.innerText = `Querying run ${PARAMETERS.run}…`;
  
      // fetch all docs for this single run
      socket.emit("find", {
        db:         PARAMETERS.db,
        collection: PARAMETERS.collection,
        query:      { run: PARAMETERS.run },
        limit:      1000
      });
      const docs = await new Promise(res =>
        socket.once("find", data => res(data || []))
      );
      
      console.log(`Fetched ${docs.length} documents from the DB.`, docs);
      console.log(
        "Run names in returned docs:",
        // if you want only the unique run names:
        [...new Set(docs.map(d => d.run))]
      );
      
      if (!docs.length) {
        info.innerText = `No data for run ${PARAMETERS.run}`;
        return;
      }
  
      // compute averages
      const avgPopulation      = averagePopulation(docs);
      const avgGeneTickets     = averageGeneTickets(docs);
      const avgSocialTickets   = averageSocialTickets(docs);
      const avgLearningTickets = averageLearningTickets(docs);
  
      info.innerText = `Found ${docs.length} records — rendering…`;
  
      // draw Population graph
      const popG = new Graph(
        game,
        50,  50,
        { day: avgPopulation.length },
        [avgPopulation],
        `Run ${PARAMETERS.run} — Population`,
        ["Population"]
      );
      popG.update();
      popG.draw(ctx);
  
      // draw Tickets graph
      const tickG = new Graph(
        game,
        50,   300,
        { day: avgGeneTickets.length },
        [avgGeneTickets, avgSocialTickets, avgLearningTickets],
        `Run ${PARAMETERS.run} — Tickets`,
        ["Gene", "Social", "Learn"]
      );
      tickG.update();
      tickG.draw(ctx);
  
      info.innerText = `Rendered run ${PARAMETERS.run}.`;
    });
  });
  