# BioDegen — Energetic Competition and Relaxed Selection in Gene-Culture Co-evolution

Agent-based model for the paper *"Energetic Competition and Relaxed Selection in
Gene-Culture Co-evolution"* (Andrew Younghyuk Chon & Chris Marriott, University
of Washington Tacoma).

Agents evolve genetic task solutions alongside individual- and social-learning
genes, with reproduction cost scaling with total genetic investment. A
cost-per-gene parameter `s` sets an analytical threshold (`s = 10`) separating
regimes where genetic solutions are adaptive from those where they are not.
Individual learning activates at 50k steps and social learning at 100k steps,
producing a staged cascade of relaxed selection.

## Model at a glance

Each agent carries 12 genes (10 task genes + 1 individual-learning gene + 1
social-learning gene) and 10 learned bonuses (reset to zero at birth). A task is
completed when genetic + learned + environmental bonus ≥ task threshold (5); each
completed task yields 1 energy/step. Reproduction threshold is `50 + g·s`, where
`g` is the gene sum and `s` is the cost per gene. See the paper's Model section
for the full specification; the parameters live in `runner.js` (`BASE`) and the
per-run overrides in `util.js` (`runs`).

| Parameter | Value | Where |
|---|---|---|
| World | 6 × 6 toroidal village grid | `worldDimension: 6` |
| Tasks / threshold | 10 / 5 | `numTraits`, `traitThreshold` |
| Reproduction base | 50 | `reproductionThresholdBase` |
| **Cost per gene `s`** | **{5, 7, 9, 11, 13, 15}** | `reproductionThresholdStep` |
| Mutation rate | 0.15 (±1, floored at 0) | `mutationRate` |
| **Individual learning rate** | **{0.01, 0.02, 0.03}** | `learningRate` |
| Social learning rate | 0.10 | `socialLearningRate` |
| Death rate | 0.005/step | `deathRate` |
| Migration | group, every 10 steps, rate 0.2 | `migratePeriod`, `migrationRate` |
| Soft population cap | ⌊p/30⌋ survival cost | `populationSoftCap: 30` |
| Run length | 200,000 steps | `epoch` |
| Individual learning onset | 50,000 | `learningOn` |
| Social learning onset | 100,000 | `socialOn` |
| Sampling | every 400 steps | `reportingPeriod` |

The two **experimental variables** are `s` (cost per gene) and the individual
`learningRate`; everything else is held fixed.

## Run configurations

`util.js` defines the `runs` array — 42 conditions, each run 50× independently
for the paper (run = unit of replication). Run names encode the condition:
`6 Step <s> l0<rate>M15`, e.g. `6 Step 9 l01M15` is `s = 9`, learning rate 1%,
mutation 15%.

| Condition group | n configs | learningOn / socialOn | Used for |
|---|---|---|---|
| **Experimental** (`6 Step <s> l0<r>M15`) | 18 (6 `s` × 3 rates) | 50,000 / 100,000 | full staged cascade |
| **No-learning control** (`… (no learn/social)`) | 6 (6 `s`, rate 1%) | 200,000 / 200,000 | pure-genetic baseline |
| **No-social control** (`… (no social)`) | 18 (6 `s` × 3 rates) | 50,000 / 200,000 | isolates individual vs social learning |

The stats/figure scripts parse these names to assign each run to its condition
(`parse_condition` in `data/stats_analysis.py`).

## Reproducing the paper

**Prerequisites**
- Node.js (≥ 16) with the `mongodb` package (`npm install mongodb`).
  (`socket.io-client` is only needed for the optional `--server` streaming mode,
  not the default direct-to-MongoDB path used here.)
- A MongoDB instance running at `mongodb://127.0.0.1:27017`.
- Python 3 with `numpy`, `pandas`, `scipy`, `matplotlib`.

**1. Run the full batch** (headless, parallel worker threads → MongoDB
`BioDegenDB.timing_test`):

```bash
node runner.js --reps 50 --workers 8
# resume / top up without redoing finished runs:
node runner.js --reps 50 --skip-existing
# progress from another shell:
node status.js
```

A 200,000-step run takes a couple of minutes per worker; the full 42 × 50 batch
is long-running (this is why the world is 6 × 6 rather than 10 × 10, which gave
qualitatively similar results at much greater cost).

**2. Export the per-run CSV** consumed by the analysis:

```bash
node export.js --out data/biodegen_perrun_all.csv
```

**3. Statistics** → `data/stats_results.md` and bootstrap-CI figures in
`data/figs/`:

```bash
python data/stats_analysis.py data/biodegen_perrun_all.csv
```

**4. Paper figures** (cascade, combined trajectories, no-social control, etc.):

```bash
python data/paper_figures.py data/biodegen_perrun_all.csv
```

## Interactive version

Open `index.html` in a browser for the live single-world visualization (genes,
learning, population, and per-village state). The headless `runner.js` reuses the
same simulation classes (`human.js`, `village.js`, `world.js`, `util.js`) via a
sandboxed VM context, so browser and batch runs share identical dynamics.

## Repository layout

| File | Role |
|---|---|
| `human.js`, `village.js`, `world.js` | core simulation (agents, villages, world) |
| `util.js` | global `PARAMETERS` defaults and the `runs` configuration array |
| `runner.js` | headless parallel batch runner (→ MongoDB) |
| `export.js` | MongoDB → per-run CSV |
| `status.js` | live batch progress |
| `index.html`, `gameengine.js`, `graph*.js`, `histogram.js` | browser visualization |
| `data/stats_analysis.py` | all statistical tests → `stats_results.md` |
| `data/paper_figures.py` | publication figures |
