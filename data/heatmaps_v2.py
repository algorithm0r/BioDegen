#!/usr/bin/env python3
"""
Tightened heatmap figures — a rework of control.py / steps.py addressing the
figure critiques, without touching the originals.

Changes vs the originals:
  * y-axis cropped to the populated range (the top ~60% was empty white space)
  * columns relabelled "Cost s = N" instead of "Step N"   (R2: "why step?")
  * task threshold drawn DOTTED, era-onset lines DASHED + labelled
    "learning"/"social"                                    (R2: dashed-line confusion)
  * caption should state the white line is the MEAN        (R1: mean or median?)

Reuses the aggregated bucket CSVs in ./paper data (same source as the originals)
and the same white->blue->rainbow colormap.

    python heatmaps_v2.py control       # 6 costs, no-learning (control_histograms_v2.pdf)
    python heatmaps_v2.py 9             # cost s=9, control + 3 learn rates (step9_comparison_v2.pdf)
"""

import sys
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.colors as colors

# ── config ───────────────────────────────────────────────────────────────────
DATA_DIR        = "./paper data"
NUM_BUCKETS     = 20
NUM_TIMESLICES  = 500
TRAIT_THRESHOLD = 5
YMAX_BUCKET     = 8        # crop display to values 0..8 (kills the empty top)
STEPS           = [5, 7, 9, 11, 13, 15]

HIST_ROWS = [("gene_hist", "GeneTickets", "Task Gene"),
             ("learning_hist", "LearningTickets", "Learning Gene"),
             ("social_hist", "SocialTickets", "Social Gene")]

plt.rcParams["font.family"] = "Times New Roman"
plt.rcParams["font.size"]   = 9

# ── helpers copied verbatim from control.py/steps.py (so the look matches) ────
def createColorMap():
    bottom = plt.get_cmap("gist_rainbow_r")
    top    = plt.get_cmap("bwr_r")
    newcolors = np.vstack((top(np.linspace(0.5, 1, 24)),
                           bottom(np.linspace(0.24, 1, 232))))
    return colors.ListedColormap(newcolors, "newMap")

c_map = createColorMap()

def make_filename(step, suffix, condition):
    if condition == "control":
        midfix = "(no_learn_social_" if step in [5, 7, 9] else "(no_learn_socia_"
        return os.path.join(DATA_DIR, f"Step_{step}_l01M15_{midfix}{suffix}.csv")
    return os.path.join(DATA_DIR, f"Step_{step}_{condition}M15_{suffix}.csv")

def read_histogram(filepath):
    histogram = [[] for _ in range(NUM_BUCKETS)]
    with open(filepath, "r") as f:
        for line_num, line in enumerate(f):
            if line_num >= NUM_TIMESLICES:
                break
            try:
                nums = [float(x) for x in line.strip().split(",")]
                for j in range(NUM_BUCKETS):
                    histogram[NUM_BUCKETS - 1 - j].append(nums[j])
            except (ValueError, IndexError):
                pass
    return np.array(histogram)

def read_linegraph(filepath):
    df = pd.read_csv(filepath, sep="\t")
    if len(df.columns) == 1:
        df = pd.read_csv(filepath, sep=",")
    df.columns = [c.strip() for c in df.columns]
    return df

# ── column specification for the two modes ────────────────────────────────────
def columns_for(mode):
    """Return list of (step, condition, label, draw_era)."""
    if mode == "control":
        return [(s, "control", f"Cost s = {s}", False) for s in STEPS]
    step = int(mode)
    specs = [(step, "control", "No learning", False)]
    for cond, lr in [("l01", "1%"), ("l02", "2%"), ("l03", "3%")]:
        specs.append((step, cond, f"Learn {lr}", True))
    return specs

# ── figure ────────────────────────────────────────────────────────────────────
def build(mode):
    cols = columns_for(mode)
    n_cols = len(cols)
    n_rows = len(HIST_ROWS) + 1

    fig_w = 7.0
    height_ratios = [0.55] + [1.0] * len(HIST_ROWS)
    fig_h = fig_w * (0.55 + len(HIST_ROWS)) / 6 * 1.15
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(fig_w, fig_h),
                             gridspec_kw={"height_ratios": height_ratios})
    fig.subplots_adjust(wspace=0.05, hspace=0.20, left=0.10, right=0.86,
                        top=0.92, bottom=0.11)
    cbar_ax = fig.add_axes([0.88, 0.11, 0.018, 0.92 - 0.11])

    # crop view to values 0..YMAX_BUCKET (data-y = (NUM_BUCKETS-1) - value)
    y_top = (NUM_BUCKETS - 1) - YMAX_BUCKET - 0.5
    y_bot = NUM_BUCKETS - 0.5
    threshold_y = (NUM_BUCKETS - 1 - TRAIT_THRESHOLD) + 0.5

    # ROW 0: population
    pop_T = None
    era_labeled = False
    for ci, (step, cond, label, draw_era) in enumerate(cols):
        ax = axes[0][ci]
        try:
            lg = read_linegraph(make_filename(step, "linegraphs", cond))
            pop = lg["Population"].values
            pop_T = len(pop)
            ax.plot(np.arange(pop_T), pop, color="steelblue", lw=1.2)
        except (FileNotFoundError, KeyError):
            ax.text(0.5, 0.5, "n/a", ha="center", va="center", transform=ax.transAxes,
                    color="red", fontsize=7)
        ax.set_title(label, fontsize=9.5, pad=3)
        ax.set_xticks([])
        ax.set_ylim(0, 10000)
        if ci == 0:
            ax.set_ylabel("Population", fontsize=9, labelpad=2)
            ax.set_yticks([0, 5000, 10000]); ax.set_yticklabels(["0", "5k", "10k"], fontsize=8)
        else:
            ax.set_yticks([])
        if pop_T:
            ax.set_xlim(0, pop_T - 1)
        if draw_era and pop_T:
            for x, name in [(pop_T // 4, "learning"), (pop_T // 2, "social")]:
                ax.axvline(x, color="black", lw=0.8, ls="--", alpha=0.8)
                if not era_labeled:                      # label once, inside the panel
                    ax.text(x - pop_T * 0.02, 9400, name, fontsize=6, rotation=90,
                            ha="right", va="top", color="black")
            era_labeled = True
        for sp in ax.spines.values():
            sp.set_linewidth(0.8)

    # ROWS 1..: heatmaps
    for ri, (suffix, line_col, row_label) in enumerate(HIST_ROWS):
        pr = ri + 1
        is_bottom = (pr == n_rows - 1)
        for ci, (step, cond, label, draw_era) in enumerate(cols):
            ax = axes[pr][ci]
            try:
                hist = read_histogram(make_filename(step, suffix, cond))
            except FileNotFoundError:
                ax.text(0.5, 0.5, "n/a", ha="center", va="center",
                        transform=ax.transAxes, color="red", fontsize=7)
                continue
            T = hist.shape[1]
            col_sums = hist.sum(axis=0); col_sums[col_sums == 0] = 1
            ax.imshow(hist / col_sums, aspect="auto", interpolation="nearest",
                      cmap=c_map, vmin=0, vmax=1, origin="upper",
                      extent=[0, T - 1, NUM_BUCKETS - 0.5, -0.5])

            if suffix == "gene_hist":                       # threshold: DOTTED
                ax.axhline(threshold_y, color="white", lw=1.0, ls=(0, (1, 1.2)), alpha=0.95)
            if draw_era:                                    # eras: DASHED
                for x in (T // 4, T // 2):
                    ax.axvline(x, color="black", lw=0.8, ls="--", alpha=0.85)

            try:                                            # mean line (white solid)
                lg = read_linegraph(make_filename(step, "linegraphs", cond))
                if line_col in lg.columns:
                    mv = lg[line_col].values[:T]
                    y_line = (NUM_BUCKETS - 1) - np.clip(mv, 0, NUM_BUCKETS - 1)
                    ax.plot(np.linspace(0, T - 1, len(y_line)), y_line,
                            color="white", lw=1.2, alpha=0.9)
            except (FileNotFoundError, KeyError):
                pass

            ax.set_ylim(y_bot, y_top)                        # crop empty top
            if is_bottom:
                ax.set_xticks([T // 4, T // 2, 3 * T // 4, T - 1])
                ax.set_xticklabels(["50k", "100k", "150k", "200k"], fontsize=8, rotation=90)
            else:
                ax.set_xticks([])
            if ci == 0:
                ax.set_yticks([NUM_BUCKETS - 1, (NUM_BUCKETS - 1) - YMAX_BUCKET])
                ax.set_yticklabels(["0", str(YMAX_BUCKET)], fontsize=8)
                ax.set_ylabel(row_label, fontsize=9, labelpad=2)
            else:
                ax.set_yticks([])
            for sp in ax.spines.values():
                sp.set_linewidth(0.8)

    # colorbar
    sm = plt.cm.ScalarMappable(cmap=c_map, norm=plt.Normalize(0, 1)); sm.set_array([])
    cbar = fig.colorbar(sm, cax=cbar_ax)
    cbar.set_label("% of population", fontsize=8, labelpad=4)
    cbar.set_ticks(np.linspace(0, 1, 6))
    cbar.set_ticklabels([f"{int(v*100)}%" for v in np.linspace(0, 1, 6)], fontsize=7)

    fig.text(0.47, 0.01, "Time Step", ha="center", fontsize=9)
    name = "control_histograms_v2.pdf" if mode == "control" else f"step{mode}_comparison_v2.pdf"
    out = os.path.join("figs", name)
    os.makedirs("figs", exist_ok=True)
    fig.savefig(out, bbox_inches="tight"); plt.close(fig)
    print(f"wrote {out}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python heatmaps_v2.py <control | step number>")
        sys.exit(1)
    build(sys.argv[1])
