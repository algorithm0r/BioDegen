// ============================================================================================================================================================================
// BioDegen Data Visualization with Dropdown Selection
// Updated to query one run at a time with line graphs + histogram merging

const bioRunAll = [
  // ===== CONTROL (Step 0, learning/social enabled) =====
  "6 Step 0 l01M15 (control)",
  "6 Step 0 l02M15 (control)",
  "6 Step 0 l03M15 (control)",

  // ===== LR 0.01 — NO LEARNING / SOCIAL =====
  "6 Step 0 l01M15 (no learn/social)",
  "6 Step 5 l01M15 (no learn/social)",
  "6 Step 7 l01M15 (no learn/social)",
  "6 Step 9 l01M15 (no learn/social)",
  "6 Step 11 l01M15 (no learn/social)",
  "6 Step 13 l01M15 (no learn/social)",
  "6 Step 15 l01M15 (no learn/social)",

  // OG
  "6 Step 5 l01M15",  
  "6 Step 7 l01M15",  
  "6 Step 9 l01M15",  
  "6 Step 11 l01M15",  
  "6 Step 13 l01M15", 
  "6 Step 15 l01M15",
  
  "6 Step 5 l02M15",  
  "6 Step 7 l02M15",  
  "6 Step 9 l02M15",  
  "6 Step 11 l02M15",  
  "6 Step 13 l02M15", 
  "6 Step 15 l02M15",
                  
  "6 Step 5 l03M15",  
  "6 Step 7 l03M15",
  "6 Step 9 l03M15",   
  "6 Step 11 l03M15",  
  "6 Step 13 l03M15", 
  "6 Step 15 l03M15"
];

var socket = io.connect("https://73.19.38.112:8888");
var canvas;
var context;
var currentData = null; // Store current run's processed data

// ============================================================================================================================================================================
// Socket connection handlers

socket.on("connect", function () {
  databaseConnected();
});

socket.on("disconnect", function () {
  databaseDisconnected();
});

// ============================================================================================================================================================================
// DOM Initialization

document.addEventListener("DOMContentLoaded", function () {
  canvas = document.getElementById("chart");
  context = canvas.getContext("2d");
  
  // Populate dropdown with run names
  populateDropDown(bioRunAll);
  
  // Query button - fetch and display selected run
  document.getElementById("query").addEventListener("click", function () {
    queryCurrentSelection();
  });
  
  // Next button - move to next run and query it
  document.getElementById("next").addEventListener("click", function () {
    const select = document.getElementById("run_selection");
    const currentIndex = select.selectedIndex;
    const nextIndex = (currentIndex + 1) % select.options.length;
    select.selectedIndex = nextIndex;
    queryCurrentSelection();
  });
  
  // Download button - download current run's data
  document.getElementById("download").addEventListener("click", function () {
    if (!currentData) {
      alert("No data to download. Please query a run first.");
      return;
    }
    downloadCurrentRun();
  });
});

function queryCurrentSelection() {
  const selectedRun = document.getElementById("run_selection").value;
  const info = document.getElementById("query_info");
  info.innerText = `Querying ${selectedRun}...`;
  
  socket.emit("find", {
    db: PARAMETERS.db,
    collection: PARAMETERS.collection,
    query: { run: selectedRun, geneHistogram: { $exists: true } },
    limit: 1000
  });
}

// ============================================================================================================================================================================
// Socket event handlers

socket.on("find", function (docs) {
  const info = document.getElementById("query_info");
  
  if (!docs || docs.length === 0) {
    info.innerText = "No data found for this run.";
    return;
  }
  
  info.innerText = `Processing ${docs.length} records...`;
  
  // Process the data
  processAndDisplayRun(docs);
  
  info.innerText = `Displayed ${docs.length} records for ${docs[0].run}`;
});

// ============================================================================================================================================================================
// Helper Functions

function populateDropDown(runs) {
  const select = document.getElementById("run_selection");
  runs.forEach(runName => {
    const option = document.createElement("option");
    option.value = runName;
    option.textContent = runName;
    select.appendChild(option);
  });
}

// ============================================================================================================================================================================
// Data Processing Functions

// Average a time series across multiple records
function averageTimeSeries(docs, fieldName) {
  if (docs.length === 0) return [];
  
  // Find max length
  let maxLength = 0;
  docs.forEach(doc => {
    if (doc[fieldName] && doc[fieldName].length > maxLength) {
      maxLength = doc[fieldName].length;
    }
  });
  
  // Sum all values
  const sums = new Array(maxLength).fill(0);
  const counts = new Array(maxLength).fill(0);
  
  docs.forEach(doc => {
    if (doc[fieldName]) {
      for (let i = 0; i < doc[fieldName].length; i++) {
        sums[i] += doc[fieldName][i];
        counts[i]++;
      }
    }
  });
  
  // Compute averages
  const averages = [];
  for (let i = 0; i < maxLength; i++) {
    averages.push(counts[i] > 0 ? sums[i] / counts[i] : 0);
  }
  
  return averages;
}

// Combine histograms across records (sum bucket counts)
function combineHistograms(docs, fieldName) {
  if (docs.length === 0) return { histogram: [], count: 0 };
  
  // Filter docs that have this histogram
  const docsWithHist = docs.filter(doc => doc[fieldName] && doc[fieldName].length > 0);
  
  if (docsWithHist.length === 0) {
    return { histogram: [], count: 0 };
  }
  
  // Find max length (number of time points)
  let maxLength = 0;
  docsWithHist.forEach(doc => {
    if (doc[fieldName].length > maxLength) {
      maxLength = doc[fieldName].length;
    }
  });
  
  // Initialize result: array of arrays (each time point has 20 buckets)
  const combined = [];
  for (let t = 0; t < maxLength; t++) {
    combined.push(new Array(20).fill(0));
  }
  
  // Sum bucket counts across all records
  docsWithHist.forEach(doc => {
    const hist = doc[fieldName];
    for (let t = 0; t < hist.length; t++) {
      if (hist[t]) {
        for (let bucket = 0; bucket < 20; bucket++) {
          combined[t][bucket] += (hist[t][bucket] || 0);
        }
      }
    }
  });
  
  return { histogram: combined, count: docsWithHist.length };
}

function processAndDisplayRun(docs) {
  // Compute line graph averages (all records)
  const avgPopulation = averageTimeSeries(docs, "population");
  const avgGeneTickets = averageTimeSeries(docs, "geneTickets");
  const avgSocialTickets = averageTimeSeries(docs, "socialTickets");
  const avgLearningTickets = averageTimeSeries(docs, "learningTickets");
  
  // Combine histograms (only records with histogram data)
  const geneHist = combineHistograms(docs, "geneHistogram");
  const learningHist = combineHistograms(docs, "learningHistogram");
  const socialHist = combineHistograms(docs, "socialHistogram");
  const memeHist = combineHistograms(docs, "memeHistogram");
  
  // Store processed data globally for downloads
  currentData = {
    runName: docs[0].run,
    totalRecords: docs.length,
    lineGraphs: {
      population: avgPopulation,
      geneTickets: avgGeneTickets,
      socialTickets: avgSocialTickets,
      learningTickets: avgLearningTickets
    },
    histograms: {
      gene: geneHist,
      learning: learningHist,
      social: socialHist,
      meme: memeHist
    }
  };
  
  // Draw everything
  drawAll(context, currentData);
}

// ============================================================================================================================================================================
// Drawing Functions

function drawAll(ctx, data) {
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "12px Arial";
  ctx.fillStyle = "black";
  
  // Title
  ctx.font = "20px Arial";
  ctx.fillText(`Run: ${data.runName}`, 50, 30);
  ctx.font = "12px Arial";
  
  // Draw 2 line graphs (side by side)
  const lineGraphY = 60;
  
  // Population graph (single line)
  drawLineGraph(ctx, 50, lineGraphY, data.lineGraphs.population, 
    `Population (${data.totalRecords} records)`, "#00AA00");
  
  // Combined tickets graph (three lines)
  drawMultiLineGraph(ctx, 700, lineGraphY, 
    [
      { data: data.lineGraphs.geneTickets, color: "#AA0000", label: "Gene" },
      { data: data.lineGraphs.socialTickets, color: "#0000AA", label: "Social" },
      { data: data.lineGraphs.learningTickets, color: "#AA00AA", label: "Learning" }
    ],
    `Tickets (${data.totalRecords} records)`);
  
  // Draw 4 histograms (below line graphs)
  const histY = 320;
  
  drawHistogram(ctx, 50, histY, data.histograms.gene, 
    `Gene Histogram (${data.histograms.gene.count} records)`);
  
  drawHistogram(ctx, 700, histY, data.histograms.learning, 
    `Learning Histogram (${data.histograms.learning.count} records)`);
  
  drawHistogram(ctx, 50, histY + 200, data.histograms.social, 
    `Social Histogram (${data.histograms.social.count} records)`);
  
  drawHistogram(ctx, 700, histY + 200, data.histograms.meme, 
    `Meme Histogram (${data.histograms.meme.count} records)`);
}

function drawLineGraph(ctx, x, y, data, label, color) {
  const width = 600;
  const height = 200;
  
  // Background
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(x, y, width, height);
  
  // Border
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  // Label
  ctx.fillStyle = "black";
  ctx.fillText(label, x + 10, y - 5);
  
  if (!data || data.length === 0) {
    ctx.fillText("No data", x + width/2 - 20, y + height/2);
    return;
  }
  
  // Find max value for scaling
  const maxVal = Math.max(...data, 1);
  
  // Draw line
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  
  const xScale = width / Math.max(data.length - 1, 1);
  const yScale = (height - 20) / maxVal;
  
  ctx.moveTo(x, y + height - 10 - (data[0] * yScale));
  
  for (let i = 1; i < data.length; i++) {
    const xPos = x + (i * xScale);
    const yPos = y + height - 10 - (data[i] * yScale);
    ctx.lineTo(xPos, yPos);
  }
  
  ctx.stroke();
  
  // Draw max value label
  ctx.fillStyle = "black";
  ctx.fillText(Math.round(maxVal).toString(), x + width + 5, y + 10);
  ctx.fillText("0", x + width + 5, y + height - 5);
}

function drawMultiLineGraph(ctx, x, y, series, label) {
  const width = 600;
  const height = 200;
  
  // Background
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(x, y, width, height);
  
  // Border
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  // Label
  ctx.fillStyle = "black";
  ctx.fillText(label, x + 10, y - 5);
  
  // Check if we have any data
  const hasData = series.some(s => s.data && s.data.length > 0);
  if (!hasData) {
    ctx.fillText("No data", x + width/2 - 20, y + height/2);
    return;
  }
  
  // Find max value across all series for scaling
  let maxVal = 1;
  let maxLength = 0;
  series.forEach(s => {
    if (s.data && s.data.length > 0) {
      const seriesMax = Math.max(...s.data);
      if (seriesMax > maxVal) maxVal = seriesMax;
      if (s.data.length > maxLength) maxLength = s.data.length;
    }
  });
  
  const xScale = width / Math.max(maxLength - 1, 1);
  const yScale = (height - 40) / maxVal;
  
  // Draw each series
  series.forEach(s => {
    if (!s.data || s.data.length === 0) return;
    
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    ctx.moveTo(x, y + height - 20 - (s.data[0] * yScale));
    
    for (let i = 1; i < s.data.length; i++) {
      const xPos = x + (i * xScale);
      const yPos = y + height - 20 - (s.data[i] * yScale);
      ctx.lineTo(xPos, yPos);
    }
    
    ctx.stroke();
  });
  
  // Draw legend at bottom
  ctx.font = "10px Arial";
  let legendX = x + 10;
  series.forEach(s => {
    ctx.fillStyle = s.color;
    ctx.fillRect(legendX, y + height - 15, 10, 10);
    ctx.fillStyle = "black";
    ctx.fillText(s.label, legendX + 15, y + height - 7);
    legendX += 80;
  });
  
  // Draw max value label
  ctx.font = "12px Arial";
  ctx.fillStyle = "black";
  ctx.fillText(Math.round(maxVal).toString(), x + width + 5, y + 10);
  ctx.fillText("0", x + width + 5, y + height - 15);
}

function drawHistogram(ctx, x, y, histData, label) {
  const width = 600;
  const height = 150;
  
  // Background
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(x, y, width, height);
  
  // Border
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  // Label
  ctx.fillStyle = "black";
  ctx.fillText(label, x + 10, y - 5);
  
  if (!histData.histogram || histData.histogram.length === 0) {
    ctx.fillText("No histogram data", x + width/2 - 50, y + height/2);
    return;
  }
  
  const hist = histData.histogram;
  const numTimePoints = hist.length;
  const timeWidth = width / numTimePoints;
  const bucketHeight = height / 20;
  
  // Calculate total counts at each time point
  const totalCounts = [];
  for (let t = 0; t < hist.length; t++) {
    let sum = 0;
    for (let b = 0; b < 20; b++) {
      sum += hist[t][b];
    }
    totalCounts.push(sum > 0 ? sum : 1); // Avoid division by zero
  }
  
  // Draw histogram heatmap with logarithmic color scaling
  for (let t = 0; t < hist.length; t++) {
    for (let b = 0; b < 20; b++) {
      const count = hist[t][b];
      const normalized = count / totalCounts[t];
      
      // Apply logarithmic transformation (base 16, like original)
      const base = 16;
      let c = normalized * (base - 1) + 1;
      c = 511 - Math.floor(Math.log(c) / Math.log(base) * 512);
      
      // Color mapping
      let color;
      if (c > 255) {
        c = c - 256;
        color = `rgb(${c}, ${c}, 255)`;
      } else {
        color = `rgb(0, 0, ${c})`;
      }
      
      ctx.fillStyle = color;
      
      const xPos = x + (t * timeWidth);
      const yPos = y + ((19 - b) * bucketHeight); // Flip vertically
      
      ctx.fillRect(xPos, yPos, Math.ceil(timeWidth), Math.ceil(bucketHeight));
    }
  }
  
  // Redraw border
  ctx.strokeStyle = "black";
  ctx.strokeRect(x, y, width, height);
}

// ============================================================================================================================================================================
// Download Functions

function downloadCurrentRun() {
  const runName = currentData.runName;
  const shortName = generateShortName(runName);
  
  // Download line graphs as one CSV
  downloadLineGraphs(shortName);
  
  // Download each histogram separately
  downloadHistogram(shortName, "gene", currentData.histograms.gene);
  downloadHistogram(shortName, "learning", currentData.histograms.learning);
  downloadHistogram(shortName, "social", currentData.histograms.social);
  downloadHistogram(shortName, "meme", currentData.histograms.meme);
}

function generateShortName(fullName) {
  // Extract key parts: e.g., "6 Step 5 l02M15" -> "Step5_l02M15"
  // Simple extraction: remove "6 " prefix, replace spaces with underscores
  let short = fullName.replace(/^6\s+/, "").replace(/\s+/g, "_");
  // Limit length
  if (short.length > 30) short = short.substring(0, 30);
  return short;
}

function downloadLineGraphs(prefix) {
  const lines = currentData.lineGraphs;
  
  // CSV header
  let csv = "Time,Population,GeneTickets,SocialTickets,LearningTickets\n";
  
  // Find max length
  const maxLen = Math.max(
    lines.population.length,
    lines.geneTickets.length,
    lines.socialTickets.length,
    lines.learningTickets.length
  );
  
  // Build rows
  for (let i = 0; i < maxLen; i++) {
    csv += `${i},`;
    csv += `${i < lines.population.length ? lines.population[i] : ""},`;
    csv += `${i < lines.geneTickets.length ? lines.geneTickets[i] : ""},`;
    csv += `${i < lines.socialTickets.length ? lines.socialTickets[i] : ""},`;
    csv += `${i < lines.learningTickets.length ? lines.learningTickets[i] : ""}\n`;
  }
  
  downloadBlob(csv, `${prefix}_linegraphs.csv`);
}

function downloadHistogram(prefix, histName, histData) {
  if (!histData.histogram || histData.histogram.length === 0) {
    console.log(`No data for ${histName} histogram`);
    return;
  }
  
  const hist = histData.histogram;
  let csv = "";
  
  // Each row is one time point with 20 bucket values
  for (let t = 0; t < hist.length; t++) {
    csv += hist[t].join(",") + "\n";
  }
  
  downloadBlob(csv, `${prefix}_${histName}_hist.csv`);
}

function downloadBlob(content, filename) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}