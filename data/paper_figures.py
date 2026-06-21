#!/usr/bin/env python3
"""
Publication comparison figures for the Relaxed Selection paper.

These are the shared-axis views the per-condition heatmaps structurally cannot
be: they put COST on a common axis so the eye can measure the gaps the heatmaps
split across separate pages. Reads the per-run export (biodegen_perrun_all.csv)
and reuses the analysis helpers in stats_analysis.py.

Style matches the heatmap scripts (control.py / steps.py): Times New Roman,
the white->blue->rainbow colormap echoed for the cost gradient, steelblue,
thin 0.8pt spines. All bands show RUN-TO-RUN spread (IQR across runs), not a
hairline CI of the mean.

    python paper_figures.py [biodegen_perrun_all.csv]

Produces (in ./figs):
    fig_threshold_rescue.pdf   - end-state population & task gene vs cost s
    fig_s9_vs_s11.pdf          - per-run terminal values, the contested pair
    fig_gradient_over_time.pdf - all six costs overlaid on one time axis
"""

import sys
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.colors as colors

import stats_analysis as sa   # load(), cond_slice(), per_run_at(), per_run_wide(), constants

# ── style (matched to control.py / steps.py) ────────────────────────────────
plt.rcParams["font.family"] = "Times New Roman"
plt.rcParams["font.size"]   = 10

def createColorMap():
    bottom = plt.get_cmap("gist_rainbow_r")
    top    = plt.get_cmap("bwr_r")
    newcolors = np.vstack((top(np.linspace(0.5, 1, 24)),
                           bottom(np.linspace(0.24, 1, 232))))
    return colors.ListedColormap(newcolors, "newMap")

CSV     = sys.argv[1] if len(sys.argv) > 1 else "biodegen_perrun_all.csv"
OUT     = "figs"
S       = sa.S_VALUES
LR      = sa.LR_VALUES
THRESH  = sa.THRESHOLD
ERA1, ERA2, END = sa.ERA1_END, sa.ERA2_END, sa.RUN_END

# cost colours sampled from the same rainbow the heatmaps use
_rain = plt.get_cmap("gist_rainbow_r")
SCOLOR = {s: _rain(0.24 + 0.76 * i / (len(S) - 1)) for i, s in enumerate(S)}
LRCOLOR = {0.01: "#1f77b4", 0.02: "#d97706", 0.03: "#2ca02c"}

def thin_spines(ax):
    for sp in ax.spines.values():
        sp.set_linewidth(0.8)

# ── shared helpers ───────────────────────────────────────────────────────────
def term_by_s(df, kind, lr, metric):
    """Per-s end-state median and IQR across runs."""
    xs, med, lo, hi = [], [], [], []
    for s in S:
        v = sa.per_run_at(sa.cond_slice(df, s, lr, kind), metric, END).dropna()
        if len(v) < 3:
            continue
        xs.append(s); med.append(v.median())
        lo.append(v.quantile(0.25)); hi.append(v.quantile(0.75))
    return map(np.array, (xs, med, lo, hi))

# ── Figure 1: threshold & rescue ─────────────────────────────────────────────
def fig_threshold_rescue(df):
    fig, (axp, axg) = plt.subplots(2, 1, figsize=(5.5, 5.2), sharex=True)

    for ax, metric in [(axp, "population"), (axg, "gene")]:
        # no-learning control (the pure-genetic baseline)
        xs, med, lo, hi = term_by_s(df, "nolearn", 0.01, metric)
        if len(xs):
            ax.fill_between(xs, lo, hi, color="0.6", alpha=0.30, linewidth=0)
            ax.plot(xs, med, color="black", marker="o", ms=4, lw=1.4,
                    label="No learning")
        # with learning, each rate
        for lr in LR:
            xs, med, lo, hi = term_by_s(df, "exp", lr, metric)
            if not len(xs):
                continue
            ax.fill_between(xs, lo, hi, color=LRCOLOR[lr], alpha=0.12, linewidth=0)
            ax.plot(xs, med, color=LRCOLOR[lr], marker="s", ms=3.5, lw=1.2,
                    label=f"Learn {lr:.0%}")
        thin_spines(ax)
        ax.margins(x=0.04)

    axp.set_ylabel("End population")
    axp.legend(fontsize=7, frameon=False, loc="upper right")
    axp.set_title("Genetic viability collapses across s≈10; learning rescues it",
                  fontsize=9)
    axg.axhline(THRESH, ls=":", c="red", lw=1)
    axg.text(S[-1], THRESH + 0.1, "task threshold", color="red", fontsize=6,
             ha="right", va="bottom")
    axg.set_ylabel("End task-gene mean")
    axg.set_xlabel("Cost per gene  (s)")
    axg.set_xticks(S)
    fig.tight_layout()
    _save(fig, "fig_threshold_rescue.pdf")

# ── Figure 2: s = 9 vs s = 11, the contested pair ────────────────────────────
def fig_s9_vs_s11(df):
    rng = np.random.default_rng(7)
    fig, axes = plt.subplots(1, 2, figsize=(6.2, 3.4))
    panels = [("gene", "Task-gene mean (end)"), ("population", "Population (end)")]
    for ax, (metric, ylab) in zip(axes, panels):
        for xi, s in enumerate([9, 11]):
            pooled = []
            for lr in LR:
                v = sa.per_run_at(sa.cond_slice(df, s, lr, "exp"), metric, END).dropna().values
                if not len(v):
                    continue
                jit = rng.normal(0, 0.05, len(v))
                ax.scatter(np.full(len(v), xi) + jit, v, s=9,
                           color=LRCOLOR[lr], alpha=0.55, linewidths=0,
                           label=(f"Learn {lr:.0%}" if xi == 0 else None))
                pooled += list(v)
            ax.hlines(np.median(pooled), xi - 0.22, xi + 0.22,
                      color="black", lw=1.6, zorder=5)
        ax.set_xticks([0, 1]); ax.set_xticklabels(["s = 9", "s = 11"])
        ax.set_xlim(-0.5, 1.5)
        ax.set_ylabel(ylab)
        thin_spines(ax)
        if metric == "gene":
            ax.axhline(THRESH, ls=":", c="red", lw=1)
    axes[0].legend(fontsize=7, frameon=False, loc="lower left")
    fig.suptitle("Every s=9 run separates from every s=11 run (each point = one run)",
                 fontsize=9)
    fig.tight_layout()
    _save(fig, "fig_s9_vs_s11.pdf")

# ── Figure: the cascade (three trait means over full time) ───────────────────
TRAIT_LINES = [("gene", "Task gene", "#AA0000"),        # match the old tickets colours
               ("learning", "Individual learning", "#AA00AA"),
               ("social", "Social learning", "#0000AA")]

def fig_cascade(df, costs=None, lrs=None, include_control=False):
    """Grid: rows = learning rate, cols = cost; each cell overlays the 3-trait relay."""
    costs = costs or S
    lrs = list(lrs or LR)
    # (kind, lr, label, era_lines)
    rows = ([("nolearn", 0.01, "No learning", (ERA1, ERA2))] if include_control else []) + \
           [("exp",      lr,   f"Learn {lr:.0%}", (ERA1, ERA2)) for lr in lrs]
    nr, nc = len(rows), len(costs)
    fig, axes = plt.subplots(nr, nc, figsize=(7.0, 1.15 * nr + 0.7),
                             sharex=True, sharey=True)
    axes = np.atleast_2d(axes)
    for r, (kind, lr, rlabel, era_lines) in enumerate(rows):
        for c, s in enumerate(costs):
            ax = axes[r][c]
            for metric, label, col in TRAIT_LINES:
                wide = sa.per_run_wide(sa.cond_slice(df, s, lr, kind), metric)
                if wide is None:
                    continue
                ts = wide.columns.values
                med = wide.median(axis=0).values
                lo = wide.quantile(0.25, axis=0).values
                hi = wide.quantile(0.75, axis=0).values
                ax.fill_between(ts, lo, hi, color=col, alpha=0.40, linewidth=0)
                ax.plot(ts, med, color=col, lw=0.8,
                        label=(label if (r == 0 and c == 0) else None))
            ax.axhline(THRESH, ls=":", c="0.5", lw=0.6)
            for era in era_lines:
                ax.axvline(era, ls="--", c="0.6", lw=0.6)
            ax.margins(x=0); thin_spines(ax)
            if r == 0:
                ax.set_title(f"s = {s}", fontsize=10)
            if c == 0:
                ax.set_ylabel(rlabel, fontsize=10)
                ax.set_ylim(0, 12)
                ax.set_yticks([0, 4, 8, 12])
            if r == nr - 1:
                ax.set_xticks([0, ERA1, ERA2, END])
                ax.set_xticklabels(["0", "50k", "100k", "200k"], fontsize=10, rotation=90)
    fig.legend(loc="upper center", bbox_to_anchor=(0.5, 1.0),
               ncol=3, fontsize=10, frameon=False)
    fig.supxlabel("Time step", fontsize=10, y=0.015)
    fig.tight_layout(pad=0.2, rect=[0, 0.02, 1, 0.93])
    _save(fig, "fig_cascade.pdf")

# ── Figure 5: population trajectories, all costs, no-learn vs learn ───────────
def _four_panel_specs():
    """control (no learning) + the three learning rates."""
    return [("nolearn", 0.01, "No learning",     (ERA1, ERA2))] + \
           [("exp",     lr,   f"Learn {lr:.0%}", (ERA1, ERA2)) for lr in LR]

def _trajectory_grid(df, metric, ylabel, fname, threshold=False):
    specs = _four_panel_specs()
    fig, axes = plt.subplots(1, len(specs), figsize=(10.0, 2.9), sharey=True)
    for ax, (kind, lr, title, era_lines) in zip(axes, specs):
        for s in S:
            wide = sa.per_run_wide(sa.cond_slice(df, s, lr, kind), metric)
            if wide is None:
                continue
            ts = wide.columns.values
            med = wide.median(axis=0).values
            lo = wide.quantile(0.25, axis=0).values
            hi = wide.quantile(0.75, axis=0).values
            ax.fill_between(ts, lo, hi, color=SCOLOR[s], alpha=0.10, linewidth=0)
            ax.plot(ts, med, color=SCOLOR[s], lw=1.1, label=f"s={s}")
        if threshold:
            ax.axhline(THRESH, ls=":", c="0.4", lw=0.8)
        for era in era_lines:
            ax.axvline(era, ls="--", c="0.5", lw=0.8)
        ax.set_title(title, fontsize=9)
        ax.set_xlabel("Time step")
        ax.set_xticks([0, ERA1, ERA2, END])
        ax.set_xticklabels(["0", "50k", "100k", "200k"], fontsize=6.5, rotation=90)
        ax.margins(x=0)
        thin_spines(ax)
    axes[0].set_ylabel(ylabel)
    axes[-1].legend(fontsize=6.5, frameon=False, loc="best", title="cost")
    fig.tight_layout()
    _save(fig, fname)

def fig_population_trajectories(df):
    _trajectory_grid(df, "population", "Population (median of runs)",
                     "fig_population_trajectories.pdf")

def fig_gradient_over_time(df):
    _trajectory_grid(df, "gene", "Task-gene mean (median of runs)",
                     "fig_gradient_over_time.pdf", threshold=True)

# ── Figure: 4×4 combined trajectories (all metrics × all conditions) ─────────
_METRIC_ROWS = [
    ("population", "Population",  False),
    ("gene",       "Task gene",   True),   # threshold line at 5
]

def fig_combined_trajectories(df):
    """2 rows (metrics) × 4 cols (no-learn + 3 LR), all 6 costs per cell."""
    specs = _four_panel_specs()
    nrows, ncols = len(_METRIC_ROWS), len(specs)
    fig, axes = plt.subplots(nrows, ncols,
                             figsize=(7.0, 2.2 * nrows + 0.3),
                             sharex=True, sharey="row")
    for ri, (metric, ylabel, use_thresh) in enumerate(_METRIC_ROWS):
        for ci, (kind, lr, title, era_lines) in enumerate(specs):
            ax = axes[ri][ci]
            for s in S:
                wide = sa.per_run_wide(sa.cond_slice(df, s, lr, kind), metric)
                if wide is None:
                    continue
                ts = wide.columns.values
                med = wide.median(axis=0).values
                lo  = wide.quantile(0.25, axis=0).values
                hi  = wide.quantile(0.75, axis=0).values
                ax.fill_between(ts, lo, hi, color=SCOLOR[s], alpha=0.40, linewidth=0)
                ax.plot(ts, med, color=SCOLOR[s], lw=1.1,
                        label=(f"s={s}" if (ri == nrows - 1 and ci == 0) else None))
            if use_thresh:
                ax.axhline(THRESH, ls=":", c="0.4", lw=0.8)
            for era in era_lines:
                ax.axvline(era, ls="--", c="0.5", lw=0.8)
            ax.margins(x=0)
            thin_spines(ax)
            if ri == 0:
                ax.set_title(title, fontsize=10)
            if ci == 0:
                ax.set_ylabel(ylabel, fontsize=10)
            if ri == nrows - 1:
                ax.set_xticks([0, ERA1, ERA2, END])
                ax.set_xticklabels(["0", "50k", "100k", "200k"], fontsize=10, rotation=90)
    axes[-1][0].legend(fontsize=8, frameon=False, loc="lower right",
                       title="cost", title_fontsize=8)
    fig.supxlabel("Time step", fontsize=10, y=0.015)
    fig.tight_layout(pad=0.2, rect=[0, 0.02, 1, 0.97])
    _save(fig, "fig_combined_trajectories.pdf")

# ── Figure: nosocial control (no-learn baseline + 3 nosocial rates) ─────────
def fig_nosocial_trajectories(df):
    """2 rows (population, task gene) × 4 cols (no-learn + nosocial l01/l02/l03)."""
    specs = [("nolearn",  0.01, "No learning",       (ERA1, ERA2))] + \
            [("nosocial", lr,   f"No social {lr:.0%}", (ERA1,)) for lr in LR]
    metric_rows = [
        ("population", "Population",     False),
        ("gene",       "Task-gene mean", True),
    ]
    nrows, ncols = len(metric_rows), len(specs)
    fig, axes = plt.subplots(nrows, ncols,
                             figsize=(7.0, 2.2 * nrows + 0.3),
                             sharex=True, sharey="row")
    for ri, (metric, ylabel, use_thresh) in enumerate(metric_rows):
        for ci, (kind, lr, title, era_lines) in enumerate(specs):
            ax = axes[ri][ci]
            for s in S:
                wide = sa.per_run_wide(sa.cond_slice(df, s, lr, kind), metric)
                if wide is None:
                    continue
                ts = wide.columns.values
                med = wide.median(axis=0).values
                lo  = wide.quantile(0.25, axis=0).values
                hi  = wide.quantile(0.75, axis=0).values
                ax.fill_between(ts, lo, hi, color=SCOLOR[s], alpha=0.40, linewidth=0)
                ax.plot(ts, med, color=SCOLOR[s], lw=1.1,
                        label=(f"s={s}" if (ri == nrows - 1 and ci == 0) else None))
            if use_thresh:
                ax.axhline(THRESH, ls=":", c="0.4", lw=0.8)
            for era in era_lines:
                ax.axvline(era, ls="--", c="0.5", lw=0.8)
            ax.margins(x=0)
            thin_spines(ax)
            if ri == 0:
                ax.set_title(title, fontsize=10)
            if ci == 0:
                ax.set_ylabel(ylabel, fontsize=10)
            if ri == nrows - 1:
                ax.set_xticks([0, ERA1, ERA2, END])
                ax.set_xticklabels(["0", "50k", "100k", "200k"], fontsize=10, rotation=90)
    axes[-1][0].legend(fontsize=8, frameon=False, loc="lower right",
                       title="cost", title_fontsize=8)
    fig.supxlabel("Time step", fontsize=10, y=0.015)
    fig.tight_layout(pad=0.2, rect=[0, 0.02, 1, 0.97])
    _save(fig, "fig_nosocial_trajectories.pdf")

# ── io ───────────────────────────────────────────────────────────────────────
def _save(fig, name):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name)
    fig.savefig(path, bbox_inches="tight"); plt.close(fig)
    print(f"wrote {path}")

def main():
    df = sa.load(CSV)
    fig_cascade(df, include_control=True)
    fig_combined_trajectories(df)
    fig_nosocial_trajectories(df)
    fig_population_trajectories(df)
    fig_threshold_rescue(df)
    fig_s9_vs_s11(df)
    fig_gradient_over_time(df)
    print("Done.")

if __name__ == "__main__":
    main()
