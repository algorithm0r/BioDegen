from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Base folder where your CSVs live
BASE = Path(__file__).resolve().parent / "datalists" / "useful"

def load_gene_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    if "Run" not in df.columns:
        raise ValueError(f"'Run' column missing in {path.name}")
    df["Run"] = df["Run"].astype(str).str.strip()
    tcols = [c for c in df.columns if str(c).startswith("t")]
    for c in tcols:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    t_sorted = [c for _, c in sorted((int(c[1:]), c) for c in tcols)]
    df = df.set_index("Run")[t_sorted].dropna(axis=1, how="all")
    print(f"[AUDIT] {path.name}: {len(df)} runs, {df.shape[1]} timesteps")
    return df

# --- exact duplicate grouping (identical time series) ---
def group_exact_duplicates(df: pd.DataFrame):
    keys = df.apply(lambda r: tuple(r.values), axis=1)
    buckets = {}
    for run, key in zip(df.index, keys):
        buckets.setdefault(key, []).append(run)
    return [runs for runs in buckets.values() if len(runs) > 1]

_DASHES = [
    (None, None), (5, 3), (3, 3, 1, 3), (1, 2), (7, 3, 2, 3), (2, 2, 2, 2, 2, 4)
]

# Learning rates and mutation groups
learning_rates = ["L01", "L02", "L03"]   # 0.01, 0.02, 0.03
mutations = ["M", "M15"]                 # 0.10, 0.15

# Create a grid of subplots: rows = mutations, cols = learning rates
fig, axes = plt.subplots(len(mutations), len(learning_rates),
                         figsize=(15, 10), sharex=True, sharey=True)

for r, mut in enumerate(mutations):
    for c, lr in enumerate(learning_rates):
        ax = axes[r, c]

        # Strict file selection:
        if mut == "M":
            # Include LxxM*_G.csv but EXCLUDE any that are M15
            candidates = list(BASE.glob(f"{lr}M*_G.csv"))
            files = [p for p in candidates if "M15" not in p.stem]
        else:  # mut == "M15"
            files = list(BASE.glob(f"{lr}M15*_G.csv"))

        if not files:
            ax.set_title(f"LR {lr[1:]}, {mut} (no data)")
            ax.axis("off")
            continue

        # Load all files into one combined frame (index labels include filename)
        frames, labels = [], []
        for f in sorted(files):
            df = load_gene_csv(f)
            frames.append(df)
            labels.extend([f"{f.stem} | {run}" for run in df.index])

        big = pd.concat(frames, axis=0)
        big.index = labels

        # Duplicate detection (exact matches)
        dup_groups = group_exact_duplicates(big)
        if dup_groups:
            short = [f"{g[0]}~{len(g)}" for g in dup_groups]
            print(f"[DUP] LR {lr[1:]}, {mut}: " + ", ".join(short))
        else:
            print(f"[DUP] LR {lr[1:]}, {mut}: none")

        # Plot: unique traces first (solid), then each duplicate group with dashes
        x = np.array([int(c[1:]) for c in big.columns])
        dup_members = {rname for g in dup_groups for rname in g}

        for run in big.index:
            if run in dup_members:
                continue
            ax.plot(x, big.loc[run].values, label=run, linewidth=1.6, alpha=0.95)

        for g in dup_groups:
            for i, run in enumerate(g):
                y = big.loc[run].values
                ds = _DASHES[min(i, len(_DASHES) - 1)]
                line, = ax.plot(x, y, label=run, linewidth=1.8, alpha=0.95)
                if ds != (None, None):
                    line.set_linestyle((0, ds))

        ax.set_title(f"LR {lr[1:]}, {mut}")
        ax.set_xlabel("Time Step")
        ax.set_ylabel("Gene Tickets")
        ax.legend(fontsize=6, loc="upper right", ncol=1)

plt.tight_layout()
plt.show()



# from pathlib import Path
# import pandas as pd
# import matplotlib.pyplot as plt

# # Base folder where your CSVs live
# BASE = Path(__file__).resolve().parent / "datalists" / "useful"

# def load_gene_csv(path: Path) -> pd.DataFrame:
#     df = pd.read_csv(path)
#     df.set_index("Run", inplace=True)
#     df.columns = df.columns.str.replace(r"^t", "", regex=True).astype(int)
#     return df

# # Learning rates and mutation rates
# learning_rates = ["L01", "L02", "L03"]   # 0.01, 0.02, 0.03
# mutations = ["M", "M15"]                 # 0.1, 0.15

# # Create a grid of subplots: rows = mutations, cols = learning rates
# fig, axes = plt.subplots(len(mutations), len(learning_rates), figsize=(15, 10), sharex=True, sharey=True)

# for r, mut in enumerate(mutations):
#     for c, lr in enumerate(learning_rates):
#         ax = axes[r, c]

#         # Build the filename pattern (all *_G.csv for this lr+mutation combo)
#         pattern = f"{lr}{mut}*_G.csv"
#         files = list(BASE.glob(pattern))

#         if not files:
#             ax.set_title(f"{lr}, {mut} (no data)")
#             continue

#         # Plot each file in this subplot
#         for f in files:
#             df = load_gene_csv(f)
#             for run in df.index:
#                 ax.plot(df.columns, df.loc[run], label=f.stem)

#         ax.set_title(f"LR {lr[1:]}, {mut}")
#         ax.set_xlabel("Time Step")
#         ax.set_ylabel("Gene Tickets")
#         ax.legend(fontsize=6, loc="upper right")

# plt.tight_layout()
# plt.show()


