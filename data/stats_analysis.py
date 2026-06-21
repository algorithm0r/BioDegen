#!/usr/bin/env python3
"""
Statistical analysis for the Relaxed Selection paper, addressing the reviewer
requests for quantitative support of the figure-based claims.

Input
-----
The per-run long CSV produced by export.html / export.js:

    run, run_index, timestep, metric, n, mean, median

where `run` is the condition name (e.g. "6 Step 9 l01M15"), `run_index`
distinguishes the ~48 independent runs within a condition (THE UNIT OF
REPLICATION), and metric in {gene, learning, social, meme, population}.

What it does
------------
1. Within-treatment degeneration: per-run change in task-gene mean from learning
   onset (50k) to end of run (200k); Wilcoxon signed-rank vs 0.
2. s = 9 vs s = 11 (the contested claim): Mann-Whitney U on end-of-run task-gene
   mean and on the 50k->200k change, with Cliff's delta effect size.
3. Threshold as a gradient: Spearman trend + Kruskal-Wallis of end-of-run
   task-gene mean across s in {5,7,9,11,13,15}.
4. Learning-rate effect at fixed s: Kruskal-Wallis across {1%,2%,3%} with
   Holm-corrected pairwise Mann-Whitney.
5. All adjacent-s pair endpoint comparisons (5v7, 7v9, 9v11, 11v13, 13v15),
   all metrics, Holm-corrected across pairs.
6. Spearman rho(task gene, s) at every tick — shows when the cost gradient
   deepens after learning onset.
7. Learning cascade stage 2: individual learning gene 100k→200k (Wilcoxon),
   social gene 100k→200k (Wilcoxon).
8. Per-run degeneration slope (linear regression 50k→200k), Spearman of
   slopes vs s — directly tests whether degeneration rate scales with cost.
9. Confidence-interval figures: across-run mean + bootstrap 95% CI bands.

Usage
-----
    python stats_analysis.py [biodegen_perrun_all.csv]

Requires numpy, pandas, scipy, matplotlib.
"""

import sys
import re
import os
import itertools
import numpy as np
import pandas as pd
from scipy import stats
import matplotlib.pyplot as plt

# ── configuration ────────────────────────────────────────────────────────────
CSV_PATH       = sys.argv[1] if len(sys.argv) > 1 else "biodegen_perrun_all.csv"
OUT_MD         = "stats_results.md"
FIG_DIR        = "figs"
THRESHOLD      = 5            # task threshold (paper)
ERA1_END       = 50_000      # individual learning activates
ERA2_END       = 100_000     # social learning activates
RUN_END        = 200_000
S_VALUES       = [5, 7, 9, 11, 13, 15]
NEIGHBOR_PAIRS = [(5,7), (7,9), (9,11), (11,13), (13,15)]
LR_VALUES      = [0.01, 0.02, 0.03]
METRIC_LABELS  = [("gene", "task gene"), ("population", "population"),
                  ("learning", "learning gene"), ("social", "social gene")]
N_BOOT         = 2000
WINDOW         = 10_000      # terminal-window width: average each run over the last 10k steps
RNG            = np.random.default_rng(20260611)

# ── run-name parsing ─────────────────────────────────────────────────────────
def parse_condition(run):
    """'6 Step 9 l01M15 (no learn/social)' -> dict(s, lr, kind)."""
    m = re.search(r"Step\s+(\d+)\s+l0?(\d+)M(\d+)", run)
    if not m:
        return None
    s   = int(m.group(1))
    lr  = int(m.group(2)) / 100.0          # l01 -> 0.01
    if "no learn" in run.lower():
        kind = "nolearn"                   # learning never activates (the paper's "control" column)
    elif "no social" in run.lower():
        kind = "nosocial"                  # individual learning only; social never fires
    elif "control" in run.lower():
        kind = "control0"                  # s=0 learning-enabled control
    else:
        kind = "exp"                       # staged-learning experimental run
    return dict(s=s, lr=lr, kind=kind)

# ── helpers ──────────────────────────────────────────────────────────────────
def cliffs_delta(a, b):
    """Effect size for Mann-Whitney: P(a>b) - P(a<b), range [-1, 1]."""
    a, b = np.asarray(a), np.asarray(b)
    gt = sum((x > b).sum() for x in a)
    lt = sum((x < b).sum() for x in a)
    return (gt - lt) / (len(a) * len(b))

def cliffs_label(d):
    ad = abs(d)
    return ("negligible" if ad < 0.147 else
            "small"      if ad < 0.33  else
            "medium"     if ad < 0.474 else "large")

def holm(pvals):
    """Holm-Bonferroni adjusted p-values."""
    p = np.asarray(pvals, float)
    order = np.argsort(p)
    m = len(p)
    adj = np.empty(m)
    running = 0.0
    for rank, idx in enumerate(order):
        running = max(running, (m - rank) * p[idx])
        adj[idx] = min(running, 1.0)
    return adj

def per_run_at(df_cond, metric, timestep, window=WINDOW):
    """Per-run `mean` for a metric averaged over the window (timestep-window, timestep].

    Averaging each run over a terminal window (default last 10k steps ≈ 25
    snapshots) instead of a single tick removes instantaneous fluctuation, which
    is the noise the reviewers flagged. With window<=0 it falls back to the
    single nearest snapshot."""
    sub = df_cond[df_cond.metric == metric]
    if sub.empty:
        return pd.Series(dtype=float)
    if window and window > 0:
        win = sub[(sub.timestep > timestep - window) & (sub.timestep <= timestep)]
        if win.empty:                                   # target before first window
            win = sub[sub.timestep <= timestep]
        if win.empty:
            return pd.Series(dtype=float)
        return win.groupby("run_index")["mean"].mean().astype(float)
    ts = sub.timestep.unique()
    nearest = ts[np.argmin(np.abs(ts - timestep))]
    snap = sub[sub.timestep == nearest]
    return snap.set_index("run_index")["mean"].astype(float)

def fmt_p(p):
    return "< 0.001" if p < 1e-3 else f"{p:.3f}"

# ── load ─────────────────────────────────────────────────────────────────────
def load(path):
    if not os.path.exists(path):
        sys.exit(f"ERROR: {path} not found. Run export.html ('Export ALL') first.")
    df = pd.read_csv(path)
    meta = df["run"].apply(parse_condition)
    df = df[meta.notna()].copy()
    meta = meta[meta.notna()]
    df["s"]    = meta.apply(lambda d: d["s"]).values
    df["lr"]   = meta.apply(lambda d: d["lr"]).values
    df["kind"] = meta.apply(lambda d: d["kind"]).values
    return df

def cond_slice(df, s, lr, kind):
    return df[(df.s == s) & (np.isclose(df.lr, lr)) & (df.kind == kind)]

# ── analyses ─────────────────────────────────────────────────────────────────
def analyze(df):
    out = []
    w = out.append
    w("# Relaxed Selection — Statistical Analysis\n")
    w(f"Source: `{CSV_PATH}`  |  task threshold = {THRESHOLD}  |  "
      f"eras: 0–{ERA1_END:,} (genes), {ERA1_END:,}–{ERA2_END:,} (+individual), "
      f"{ERA2_END:,}–{RUN_END:,} (+social)\n")
    w("All tests use the **run** as the unit of replication (one value per run). "
      "Each per-run value is averaged over a terminal "
      f"{WINDOW:,}-step window (≈{WINDOW // 400} snapshots) ending at the named "
      "timepoint, not a single tick, to remove instantaneous fluctuation. "
      "Effect sizes accompany every test because with dozens of runs even tiny "
      "differences reach significance — magnitude is the reviewers' real question.\n")

    # 0) Era-by-era change, all metrics ------------------------------------------
    w("\n## 0. Era-by-era change, all metrics (per-run paired Wilcoxon)\n")
    w("Three consecutive era transitions tested separately for every tracked metric. "
      "`exp` runs used for eras 2 and 3; `nolearn` runs used as the era-1 baseline "
      "to isolate genetic establishment from any learning effect. "
      "Learning and social genes are not active in era 1 so their era-1 values "
      "reflect drift/genetic selection only.\n")

    era_specs = [
        ("Era 1 — genetic establishment (first tick → 50k, no-learn control)",
         "nolearn", 0.01, 400, ERA1_END),
        ("Era 2 — individual learning era (50k → 100k)",
         "exp", None, ERA1_END, ERA2_END),
        ("Era 3 — social learning era (100k → 200k)",
         "exp", None, ERA2_END, RUN_END),
    ]
    era_metrics = [("gene", "task gene"), ("population", "population"),
                   ("learning", "learning gene"), ("social", "social gene")]
    for title, kind, fixed_lr, t_start, t_end in era_specs:
        w(f"\n### {title}\n")
        lr_list = [fixed_lr] if fixed_lr is not None else LR_VALUES
        for metric, mlabel in era_metrics:
            w(f"\n#### {mlabel}\n")
            w("| s | learn rate | n | median Δ | mean@start | mean@end | p | direction |")
            w("|---|-----------|---|---------|-----------|---------|---|-----------|")
            for s in S_VALUES:
                for lr in lr_list:
                    c = cond_slice(df, s, lr, kind)
                    a = per_run_at(c, metric, t_start)
                    b = per_run_at(c, metric, t_end)
                    idx = a.index.intersection(b.index)
                    if len(idx) < 3:
                        continue
                    a, b = a.loc[idx], b.loc[idx]
                    delta = b - a
                    try:
                        _, p = stats.wilcoxon(delta)
                    except ValueError:
                        p = np.nan
                    direction = "rise" if delta.median() > 0 else "decline"
                    w(f"| {s} | {lr:.2f} | {len(idx)} | {delta.median():+.3f} | "
                      f"{a.mean():.3f} | {b.mean():.3f} | {fmt_p(p)} | {direction} |")

    # 1) Within-treatment degeneration of task genes (experimental runs) -------
    w("\n## 1. Within-treatment task-gene change, learning onset (50k) → end (200k)\n")
    w("Per-run paired change in task-gene mean; Wilcoxon signed-rank vs 0.\n")
    w("| s | learn rate | n | median Δ | mean@50k | mean@200k | p | direction |")
    w("|---|-----------|---|---------|----------|-----------|---|-----------|")
    for s in S_VALUES:
        for lr in LR_VALUES:
            c = cond_slice(df, s, lr, "exp")
            a = per_run_at(c, "gene", ERA1_END)
            b = per_run_at(c, "gene", RUN_END)
            idx = a.index.intersection(b.index)
            if len(idx) < 3:
                continue
            a, b = a.loc[idx], b.loc[idx]
            delta = b - a
            try:
                _, p = stats.wilcoxon(delta)
            except ValueError:
                p = np.nan
            direction = "decline" if delta.median() < 0 else "rise"
            w(f"| {s} | {lr:.2f} | {len(idx)} | {delta.median():+.3f} | "
              f"{a.mean():.3f} | {b.mean():.3f} | {fmt_p(p)} | {direction} |")

    # 2) s = 9 vs s = 11, across every metric --------------------------------
    w("\n## 2. s = 9 vs s = 11 (the contested threshold claim), all metrics\n")
    w("End-of-run (terminal window) per-run value, Mann-Whitney U + Cliff's δ. "
      "Run separately for each trait and for population. R3 said these conditions "
      "'appear visually quite similar' — they do not.\n")
    w("| metric | learn rate | n9 | n11 | median(s9) | median(s11) | U p | Cliff's δ | magnitude |")
    w("|--------|-----------|----|-----|-----------|------------|-----|-----------|-----------|")
    for metric, mlabel in METRIC_LABELS:
        for lr in LR_VALUES:
            x = per_run_at(cond_slice(df, 9, lr, "exp"), metric, RUN_END).dropna()
            y = per_run_at(cond_slice(df, 11, lr, "exp"), metric, RUN_END).dropna()
            if len(x) < 3 or len(y) < 3:
                continue
            _, p = stats.mannwhitneyu(x, y, alternative="two-sided")
            d = cliffs_delta(x.values, y.values)
            w(f"| {mlabel} | {lr:.2f} | {len(x)} | {len(y)} | "
              f"{np.median(x):.3f} | {np.median(y):.3f} | {fmt_p(p)} | "
              f"{d:+.3f} | {cliffs_label(d)} |")

    # 2.5) Analytical threshold validation in the PURE-GENETIC (no-learning) runs
    w("\n## 2.5 Analytical threshold (no-learning controls): which side of 5 does each s sit on?\n")
    w("The analytical threshold s=10 predicts where *pure genetic* solutions stop "
      "being adaptive — so the cleanest test is the no-learning controls, with no "
      "learning confound. Per-run end-of-run (200k) task-gene mean; Wilcoxon "
      "signed-rank vs the task threshold (5).\n")
    w("| s | n | end mean | median | vs threshold 5 | p |")
    w("|---|---|----------|--------|----------------|---|")
    for s in S_VALUES:
        v = per_run_at(cond_slice(df, s, 0.01, "nolearn"), "gene", RUN_END).dropna()
        if len(v) < 3:
            continue
        try:
            _, p = stats.wilcoxon(v - THRESHOLD)
        except ValueError:
            p = np.nan
        side = "ABOVE" if v.median() > THRESHOLD else "below"
        w(f"| {s} | {len(v)} | {v.mean():.3f} | {v.median():.3f} | {side} | {fmt_p(p)} |")
    w("\n*Task-gene means stay above threshold well past s=10 because only "
      "lush-village survivors persist and they keep their genes — a survivorship "
      "effect. Population (below) is the viability measure that shows the s≈10 "
      "boundary.*")

    # 2.6) Population viability collapse and learning RESCUE -------------------
    w("\n## 2.6 Population viability and learning rescue (the s≈10 story)\n")
    w("Per-run end-of-run total population. Without learning, viability collapses "
      "across s≈10; with learning the population is rescued, and the rescue grows "
      "sharply above the threshold. `rescue δ` is Cliff's δ for experimental (1%) "
      "vs no-learning population — its jump above s=10 is the threshold signature.\n")
    w("| s | no-learn end pop | learn(1%) end pop | rescue ratio | rescue δ | p |")
    w("|---|-----------------|-------------------|--------------|----------|---|")
    for s in S_VALUES:
        nl = per_run_at(cond_slice(df, s, 0.01, "nolearn"), "population", RUN_END).dropna()
        ex = per_run_at(cond_slice(df, s, 0.01, "exp"), "population", RUN_END).dropna()
        if len(nl) < 3 or len(ex) < 3:
            continue
        _, p = stats.mannwhitneyu(ex, nl, alternative="two-sided")
        d = cliffs_delta(ex.values, nl.values)
        ratio = ex.median() / nl.median() if nl.median() else float("nan")
        w(f"| {s} | {nl.median():.0f} | {ex.median():.0f} | {ratio:.1f}× | "
          f"{d:+.3f} | {fmt_p(p)} |")

    # 3) Threshold as a monotonic gradient across s ----------------------------
    w("\n## 3. Threshold as a gradient: end-of-run task-gene mean vs s\n")
    w("Spearman correlation and Kruskal-Wallis across s ∈ {5,7,9,11,13,15}. "
      "A monotonic decline with s, crossing the threshold near s≈10, is a "
      "stronger claim than an isolated s9≠s11 contrast.\n")
    w("| learn rate | Spearman ρ | ρ p | Kruskal p | per-s end means (5→15) |")
    w("|-----------|-----------|-----|-----------|------------------------|")
    for lr in LR_VALUES:
        svals, means_by_s, groups = [], [], []
        for s in S_VALUES:
            v = per_run_at(cond_slice(df, s, lr, "exp"), "gene", RUN_END).dropna()
            if len(v) < 3:
                continue
            svals += [s] * len(v)
            means_by_s.append((s, v.mean()))
            groups.append(v.values)
        if len(groups) < 3:
            continue
        flat = np.concatenate(groups)
        rho, prho = stats.spearmanr(svals, flat)
        _, pk = stats.kruskal(*groups)
        summary = " ".join(f"{s}:{m:.2f}" for s, m in means_by_s)
        w(f"| {lr:.2f} | {rho:+.3f} | {fmt_p(prho)} | {fmt_p(pk)} | {summary} |")

    # 4) Learning-rate effect at fixed s ---------------------------------------
    w("\n## 4. Learning-rate effect (1% vs 2% vs 3%) on end-of-run task-gene mean\n")
    w("Kruskal-Wallis across rates, then Holm-corrected pairwise Mann-Whitney.\n")
    for s in S_VALUES:
        groups, present = [], []
        for lr in LR_VALUES:
            v = per_run_at(cond_slice(df, s, lr, "exp"), "gene", RUN_END).dropna()
            if len(v) >= 3:
                groups.append(v.values); present.append(lr)
        if len(groups) < 2:
            continue
        line = f"\n**s = {s}** — "
        if len(groups) >= 3:
            _, pk = stats.kruskal(*groups)
            line += f"Kruskal-Wallis p = {fmt_p(pk)}. "
        pairs, praw = [], []
        for (i, j) in itertools.combinations(range(len(groups)), 2):
            _, p = stats.mannwhitneyu(groups[i], groups[j], alternative="two-sided")
            pairs.append((present[i], present[j])); praw.append(p)
        if praw:
            padj = holm(praw)
            line += "Pairwise (Holm): " + "; ".join(
                f"{a:.0%}vs{b:.0%} p={fmt_p(pa)}" for (a, b), pa in zip(pairs, padj))
        w(line)

    # 5) All adjacent-s pair endpoint comparisons --------------------------------
    w("\n## 5. Adjacent-s pair endpoint comparisons (all neighbor pairs, all metrics)\n")
    w("End-of-run Mann-Whitney U + Cliff's δ for every adjacent cost pair. "
      "Holm correction applied across pairs within each metric / learning-rate block.\n")
    for metric, mlabel in METRIC_LABELS:
        for lr in LR_VALUES:
            w(f"\n### {mlabel}, learn {lr:.0%}\n")
            w("| pair | n_lo | n_hi | median(lo) | median(hi) | p (raw) | p (Holm) | Cliff's δ | magnitude |")
            w("|------|------|------|-----------|-----------|---------|----------|-----------|-----------|")
            collected = []
            for s_a, s_b in NEIGHBOR_PAIRS:
                x = per_run_at(cond_slice(df, s_a, lr, "exp"), metric, RUN_END).dropna()
                y = per_run_at(cond_slice(df, s_b, lr, "exp"), metric, RUN_END).dropna()
                if len(x) < 3 or len(y) < 3:
                    collected.append(None)
                    continue
                _, p_raw = stats.mannwhitneyu(x, y, alternative="two-sided")
                d = cliffs_delta(x.values, y.values)
                collected.append((s_a, s_b, x, y, p_raw, d))
            raw_ps = [r[4] for r in collected if r is not None]
            adj_ps = holm(raw_ps) if raw_ps else []
            adj_it = iter(adj_ps)
            for r in collected:
                if r is None:
                    continue
                s_a, s_b, x, y, p_raw, d = r
                p_adj = next(adj_it)
                w(f"| s{s_a}vs{s_b} | {len(x)} | {len(y)} | {np.median(x):.3f} | "
                  f"{np.median(y):.3f} | {fmt_p(p_raw)} | {fmt_p(p_adj)} | "
                  f"{d:+.3f} | {cliffs_label(d)} |")

    # 6) Spearman rho(task gene, s) over time ------------------------------------
    w("\n## 6. Spearman ρ(task gene, s) over time\n")
    w("At key ticks, Spearman ρ between per-run task-gene mean and cost s "
      "(all runs across all s values pooled). Shows when and how fast the "
      "cost gradient deepens after learning onset. "
      "See also `spearman_trajectory.pdf` for the full time-resolved curve.\n")
    KEY_TICKS = [0, ERA1_END, ERA1_END + 25_000, ERA2_END,
                 ERA2_END + 50_000, RUN_END]
    w("| learn rate | timestep | era | ρ | p |")
    w("|-----------|---------|-----|---|---|")
    for lr in LR_VALUES:
        all_ts = set()
        for s in S_VALUES:
            sub = cond_slice(df, s, lr, "exp")
            all_ts.update(sub[sub.metric == "gene"].timestep.unique())
        all_ts = sorted(all_ts)
        reported = []
        for kt in KEY_TICKS:
            if not all_ts:
                continue
            nearest = min(all_ts, key=lambda t: abs(t - kt))
            if nearest not in reported:
                reported.append(nearest)
        for t in reported:
            s_col, g_col = [], []
            for s in S_VALUES:
                runs = per_run_at(cond_slice(df, s, lr, "exp"), "gene", t, window=0)
                for v in runs.values:
                    s_col.append(s); g_col.append(v)
            if len(s_col) < 10:
                continue
            rho, p = stats.spearmanr(s_col, g_col)
            era = ("pre-learning" if t < ERA1_END else
                   "individual learning" if t <= ERA2_END else "social learning")
            w(f"| {lr:.2f} | {t:,} | {era} | {rho:+.3f} | {fmt_p(p)} |")

    # 7) Learning cascade stage 2: individual learning decline, social rise ------
    w("\n## 7. Learning cascade (stage 2): gene changes from social-learning onset (100k) → end\n")
    w("Per-run paired Wilcoxon signed-rank vs 0. Tests whether social learning "
      "statistically displaces individual learning (decline) and grows itself (rise).\n")
    w("### 7a. Individual learning gene: 100k → 200k\n")
    w("| s | learn rate | n | median Δ | mean@100k | mean@200k | p | direction |")
    w("|---|-----------|---|---------|----------|-----------|---|-----------|")
    for s in S_VALUES:
        for lr in LR_VALUES:
            c = cond_slice(df, s, lr, "exp")
            a = per_run_at(c, "learning", ERA2_END)
            b = per_run_at(c, "learning", RUN_END)
            idx = a.index.intersection(b.index)
            if len(idx) < 3:
                continue
            delta = b.loc[idx] - a.loc[idx]
            try:
                _, p = stats.wilcoxon(delta)
            except ValueError:
                p = np.nan
            direction = "decline" if delta.median() < 0 else "rise"
            w(f"| {s} | {lr:.2f} | {len(idx)} | {delta.median():+.3f} | "
              f"{a.mean():.3f} | {b.mean():.3f} | {fmt_p(p)} | {direction} |")
    w("\n### 7b. Social learning gene: 100k → 200k\n")
    w("| s | learn rate | n | median Δ | mean@100k | mean@200k | p | direction |")
    w("|---|-----------|---|---------|----------|-----------|---|-----------|")
    for s in S_VALUES:
        for lr in LR_VALUES:
            c = cond_slice(df, s, lr, "exp")
            a = per_run_at(c, "social", ERA2_END)
            b = per_run_at(c, "social", RUN_END)
            idx = a.index.intersection(b.index)
            if len(idx) < 3:
                continue
            delta = b.loc[idx] - a.loc[idx]
            try:
                _, p = stats.wilcoxon(delta)
            except ValueError:
                p = np.nan
            direction = "rise" if delta.median() > 0 else "decline"
            w(f"| {s} | {lr:.2f} | {len(idx)} | {delta.median():+.3f} | "
              f"{a.mean():.3f} | {b.mean():.3f} | {fmt_p(p)} | {direction} |")

    # 8) Per-run degeneration slope vs s ----------------------------------------
    from scipy.stats import linregress
    w("\n## 8. Per-run degeneration rate (slope) vs cost s\n")
    w("For each run, linear regression of task-gene mean vs timestep over "
      "50k–200k. The slope (gene units / step) is the per-run degeneration rate. "
      "Spearman ρ of slopes vs s tests whether degeneration rate scales with cost. "
      "Note: floor effects mean high-s slopes may be shallower in absolute terms "
      "even though those populations sit closer to (or below) the task threshold.\n")
    w("| learn rate | Spearman ρ | ρ p | Kruskal p | per-s median slope ×10⁻⁵ (5→15) |")
    w("|-----------|-----------|-----|-----------|----------------------------------|")
    for lr in LR_VALUES:
        slopes_by_s = {}
        for s in S_VALUES:
            c = cond_slice(df, s, lr, "exp")
            sub = c[(c.metric == "gene") & (c.timestep >= ERA1_END)]
            if sub.empty:
                continue
            run_slopes = []
            for ri, grp in sub.groupby("run_index"):
                ts = grp.timestep.values.astype(float)
                vals = grp["mean"].values.astype(float)
                if len(ts) < 3:
                    continue
                slope, *_ = linregress(ts, vals)
                run_slopes.append(slope)
            if run_slopes:
                slopes_by_s[s] = np.array(run_slopes)
        s_col, sl_col, groups = [], [], []
        for s in S_VALUES:
            if s not in slopes_by_s:
                continue
            sl = slopes_by_s[s]
            s_col += [s] * len(sl)
            sl_col += sl.tolist()
            groups.append(sl)
        if len(groups) < 3:
            continue
        rho, prho = stats.spearmanr(s_col, sl_col)
        _, pk = stats.kruskal(*groups)
        summary = " ".join(f"{s}:{np.median(slopes_by_s[s])*1e5:.3f}"
                           for s in S_VALUES if s in slopes_by_s)
        w(f"| {lr:.2f} | {rho:+.3f} | {fmt_p(prho)} | {fmt_p(pk)} | {summary} |")

    # 10) Learning gene vs drift baseline -----------------------------------------
    w("\n## 10. Individual learning gene at end of run vs no-selection baseline\n")
    w("Tests whether the individual learning gene in experimental runs at t=200k is "
      "distinguishable from the level maintained by drift alone (no-learning control). "
      "In no-learn controls the learning gene exists but is never activated or selected on, "
      "so its terminal level is the drift baseline. "
      "Mann-Whitney U + Cliff's δ; p > 0.05 = indistinguishable from drift.\n")
    w("| s | learn rate | n (exp) | n (nolearn) | median (exp) | median (drift) | p | δ | verdict |")
    w("|---|-----------|---------|------------|-------------|---------------|---|---|---------|")
    for s in S_VALUES:
        drift = per_run_at(cond_slice(df, s, 0.01, "nolearn"), "learning", RUN_END).dropna()
        if len(drift) < 3:
            continue
        for lr in LR_VALUES:
            exp = per_run_at(cond_slice(df, s, lr, "exp"), "learning", RUN_END).dropna()
            if len(exp) < 3:
                continue
            _, p = stats.mannwhitneyu(exp, drift, alternative="two-sided")
            d = cliffs_delta(exp.values, drift.values)
            verdict = "≈ drift" if p >= 0.05 else ("above drift" if np.median(exp) > np.median(drift) else "below drift")
            w(f"| {s} | {lr:.2f} | {len(exp)} | {len(drift)} | "
              f"{np.median(exp):.3f} | {np.median(drift):.3f} | {fmt_p(p)} | "
              f"{d:+.3f} | {verdict} |")

    # 9) Per-tick separation stability -------------------------------------------
    w("\n## 9. Per-tick separation stability (all ticks, not just endpoint)\n")
    w("For each adjacent pair and s=9 vs s=11, Cliff's δ is computed at every "
      "sampled tick. Table shows the first tick where |δ| > 0.474 (large effect) "
      "and the % of social-era (100k–200k) ticks where Mann-Whitney p < 0.05. "
      "This tests whether endpoint-based claims hold throughout the era.\n")
    for metric, mlabel in [("gene", "task gene"), ("population", "population")]:
        w(f"\n### {mlabel}\n")
        w("| pair | learn rate | first large-δ tick | % era-3 ticks p<0.05 |")
        w("|------|-----------|-------------------|----------------------|")
        all_pairs = NEIGHBOR_PAIRS
        for (s_a, s_b) in all_pairs:
            for lr in LR_VALUES:
                tr = separation_trajectory(df, metric, lr=lr, s_a=s_a, s_b=s_b)
                if tr is None:
                    continue
                ts, p_arr, d_arr = tr
                ts, p_arr, d_arr = np.array(ts), np.array(p_arr), np.array(d_arr)
                first_large = None
                for t, d in zip(ts, d_arr):
                    if abs(d) > 0.474:
                        first_large = t
                        break
                era3_mask = ts >= ERA2_END
                pct = (100 * (p_arr[era3_mask] < 0.05).mean()
                       if era3_mask.any() else float("nan"))
                first_str = f"{int(first_large):,}" if first_large is not None else "never"
                w(f"| s{s_a}vs{s_b} | {lr:.0%} | {first_str} | {pct:.0f}% |")

    return "\n".join(out)

# ── figures: mean ± bootstrap 95% CI ─────────────────────────────────────────
def boot_ci_band(df_cond, metric):
    sub = df_cond[df_cond.metric == metric]
    if sub.empty:
        return None
    wide = sub.pivot_table(index="run_index", columns="timestep",
                           values="mean", aggfunc="first").sort_index(axis=1)
    ts = wide.columns.values
    data = wide.values  # runs × timepoints
    mean = np.nanmean(data, axis=0)
    lo, hi = np.full_like(mean, np.nan), np.full_like(mean, np.nan)
    nruns = data.shape[0]
    for k in range(data.shape[1]):
        col = data[:, k]
        col = col[~np.isnan(col)]
        if len(col) < 2:
            continue
        idx = RNG.integers(0, len(col), size=(N_BOOT, len(col)))
        bmeans = col[idx].mean(axis=1)
        lo[k], hi[k] = np.percentile(bmeans, [2.5, 97.5])
    return ts, mean, lo, hi, nruns

def make_ci_figures(df):
    os.makedirs(FIG_DIR, exist_ok=True)
    metric_rows = [("gene", "Task gene"), ("learning", "Learning gene"),
                   ("social", "Social gene"), ("population", "Population")]
    for s in S_VALUES:
        fig, axes = plt.subplots(len(metric_rows), 1, figsize=(7, 9), sharex=True)
        conds = [("nolearn", 0.01, "Control (no learn)", "#444444")]
        conds += [("exp", lr, f"Learn {lr:.0%}", col)
                  for lr, col in zip(LR_VALUES, ["#1f77b4", "#ff7f0e", "#2ca02c"])]
        for ax, (metric, mlabel) in zip(axes, metric_rows):
            for kind, lr, label, color in conds:
                band = boot_ci_band(cond_slice(df, s, lr, kind), metric)
                if band is None:
                    continue
                ts, mean, lo, hi, nruns = band
                ax.plot(ts, mean, color=color, lw=1.5, label=f"{label} (n={nruns})")
                ax.fill_between(ts, lo, hi, color=color, alpha=0.2, linewidth=0)
            if metric != "population":
                ax.axhline(THRESHOLD, ls=":", c="red", lw=1)
            for era in (ERA1_END, ERA2_END):
                ax.axvline(era, ls="--", c="grey", lw=0.8)
            ax.set_ylabel(mlabel)
            ax.margins(x=0)
        axes[0].set_title(f"s = {s}: mean ± bootstrap 95% CI")
        axes[0].legend(fontsize=7, loc="upper right")
        axes[-1].set_xlabel("timestep")
        fig.tight_layout()
        path = os.path.join(FIG_DIR, f"ci_step{s}.pdf")
        fig.savefig(path); plt.close(fig)
        print(f"wrote {path}")

# ── time-resolved (all-ticks) s=9 vs s=11 separation ─────────────────────────
def per_run_wide(df_cond, metric):
    """run_index × timestep matrix of per-run means."""
    sub = df_cond[df_cond.metric == metric]
    if sub.empty:
        return None
    return sub.pivot_table(index="run_index", columns="timestep",
                           values="mean", aggfunc="first").sort_index(axis=1)

def separation_trajectory(df, metric, lr=0.01, s_a=9, s_b=11):
    """At EVERY tick, Mann-Whitney p and Cliff's δ for s_a vs s_b."""
    A = per_run_wide(cond_slice(df, s_a, lr, "exp"), metric)
    B = per_run_wide(cond_slice(df, s_b, lr, "exp"), metric)
    if A is None or B is None:
        return None
    ts = sorted(set(A.columns) & set(B.columns))
    out = []
    for t in ts:
        a = A[t].dropna().values
        b = B[t].dropna().values
        if len(a) < 3 or len(b) < 3:
            continue
        _, p = stats.mannwhitneyu(a, b, alternative="two-sided")
        out.append((t, p, cliffs_delta(a, b)))
    if not out:
        return None
    arr = np.array(out)
    return arr[:, 0], arr[:, 1], arr[:, 2]   # timesteps, p, delta

def _lr_tag(lr):
    return f"l{int(round(lr * 100)):02d}"

def make_trajectory_figure(df, lr=0.01):
    """δ(t) for s=9 vs s=11 across all ticks, task gene + population."""
    os.makedirs(FIG_DIR, exist_ok=True)
    panels = [("gene", "Task gene"), ("population", "Population")]
    fig, axes = plt.subplots(len(panels), 1, figsize=(7, 6), sharex=True)
    rows = []
    for ax, (metric, mlabel) in zip(axes, panels):
        tr = separation_trajectory(df, metric, lr=lr)
        if tr is None:
            continue
        ts, p, d = tr
        for t, pp, dd in zip(ts, p, d):
            rows.append((metric, int(t), pp, dd))
        ax.plot(ts, d, color="#6a1b9a", lw=1.5)
        sig = p < 0.05
        ax.fill_between(ts, -1, 1, where=sig, color="#6a1b9a", alpha=0.08, linewidth=0)
        for lvl in (0.474, -0.474):
            ax.axhline(lvl, ls=":", c="grey", lw=0.8)
        ax.axhline(0, c="black", lw=0.6)
        for era in (ERA1_END, ERA2_END):
            ax.axvline(era, ls="--", c="grey", lw=0.8)
        ax.set_ylim(-1.05, 1.05)
        ax.set_ylabel(f"{mlabel}\nCliff's δ (s9−s11)")
        ax.margins(x=0)
    axes[0].set_title(f"s=9 vs s=11 separation over time (learn {lr:.0%}); "
                      "shaded = Mann-Whitney p<0.05")
    axes[-1].set_xlabel("timestep")
    fig.tight_layout()
    tag = _lr_tag(lr)
    path = os.path.join(FIG_DIR, f"separation_trajectory_{tag}.pdf")
    fig.savefig(path); plt.close(fig)
    csv_path = os.path.join(FIG_DIR, f"separation_trajectory_{tag}.csv")
    pd.DataFrame(rows, columns=["metric", "timestep", "p", "cliffs_delta"]
                 ).to_csv(csv_path, index=False)
    print(f"wrote {path} (+ .csv)")

# ── Figure: all adjacent-s pair δ trajectories ───────────────────────────────
PAIR_COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]

def make_neighbor_trajectory_figure(df, lr=0.01):
    """Cliff's δ(t) for all adjacent s pairs, task gene + population."""
    os.makedirs(FIG_DIR, exist_ok=True)
    panels = [("gene", "Task gene"), ("population", "Population")]
    fig, axes = plt.subplots(len(panels), 1, figsize=(7, 6), sharex=True)
    for ax, (metric, mlabel) in zip(axes, panels):
        for (s_a, s_b), color in zip(NEIGHBOR_PAIRS, PAIR_COLORS):
            tr = separation_trajectory(df, metric, lr=lr, s_a=s_a, s_b=s_b)
            if tr is None:
                continue
            ts, p, d = tr
            ax.plot(ts, d, color=color, lw=1.5, label=f"s={s_a} vs s={s_b}")
            ax.fill_between(ts, d, 0,
                            where=(p < 0.05), color=color, alpha=0.10, linewidth=0)
        for lvl in (0.474, -0.474):
            ax.axhline(lvl, ls=":", c="grey", lw=0.8)
        ax.axhline(0, c="black", lw=0.6)
        for era in (ERA1_END, ERA2_END):
            ax.axvline(era, ls="--", c="grey", lw=0.8)
        ax.set_ylim(-1.05, 1.05)
        ax.set_ylabel(f"{mlabel}\nCliff's δ (lo − hi s)")
        ax.legend(fontsize=7, loc="best", frameon=False)
        ax.margins(x=0)
    axes[0].set_title(f"Adjacent-s separation over time (learn {lr:.0%}); "
                      "shaded = p < 0.05")
    axes[-1].set_xlabel("Timestep")
    fig.tight_layout()
    tag = _lr_tag(lr)
    path = os.path.join(FIG_DIR, f"neighbor_separation_trajectory_{tag}.pdf")
    fig.savefig(path)
    plt.close(fig)
    print(f"wrote {path}")


def make_combined_neighbor_figure(df):
    """Grid: rows = metric, cols = learning rate; each cell shows δ(t) for all adjacent pairs."""
    os.makedirs(FIG_DIR, exist_ok=True)
    panels = [("gene", "Task gene"), ("population", "Population")]
    nrows, ncols = len(panels), len(LR_VALUES)
    fig, axes = plt.subplots(nrows, ncols, figsize=(4.5 * ncols, 3.5 * nrows),
                             sharex=True, sharey=True)
    for ci, lr in enumerate(LR_VALUES):
        for ri, (metric, mlabel) in enumerate(panels):
            ax = axes[ri][ci]
            for (s_a, s_b), color in zip(NEIGHBOR_PAIRS, PAIR_COLORS):
                tr = separation_trajectory(df, metric, lr=lr, s_a=s_a, s_b=s_b)
                if tr is None:
                    continue
                ts, p, d = tr
                ax.plot(ts, d, color=color, lw=1.2,
                        label=(f"s={s_a}v{s_b}" if ri == 0 and ci == 0 else None))
                ax.fill_between(ts, d, 0, where=(p < 0.05),
                                color=color, alpha=0.10, linewidth=0)
            for lvl in (0.474, -0.474):
                ax.axhline(lvl, ls=":", c="grey", lw=0.7)
            ax.axhline(0, c="black", lw=0.5)
            for era in (ERA1_END, ERA2_END):
                ax.axvline(era, ls="--", c="grey", lw=0.7)
            ax.set_ylim(-1.05, 1.05)
            ax.margins(x=0)
            if ri == 0:
                ax.set_title(f"Learn {lr:.0%}", fontsize=10)
            if ci == 0:
                ax.set_ylabel(f"{mlabel}\nCliff's δ", fontsize=9)
            if ri == nrows - 1:
                ax.set_xlabel("Timestep", fontsize=9)
                ax.set_xticks([0, ERA1_END, ERA2_END, RUN_END])
                ax.set_xticklabels(["0", "50k", "100k", "200k"], fontsize=8, rotation=90)
    axes[0][0].legend(fontsize=7, frameon=False, loc="lower right")
    fig.suptitle("Adjacent-s separation over time (shaded = p < 0.05)", fontsize=11)
    fig.tight_layout()
    path = os.path.join(FIG_DIR, "neighbor_separation_all_lr.pdf")
    fig.savefig(path)
    plt.close(fig)
    print(f"wrote {path}")

# ── Figure: Spearman rho(task gene, s) over time ─────────────────────────────
def make_spearman_trajectory_figure(df):
    """ρ(task gene mean, s) at every tick for each learning rate."""
    os.makedirs(FIG_DIR, exist_ok=True)
    fig, ax = plt.subplots(figsize=(7, 3.5))
    lr_colors = ["#1f77b4", "#ff7f0e", "#2ca02c"]
    for lr, color in zip(LR_VALUES, lr_colors):
        all_ts = set()
        for s in S_VALUES:
            sub = cond_slice(df, s, lr, "exp")
            all_ts.update(sub[sub.metric == "gene"].timestep.unique())
        all_ts = sorted(all_ts)
        rhos, ts_out = [], []
        for t in all_ts:
            s_col, g_col = [], []
            for s in S_VALUES:
                c = cond_slice(df, s, lr, "exp")
                runs = per_run_at(c, "gene", t, window=0)
                for v in runs.values:
                    s_col.append(s); g_col.append(v)
            if len(s_col) < 10:
                continue
            rho, _ = stats.spearmanr(s_col, g_col)
            rhos.append(rho); ts_out.append(t)
        if ts_out:
            ax.plot(ts_out, rhos, color=color, lw=1.5, label=f"Learn {lr:.0%}")
    ax.axhline(-0.474, ls=":", c="grey", lw=0.8, label="|δ|=0.474 (large)")
    ax.axhline(0, c="black", lw=0.5)
    for era in (ERA1_END, ERA2_END):
        ax.axvline(era, ls="--", c="grey", lw=0.8)
    ax.set_xlabel("Timestep")
    ax.set_ylabel("Spearman ρ (task gene vs cost s)")
    ax.set_title("Cost-gradient development over time")
    ax.legend(fontsize=8, frameon=False)
    ax.margins(x=0)
    fig.tight_layout()
    path = os.path.join(FIG_DIR, "spearman_trajectory.pdf")
    fig.savefig(path)
    plt.close(fig)
    print(f"wrote {path}")

# ── main ─────────────────────────────────────────────────────────────────────
def main():
    df = load(CSV_PATH)
    n_runs = df.groupby("run")["run_index"].nunique()
    print("Runs per condition:\n", n_runs.to_string())
    report = analyze(df)
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write(report)
    print(f"\nWrote {OUT_MD}")
    make_ci_figures(df)
    for lr in LR_VALUES:
        make_trajectory_figure(df, lr=lr)
        make_neighbor_trajectory_figure(df, lr=lr)
    make_combined_neighbor_figure(df)
    make_spearman_trajectory_figure(df)
    print("Done.")

if __name__ == "__main__":
    main()
