import pandas as pd
import matplotlib.pyplot as plt
import os

# ——— helper to load & clean up your “t0”, “t1”, … columns ———
BASE = os.path.dirname(__file__)
def load_and_fix(fname):
    df = pd.read_csv(os.path.join(BASE, fname)).set_index("Run")
    df.columns = df.columns.str.replace(r"^t", "", regex=True).astype(int)
    return df

# pop_df      = load_and_fix("Population.csv")
# gene_df     = load_and_fix("GeneTickets.csv")
# social_df   = load_and_fix("SocialTickets.csv")
# learning_df = load_and_fix("LearningTickets.csv")

# pop_df      = load_and_fix("PopulationLB.csv")
# gene_df     = load_and_fix("GeneLB.csv")
# social_df   = load_and_fix("SocialLB.csv")
# learning_df = load_and_fix("LearningLB.csv")

# pop_df      = load_and_fix("PopulationLB0.03M.csv")
# gene_df     = load_and_fix("GeneLB0.03M.csv")
# social_df   = load_and_fix("SocialLB0.03M.csv")
# learning_df = load_and_fix("LearningLB0.03M.csv")


# ==========================================================================
# USEFUL GRAPHS
# L01M_Graphs
# pop_df      = load_and_fix("dataLists/useful/L01M_P.csv")
# gene_df     = load_and_fix("dataLists/useful/L01M_G.csv")
# social_df   = load_and_fix("dataLists/useful/L01M_ST.csv")
# learning_df = load_and_fix("dataLists/useful/L01M_LT.csv")

# L02M_Graphs
# pop_df      = load_and_fix("dataLists/useful/L02M_P.csv")
# gene_df     = load_and_fix("dataLists/useful/L02M_G.csv")
# social_df   = load_and_fix("dataLists/useful/L02M_ST.csv")
# learning_df = load_and_fix("dataLists/useful/L02M_LT.csv")

# L03M_Graphs
# pop_df      = load_and_fix("dataLists/useful/L03M_P.csv")
# gene_df     = load_and_fix("dataLists/useful/L03M_G.csv")
# social_df   = load_and_fix("dataLists/useful/L03M_ST.csv")
# learning_df = load_and_fix("dataLists/useful/L03M_LT.csv")

# L01M15_Graphs
# pop_df      = load_and_fix("dataLists/useful/L01M15_P.csv")
# gene_df     = load_and_fix("dataLists/useful/L01M15_G.csv")
# social_df   = load_and_fix("dataLists/useful/L01M15_ST.csv")
# learning_df = load_and_fix("dataLists/useful/L01M15_LT.csv")

# L02M15_Graphs
# pop_df      = load_and_fix("dataLists/useful/L02M15_P.csv")
# gene_df     = load_and_fix("dataLists/useful/L02M15_G.csv")
# social_df   = load_and_fix("dataLists/useful/L02M15_ST.csv")
# learning_df = load_and_fix("dataLists/useful/L02M15_LT.csv")

# L03M15_Graphs
pop_df      = load_and_fix("dataLists/useful/L03M15_P.csv")
gene_df     = load_and_fix("dataLists/useful/L03M15_G.csv")
social_df   = load_and_fix("dataLists/useful/L03M15_ST.csv")
learning_df = load_and_fix("dataLists/useful/L03M15_LT.csv")

# ——— pack them into a list so we can loop ———
plots = [
    (pop_df,      "Population over Time",      "Population"),
    (gene_df,     "Gene Tickets over Time",     "Gene Ticket Count"),
    (social_df,   "Social Tickets over Time",   "Social Ticket Count"),
    (learning_df, "Learning Tickets over Time", "Learning Ticket Count"),
]

# ——— choose your grid size here ———
# for exactly four plots a 2×2 grid is the cleanest:
nrows, ncols = 2, 2
fig, axes = plt.subplots(nrows, ncols, figsize=(12, 8), sharex=True)
axes = axes.flatten()

# ——— loop & draw each metric on its own axis ———
for ax, (df, title, ylabel) in zip(axes, plots):
    for run in df.index:
        ax.plot(df.columns, df.loc[run], label=run)
    ax.set_title(title)
    ax.set_xlabel("Time Step")
    ax.set_ylabel(ylabel)
    ax.legend(fontsize="small", ncol=2)

# ——— if you ever want a 4×4 grid, just flip these two lines: ———
# nrows, ncols = 4, 4
# fig, axes = plt.subplots(nrows, ncols, figsize=(16, 16), sharex=True)

# ——— hide any unused subplots if your grid is bigger than `len(plots)` ———
for ax in axes[len(plots):]:
    ax.axis("off")

plt.tight_layout()
plt.show()
