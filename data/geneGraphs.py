from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt

# Base folder where your CSVs live
BASE = Path(__file__).resolve().parent / "datalists" / "useful"

def load_gene_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.set_index("Run", inplace=True)
    df.columns = df.columns.str.replace(r"^t", "", regex=True).astype(int)
    return df

# Learning rates and mutation rates
learning_rates = ["L01", "L02", "L03"]   # 0.01, 0.02, 0.03
mutations = ["M", "M15"]                 # 0.1, 0.15

# Create a grid of subplots: rows = mutations, cols = learning rates
fig, axes = plt.subplots(len(mutations), len(learning_rates), figsize=(15, 10), sharex=True, sharey=True)

for r, mut in enumerate(mutations):
    for c, lr in enumerate(learning_rates):
        ax = axes[r, c]

        # Build the filename pattern (all *_G.csv for this lr+mutation combo)
        pattern = f"{lr}{mut}*_G.csv"
        files = list(BASE.glob(pattern))

        if not files:
            ax.set_title(f"{lr}, {mut} (no data)")
            continue

        # Plot each file in this subplot
        for f in files:
            df = load_gene_csv(f)
            for run in df.index:
                ax.plot(df.columns, df.loc[run], label=f.stem)

        ax.set_title(f"LR {lr[1:]}, {mut}")
        ax.set_xlabel("Time Step")
        ax.set_ylabel("Gene Tickets")
        ax.legend(fontsize=6, loc="upper right")

plt.tight_layout()
plt.show()


# from pathlib import Path
# import pandas as pd
# import matplotlib.pyplot as plt

# # Base folder relative to this script
# BASE = Path(__file__).resolve().parent / "datalists" / "useful"

# def load_gene_csv(path: Path) -> pd.DataFrame:
#     df = pd.read_csv(path)
#     df.set_index("Run", inplace=True)
#     df.columns = df.columns.str.replace(r"^t", "", regex=True).astype(int)
#     return df

# # Collect all *_G.csv files in the folder
# csv_files = sorted(BASE.glob("*_G.csv"))

# if not csv_files:
#     raise FileNotFoundError(f"No *_G.csv files found in {BASE}")

# # Make subplots grid (e.g., 3 cols × N rows depending on number of files)
# n = len(csv_files)
# cols = 3
# rows = (n + cols - 1) // cols

# fig, axes = plt.subplots(rows, cols, figsize=(15, 5 * rows))
# axes = axes.flatten()

# # Plot each CSV into a subplot
# for i, path in enumerate(csv_files):
#     df = load_gene_csv(path)
#     ax = axes[i]

#     for run in df.index:
#         ax.plot(df.columns, df.loc[run], label=run)

#     ax.set_title(path.stem)  # file name without extension
#     ax.set_xlabel("Time Step")
#     ax.set_ylabel("Gene Tickets")
#     ax.legend(fontsize=6)

# # Hide any unused axes
# for j in range(i + 1, len(axes)):
#     fig.delaxes(axes[j])

# plt.tight_layout()
# plt.show()
