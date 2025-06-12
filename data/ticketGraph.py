import pandas as pd
import matplotlib.pyplot as plt
import os

# helper as before
BASE = os.path.dirname(__file__)
def load_and_fix(path):
    df = pd.read_csv(path).set_index("Run")
    df.columns = df.columns.str.replace(r"^t", "", regex=True).astype(int)
    return df

pop_df      = load_and_fix(os.path.join(BASE, "Population.csv"))
gene_df     = load_and_fix(os.path.join(BASE, "GeneTickets.csv"))
social_df   = load_and_fix(os.path.join(BASE, "SocialTickets.csv"))
learning_df = load_and_fix(os.path.join(BASE, "LearningTickets.csv"))

# create a 1×2 grid of axes
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

# -- Left: Population over time --
for run in pop_df.index:
    ax1.plot(pop_df.columns, pop_df.loc[run], label=run)
ax1.set_title("Population over Time")
ax1.set_xlabel("Time Step")
ax1.set_ylabel("Population")
ax1.legend()

# -- Right: Tickets comparison --
for run in gene_df.index:
    ax2.plot(gene_df.columns,     gene_df.loc[run],     label=f"{run} Gene")
    ax2.plot(social_df.columns,   social_df.loc[run],   label=f"{run} Social")
    ax2.plot(learning_df.columns, learning_df.loc[run], label=f"{run} Learning")
ax2.set_title("Tickets over Time (All Runs)")
ax2.set_xlabel("Time Step")
ax2.set_ylabel("Ticket Count")
ax2.legend()

plt.tight_layout()
plt.show()
