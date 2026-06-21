#!/usr/bin/env python3
"""
95% CI variants of the two paper trajectory figures, for comparison against the
current median+IQR versions. Bands here are mean +/- 1.96*SEM (95% CI of the
mean across runs), the literal thing Reviewer 2 asked for. Center line is the
mean (not the median) to match the band.

Writes fig_cascade_ci.pdf and fig_combined_trajectories_ci.pdf to ./figs.
"""
import sys, os
import numpy as np
import matplotlib.pyplot as plt

DATA = r"D:\Chris's Documents\Documents\Web Simulations\BioDegen-main\data"
sys.path.insert(0, DATA)
import stats_analysis as sa
import paper_figures as pf


def ci_band(wide):
    """ts, mean, lo, hi  with lo/hi = mean +/- 1.96 * SEM across runs (per column)."""
    ts   = wide.columns.values
    mean = wide.mean(axis=0).values
    n    = wide.count(axis=0).values.astype(float)
    sd   = wide.std(axis=0, ddof=1).values
    sem  = np.divide(sd, np.sqrt(n), out=np.zeros_like(sd), where=n > 1)
    return ts, mean, mean - 1.96 * sem, mean + 1.96 * sem


def save(fig, name):
    out = os.path.join(DATA, "figs", name)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    fig.savefig(out, bbox_inches="tight"); plt.close(fig)
    print("wrote", out)


def fig_cascade_ci(df):
    costs, lrs = pf.S, list(pf.LR)
    rows = [("nolearn", 0.01, "No learning", (pf.ERA1, pf.ERA2))] + \
           [("exp", lr, f"Learn {lr:.0%}", (pf.ERA1, pf.ERA2)) for lr in lrs]
    nr, nc = len(rows), len(costs)
    fig, axes = plt.subplots(nr, nc, figsize=(7.0, 1.15 * nr + 0.7),
                             sharex=True, sharey=True)
    axes = np.atleast_2d(axes)
    for r, (kind, lr, rlabel, era_lines) in enumerate(rows):
        for c, s in enumerate(costs):
            ax = axes[r][c]
            for metric, label, col in pf.TRAIT_LINES:
                wide = sa.per_run_wide(sa.cond_slice(df, s, lr, kind), metric)
                if wide is None:
                    continue
                ts, mean, lo, hi = ci_band(wide)
                ax.fill_between(ts, lo, hi, color=col, alpha=0.40, linewidth=0)
                ax.plot(ts, mean, color=col, lw=0.8,
                        label=(label if (r == 0 and c == 0) else None))
            ax.axhline(pf.THRESH, ls=":", c="0.5", lw=0.6)
            for era in era_lines:
                ax.axvline(era, ls="--", c="0.6", lw=0.6)
            ax.margins(x=0); pf.thin_spines(ax)
            if r == 0:
                ax.set_title(f"s = {s}", fontsize=10)
            if c == 0:
                ax.set_ylabel(rlabel, fontsize=10); ax.set_ylim(0, 12)
                ax.set_yticks([0, 4, 8, 12])
            if r == nr - 1:
                ax.set_xticks([0, pf.ERA1, pf.ERA2, pf.END])
                ax.set_xticklabels(["0", "50k", "100k", "200k"], fontsize=10, rotation=90)
    fig.legend(loc="upper center", bbox_to_anchor=(0.5, 1.0),
               ncol=3, fontsize=10, frameon=False)
    fig.supxlabel("Time step", fontsize=10, y=0.015)
    fig.tight_layout(pad=0.2, rect=[0, 0.02, 1, 0.93])
    save(fig, "fig_cascade_ci.pdf")


def fig_combined_ci(df):
    specs = pf._four_panel_specs()
    nrows, ncols = len(pf._METRIC_ROWS), len(specs)
    fig, axes = plt.subplots(nrows, ncols, figsize=(7.0, 2.2 * nrows + 0.3),
                             sharex=True, sharey="row")
    for ri, (metric, ylabel, use_thresh) in enumerate(pf._METRIC_ROWS):
        for ci, (kind, lr, title, era_lines) in enumerate(specs):
            ax = axes[ri][ci]
            for s in pf.S:
                wide = sa.per_run_wide(sa.cond_slice(df, s, lr, kind), metric)
                if wide is None:
                    continue
                ts, mean, lo, hi = ci_band(wide)
                ax.fill_between(ts, lo, hi, color=pf.SCOLOR[s], alpha=0.40, linewidth=0)
                ax.plot(ts, mean, color=pf.SCOLOR[s], lw=1.1,
                        label=(f"s={s}" if (ri == nrows - 1 and ci == 0) else None))
            if use_thresh:
                ax.axhline(pf.THRESH, ls=":", c="0.4", lw=0.8)
            for era in era_lines:
                ax.axvline(era, ls="--", c="0.5", lw=0.8)
            ax.margins(x=0); pf.thin_spines(ax)
            if ri == 0:
                ax.set_title(title, fontsize=10)
            if ci == 0:
                ax.set_ylabel(ylabel, fontsize=10)
            if ri == nrows - 1:
                ax.set_xticks([0, pf.ERA1, pf.ERA2, pf.END])
                ax.set_xticklabels(["0", "50k", "100k", "200k"], fontsize=10, rotation=90)
    axes[-1][0].legend(fontsize=8, frameon=False, loc="lower right",
                       title="cost", title_fontsize=8)
    fig.supxlabel("Time step", fontsize=10, y=0.015)
    fig.tight_layout(pad=0.2, rect=[0, 0.02, 1, 0.97])
    save(fig, "fig_combined_trajectories_ci.pdf")


def main():
    df = sa.load(os.path.join(DATA, "biodegen_perrun_all.csv"))
    fig_cascade_ci(df)
    fig_combined_ci(df)
    print("Done.")


if __name__ == "__main__":
    main()
