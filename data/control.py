import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.colors as colors
import os

# ─────────────────────────────────────────────
# Command line argument: control | l01 | l02 | l03
# ─────────────────────────────────────────────
VALID_CONDITIONS = ["control", "l01", "l02", "l03"]

if len(sys.argv) < 2 or sys.argv[1] not in VALID_CONDITIONS:
    print(f"Usage: python control.py <condition>")
    print(f"  condition: one of {VALID_CONDITIONS}")
    sys.exit(1)

CONDITION = sys.argv[1]

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────
DATA_DIR       = "./paper data"
STEPS          = [5, 7, 9, 11, 13, 15]
NUM_BUCKETS    = 20
NUM_TIMESLICES = 500
TRAIT_THRESHOLD = 5     # horizontal dashed line on histogram rows

# Histogram rows: (file suffix, linegraph column, row label)
HIST_ROWS = [
    ("gene_hist",     "GeneTickets",     "Task Gene"),
    ("learning_hist", "LearningTickets", "Learning Gene"),
    ("social_hist",   "SocialTickets",   "Social Gene"),
]

def make_filename(step, suffix, condition):
    """Build full path for a given step, file suffix, and condition."""
    if condition == "control":
        # Control files have a midfix; note typo in step 11-15 filenames
        midfix = "(no_learn_social_" if step in [5, 7, 9] else "(no_learn_socia_"
        name = f"Step_{step}_l01M15_{midfix}{suffix}.csv"
    else:
        # Experimental: Step_5_l01M15_gene_hist.csv etc.
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
    """Rows=timeslices, cols=buckets → (NUM_BUCKETS × T), flipped so low=bottom."""
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
    """Read linegraph TSV/CSV with header; tries tab then comma."""
    df = pd.read_csv(filepath, sep='\t')
    if len(df.columns) == 1:
        df = pd.read_csv(filepath, sep=',')
    df.columns = [c.strip() for c in df.columns]
    return df

# ─────────────────────────────────────────────
# Layout
# ─────────────────────────────────────────────
N_HIST = len(HIST_ROWS)
N_ROWS = N_HIST + 1          # population row on top
N_COLS = len(STEPS)

plt.rcParams["font.family"] = "Times New Roman"
plt.rcParams["font.size"]   = 9

FIG_W = 7.0
POP_H_RATIO  = 0.55
HIST_H_RATIO = 1.0
height_ratios = [POP_H_RATIO] + [HIST_H_RATIO] * N_HIST

FIG_H = FIG_W * (POP_H_RATIO + N_HIST * HIST_H_RATIO) / N_COLS * 1.15

LEFT   = 0.07
RIGHT  = 0.87
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
cbar_ax = fig.add_axes([0.89, BOTTOM, 0.014, TOP - BOTTOM])

vmin, vmax = 0, 1

# ─────────────────────────────────────────────
# ROW 0: Population line graphs
# ─────────────────────────────────────────────
all_pop_vals = []
pop_T        = None

for col_idx, step in enumerate(STEPS):
    ax        = axes[0][col_idx]
    line_path = make_filename(step, "linegraphs", CONDITION)

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

    if col_idx == 0:
        ax.set_ylabel("Population", fontsize=9, labelpad=2)
    else:
        ax.set_yticks([])

    ax.set_title(f"Step {step}", fontsize=10, pad=3)

    for spine in ax.spines.values():
        spine.set_visible(True)
        spine.set_linewidth(0.8)

# Shared y/x limits for population row
if all_pop_vals and pop_T is not None:
    pop_ymax  = max(all_pop_vals) * 1.05
    round_max = int(round(pop_ymax / 5000) * 5000)
    for col_idx in range(N_COLS):
        axes[0][col_idx].set_xlim(0, pop_T - 1)
        axes[0][col_idx].set_ylim(0, pop_ymax)
    axes[0][0].set_yticks([0, round_max // 2, round_max])
    axes[0][0].set_yticklabels(
        ["0", f"{round_max // 2 // 1000}k", f"{round_max // 1000}k"],
        fontsize=8
    )

# ─────────────────────────────────────────────
# ROWS 1–3: Histogram heatmaps
# ─────────────────────────────────────────────

# Threshold line y-coordinate in imshow space:
# gene value TRAIT_THRESHOLD sits between pixel (NUM_BUCKETS-1-TRAIT_THRESHOLD)
# and (NUM_BUCKETS-TRAIT_THRESHOLD), so the boundary is at:
threshold_y = (NUM_BUCKETS - 1 - TRAIT_THRESHOLD) + 0.5

for row_idx, (hist_suffix, line_col, row_label) in enumerate(HIST_ROWS):
    plot_row  = row_idx + 1
    is_bottom = (plot_row == N_ROWS - 1)

    for col_idx, step in enumerate(STEPS):
        ax        = axes[plot_row][col_idx]
        hist_path = make_filename(step, hist_suffix, CONDITION)
        line_path = make_filename(step, "linegraphs", CONDITION)

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

        # Trait threshold dashed line
        if hist_suffix == "gene_hist":
            ax.axhline(y=threshold_y, color='white', linewidth=0.8,
                       linestyle='--', alpha=0.8)

        if CONDITION != "control":   
            ax.axvline(x=T/2, color='black', linewidth=0.8, linestyle='--', alpha=0.8)
            ax.axvline(x=T/4, color='black', linewidth=0.8, linestyle='--', alpha=0.8)

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
# Shared x-axis label
# ─────────────────────────────────────────────
fig.text(0.47, 0.01, "Time Step", ha='center', fontsize=9)

# ─────────────────────────────────────────────
# Save — output filename includes condition
# ─────────────────────────────────────────────
out_path = f"./{CONDITION}_histograms.pdf"
plt.savefig(out_path, dpi=300, bbox_inches='tight')
print(f"Saved to {out_path}")
plt.show()