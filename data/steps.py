import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.colors as colors
import os

# ─────────────────────────────────────────────
# Command line argument: step number
# ─────────────────────────────────────────────
VALID_STEPS = [5, 7, 9, 11, 13, 15]

if len(sys.argv) < 2:
    print(f"Usage: python step_comparison.py <step>")
    print(f"  step: one of {VALID_STEPS}")
    sys.exit(1)

try:
    STEP = int(sys.argv[1])
except ValueError:
    print(f"Error: step must be an integer, got '{sys.argv[1]}'")
    sys.exit(1)

if STEP not in VALID_STEPS:
    print(f"Error: step must be one of {VALID_STEPS}, got {STEP}")
    sys.exit(1)

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
DATA_DIR        = "./paper data"
CONDITIONS      = ["control", "l01", "l02", "l03"]
COL_LABELS      = ["Control", "Learn 0.01", "Learn 0.02", "Learn 0.03"]
NUM_BUCKETS     = 20
NUM_TIMESLICES  = 500
TRAIT_THRESHOLD = 5

# Histogram rows: (file suffix, linegraph column, row label)
HIST_ROWS = [
    ("gene_hist",     "GeneTickets",     "Task Gene"),
    ("learning_hist", "LearningTickets", "Learning Gene"),
    ("social_hist",   "SocialTickets",   "Social Gene"),
]

def make_filename(step, suffix, condition):
    if condition == "control":
        midfix = "(no_learn_social_" if step in [5, 7, 9] else "(no_learn_socia_"
        name = f"Step_{step}_l01M15_{midfix}{suffix}.csv"
    else:
        name = f"Step_{step}_{condition}M15_{suffix}.csv"
    return os.path.join(DATA_DIR, name)

# ─────────────────────────────────────────────
# Colormap: white → blue → rainbow
# ─────────────────────────────────────────────
def createColorMap():
    bottom = plt.get_cmap("gist_rainbow_r")
    top    = plt.get_cmap("bwr_r")
    newcolors = np.vstack((
        top(np.linspace(0.5, 1, 24)),
        bottom(np.linspace(0.24, 1, 232))
    ))
    return colors.ListedColormap(newcolors, "newMap")

c_map = createColorMap()

# ─────────────────────────────────────────────
# File readers
# ─────────────────────────────────────────────
def read_histogram(filepath):
    histogram = [[] for _ in range(NUM_BUCKETS)]
    with open(filepath, 'r') as f:
        for line_num, line in enumerate(f):
            if line_num >= NUM_TIMESLICES:
                break
            parts = line.strip().split(',')
            try:
                nums = [float(x) for x in parts]
                for j in range(NUM_BUCKETS):
                    histogram[NUM_BUCKETS - 1 - j].append(nums[j])
            except (ValueError, IndexError):
                pass
    return np.array(histogram)  # shape (20, T)

def read_linegraph(filepath):
    df = pd.read_csv(filepath, sep='\t')
    if len(df.columns) == 1:
        df = pd.read_csv(filepath, sep=',')
    df.columns = [c.strip() for c in df.columns]
    return df

# ─────────────────────────────────────────────
# Layout: 4 rows (pop + 3 hist), 4 cols (conditions)
# ─────────────────────────────────────────────
N_HIST = len(HIST_ROWS)
N_ROWS = N_HIST + 1
N_COLS = len(CONDITIONS)

plt.rcParams["font.family"] = "Times New Roman"
plt.rcParams["font.size"]   = 9

# Square-ish figure: 4 cols so narrower than the 6-col version
FIG_W = 7.0
POP_H_RATIO  = 0.55
HIST_H_RATIO = 1.0
height_ratios = [POP_H_RATIO] + [HIST_H_RATIO] * N_HIST

FIG_H = FIG_W * (POP_H_RATIO + N_HIST * HIST_H_RATIO) / 6 * 1.15

LEFT   = 0.10
RIGHT  = 0.86
TOP    = 0.94
BOTTOM = 0.10

fig, axes = plt.subplots(
    N_ROWS, N_COLS,
    figsize=(FIG_W, FIG_H),
    gridspec_kw={"height_ratios": height_ratios},
)
fig.subplots_adjust(wspace=0.04, hspace=0.20,
                    left=LEFT, right=RIGHT,
                    top=TOP, bottom=BOTTOM)

# Colorbar spans full figure height
cbar_ax = fig.add_axes([0.88, BOTTOM, 0.018, TOP - BOTTOM])

vmin, vmax = 0, 1

# ─────────────────────────────────────────────
# ROW 0: Population line graphs
# ─────────────────────────────────────────────
all_pop_vals = []
pop_T        = None

for col_idx, (condition, col_label) in enumerate(zip(CONDITIONS, COL_LABELS)):
    ax        = axes[0][col_idx]
    line_path = make_filename(STEP, "linegraphs", condition)

    try:
        lg = read_linegraph(line_path)
        if "Population" in lg.columns:
            pop   = lg["Population"].values
            T_pop = len(pop)
            if pop_T is None:
                pop_T = T_pop
            all_pop_vals.extend(pop)
            ax.plot(np.arange(T_pop), pop, color='steelblue', linewidth=1.2)
        else:
            ax.text(0.5, 0.5, "No Population\ncolumn",
                    ha='center', va='center', transform=ax.transAxes,
                    color='red', fontsize=7)
            print(f"WARNING: 'Population' not found. Columns: {list(lg.columns)}")
    except FileNotFoundError:
        ax.text(0.5, 0.5, "File\nnot found",
                ha='center', va='center', transform=ax.transAxes,
                color='red', fontsize=7)
        print(f"WARNING: not found: {line_path}")

    ax.set_xticks([])
    ax.set_title(col_label, fontsize=10, pad=3)

    if col_idx == 0:
        ax.set_ylabel("Population", fontsize=9, labelpad=2)
    else:
        ax.set_yticks([])

    for spine in ax.spines.values():
        spine.set_visible(True)
        spine.set_linewidth(0.8)

# Shared y/x limits for population row — fixed at 10k for cross-step comparability
POP_YMAX = 10000
if pop_T is not None:
    for col_idx in range(N_COLS):
        axes[0][col_idx].set_xlim(0, pop_T - 1)
        axes[0][col_idx].set_ylim(0, POP_YMAX)
    axes[0][0].set_yticks([0, 5000, 10000])
    axes[0][0].set_yticklabels(["0", "5k", "10k"], fontsize=8)

# Activation markers on population row for non-control conditions
if pop_T is not None:
    for col_idx, condition in enumerate(CONDITIONS):
        if condition != "control":
            axes[0][col_idx].axvline(x=pop_T // 4, color='black', linewidth=0.8,
                                     linestyle='--', alpha=0.8)
            axes[0][col_idx].axvline(x=pop_T // 2, color='black', linewidth=0.8,
                                     linestyle='--', alpha=0.8)

# ─────────────────────────────────────────────
# ROWS 1–3: Histogram heatmaps
# ─────────────────────────────────────────────
threshold_y = (NUM_BUCKETS - 1 - TRAIT_THRESHOLD) + 0.5

for row_idx, (hist_suffix, line_col, row_label) in enumerate(HIST_ROWS):
    plot_row  = row_idx + 1
    is_bottom = (plot_row == N_ROWS - 1)

    for col_idx, condition in enumerate(CONDITIONS):
        ax        = axes[plot_row][col_idx]
        hist_path = make_filename(STEP, hist_suffix, condition)
        line_path = make_filename(STEP, "linegraphs", condition)

        # Load & normalize histogram
        try:
            hist = read_histogram(hist_path)
        except FileNotFoundError:
            ax.text(0.5, 0.5, "File\nnot found", ha='center', va='center',
                    transform=ax.transAxes, color='red', fontsize=7)
            print(f"WARNING: not found: {hist_path}")
            continue

        T        = hist.shape[1]
        col_sums = hist.sum(axis=0)
        col_sums[col_sums == 0] = 1
        hist_norm = hist / col_sums

        # Heatmap
        ax.imshow(
            hist_norm,
            aspect='auto',
            interpolation='nearest',
            cmap=c_map,
            vmin=vmin, vmax=vmax,
            origin='upper',
            extent=[0, T - 1, NUM_BUCKETS - 0.5, -0.5]
        )

        # Trait threshold dashed line on task gene row only
        if hist_suffix == "gene_hist":
            ax.axhline(y=threshold_y, color='white', linewidth=0.8,
                       linestyle='--', alpha=0.8)

        # Learning/social activation markers on non-control conditions
        if condition != "control":
            ax.axvline(x=T // 4, color='black', linewidth=0.8,
                       linestyle='--', alpha=0.8)
            ax.axvline(x=T // 2, color='black', linewidth=0.8,
                       linestyle='--', alpha=0.8)

        # Mean line from linegraph
        try:
            lg = read_linegraph(line_path)
            if line_col in lg.columns:
                mean_vals = lg[line_col].values[:T]
                y_line    = (NUM_BUCKETS - 1) - np.clip(mean_vals, 0, NUM_BUCKETS - 1)
                x_line    = np.linspace(0, T - 1, len(y_line))
                ax.plot(x_line, y_line, color='white', linewidth=1.2, alpha=0.9)
            else:
                print(f"WARNING: '{line_col}' not found. "
                      f"Available: {list(lg.columns)}")
        except FileNotFoundError:
            print(f"WARNING: linegraph not found: {line_path}")
        except Exception as e:
            print(f"ERROR reading linegraph: {e}")

        # X ticks: bottom row only, rotated
        if is_bottom:
            tick_pos    = [T // 4, T // 2, 3 * T // 4, T - 1]
            tick_labels = ["50k", "100k", "150k", "200k"]
            ax.set_xticks(tick_pos)
            ax.set_xticklabels(tick_labels, fontsize=8, rotation=90, ha='center')
        else:
            ax.set_xticks([])

        # Y ticks: left column only
        if col_idx == 0:
            ax.set_yticks([0, NUM_BUCKETS - 1])
            ax.set_yticklabels([str(NUM_BUCKETS - 1) + "+", "0"], fontsize=8)
            ax.tick_params(axis='y', labelleft=True, left=True, pad=2)
            ax.set_ylabel(row_label, fontsize=9, labelpad=2)
        else:
            ax.set_yticks([])
            ax.tick_params(axis='y', labelleft=False, left=False)

        for spine in ax.spines.values():
            spine.set_visible(True)
            spine.set_linewidth(0.8)

# ─────────────────────────────────────────────
# Colorbar
# ─────────────────────────────────────────────
sm = plt.cm.ScalarMappable(cmap=c_map, norm=plt.Normalize(vmin=0, vmax=1))
sm.set_array([])
cbar = fig.colorbar(sm, cax=cbar_ax)
cbar.set_label("% of population", fontsize=8, rotation=90, labelpad=4)
cbar.set_ticks(np.linspace(0, 1, 11))
cbar.set_ticklabels(
    [f"{int(v * 100)}%" for v in np.linspace(0, 1, 11)],
    rotation=90, va='center', fontsize=7
)

# ─────────────────────────────────────────────
# Shared x-axis label + figure title
# ─────────────────────────────────────────────
fig.text(0.47, 0.01, "Time Step", ha='center', fontsize=9)

# ─────────────────────────────────────────────
# Save
# ─────────────────────────────────────────────
out_path = f"./step{STEP}_comparison.pdf"
plt.savefig(out_path, dpi=300, bbox_inches='tight')
print(f"Saved to {out_path}")
plt.show()
