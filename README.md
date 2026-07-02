<div align="center">

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://readme-typing-svg.demolab.com?font=Fira+Code&size=40&duration=3000&pause=1000&color=00CCCC&center=true&vCenter=true&width=600&lines=FastStats+%F0%9F%93%88;No-Code+Data+Science;Visualize+Anything">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=40&duration=3000&pause=1000&color=008080&center=true&vCenter=true&width=600&lines=FastStats+%F0%9F%93%88;No-Code+Data+Science;Visualize+Anything" alt="FastStats">
</picture>

<h3>Interactive Data Wrangling & Visualization — No Code Required</h3>

<p>
  <a href="https://noahweidig.com/faststats/">
    <img src="https://img.shields.io/badge/%F0%9F%9A%80%20Live%20App-Launch%20FastStats-008080?style=for-the-badge" alt="Live App">
  </a>
</p>

<p>
  <a href="https://github.com/noahweidig/faststats/actions/workflows/deploy.yml">
    <img src="https://github.com/noahweidig/faststats/actions/workflows/deploy.yml/badge.svg" alt="Deploy">
  </a>
  <a href="https://www.r-project.org/">
    <img src="https://img.shields.io/badge/R-≥4.0-276DC3?style=flat&logo=r&logoColor=white" alt="R">
  </a>
  <a href="https://noahweidig.com/faststats">
    <img src="https://img.shields.io/badge/Pure-JS-75AADB?style=flat&logo=rstudio&logoColor=white" alt="Pure JS">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat" alt="MIT License">
  </a>
  <img src="https://img.shields.io/github/stars/noahweidig/faststats?style=flat&color=gold" alt="Stars">
</p>

<br>

> **FastStats** turns raw data into insight in seconds. Upload a file, wrangle it visually,
> build publication-quality plots, run statistics — then export everything, including the
> reproducible R code, with a single click.

<br>

[**Try it now →**](https://noahweidig.com/faststats/) &nbsp;·&nbsp;
[Report a bug](https://github.com/noahweidig/faststats/issues) &nbsp;·&nbsp;
[Request a feature](https://github.com/noahweidig/faststats/issues)

<br>

</div>

---

## Table of Contents

- [Why FastStats?](#-why-faststats)
- [Feature Tour](#-feature-tour)
- [Built-in Datasets](#-built-in-datasets)
- [Workflow](#-workflow)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Author](#-author)

---

## ✨ Why FastStats?

Most data visualization tools force a choice: **powerful but complex** (write R/Python code) or **simple but limited** (point-and-click with no flexibility). FastStats breaks that trade-off.

| | Spreadsheet tools | Coding in R/Python | **FastStats** |
|---|:---:|:---:|:---:|
| No installation needed | ✅ | ❌ | ✅ |
| Handles CSV, Excel, TSV | ✅ | ✅ | ✅ |
| Interactive (Plotly) charts | ❌ | ✅ | ✅ |
| Reproducible code export | ❌ | ✅ | ✅ |
| No coding required | ✅ | ❌ | ✅ |
| Statistical modeling | ❌ | ✅ | ✅ |

---

## 🗺️ Feature Tour

FastStats is organized into five purpose-built tabs, each one a step deeper into your data.

<br>

### 🧭 Overview — Instant Data Profiling
Get the full picture of your dataset the moment it loads.

- Row and column counts, data types at a glance
- Per-column summaries (min, max, mean, missing-value counts)
- Automatic type classification: numeric, categorical, or date

<br>

### 👀 View — Browse & Explore
A full interactive data table powered by **DT**.

- Sort, filter, and search across all columns simultaneously
- Pagination for large datasets
- Stays in sync with every downstream wrangling step

<br>

### 🛠️ Wrangle — Visual Transformation Pipeline
Build a reproducible data pipeline by stacking operations — no `dplyr` knowledge needed.

| Operation | What it does |
|---|---|
| **Filter** | Keep rows matching a condition |
| **Select** | Keep or drop columns |
| **Rename** | Give columns cleaner names |
| **Mutate** | Create new calculated columns |
| **Arrange** | Sort rows by any variable |
| **Group & Summarize** | Aggregate statistics by group |
| **Pivot Longer / Wider** | Reshape between formats |
| **Distinct** | Remove duplicate rows |
| **Sample** | Take a random sample |
| **Replace NA** | Fill missing values |

> Every step is tracked. **Download the full pipeline as a ready-to-run R script** so your analysis is always reproducible.

<br>

### 📈 Plot — Publication-Quality Visualizations
A full ggplot2 builder in your browser, with optional Plotly interactivity.

- **Plot types:** scatter, line, bar, box, violin, histogram, density, and more
- **Aesthetics:** map any variable to x, y, color, fill, size, shape, facet
- **Themes:** choose from ggplot2's built-in themes
- **Color palettes:** Viridis, ColorBrewer, or pick manually
- **Labels & titles:** fully customizable
- **Export:** download as **PNG** or **interactive HTML**

<br>

### 📐 Stats — Statistical Analysis & Reporting
Go beyond visualization with built-in statistical tools.

- **Correlation matrix** with a color-coded heatmap (ggcorrplot)
- **Linear regression** — select predictors and response, get a full model summary
- **Diagnostic plots** — residuals, QQ, leverage, and more
- **Automated plain-language reports** powered by the `report` package

---

## 📦 Built-in Datasets

No data file? No problem. FastStats ships with four classic datasets to explore immediately.

| Dataset | Rows | Description |
|---|:---:|---|
| `iris` | 150 | Fisher's famous flower measurements — a classic for classification |
| `gapminder` | 1,704 | Country-level life expectancy, GDP, and population from 1952–2007 |
| `palmerpenguins` | 344 | Penguin measurements from Palmer Station, Antarctica |
| `mtcars` | 32 | Motor Trend car road tests — fuel efficiency and engine specs |

---

## 🔄 Workflow

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   1. LOAD          Upload CSV/Excel/TSV                 │
│                    — or pick a built-in dataset —       │
│                              │                          │
│   2. EXPLORE       Overview tab → data profile          │
│                    View tab   → browse rows             │
│                              │                          │
│   3. WRANGLE       Stack operations visually            │
│                    Preview changes in real time         │
│                    Export pipeline as R script          │
│                              │                          │
│   4. VISUALIZE     Choose plot type & map variables     │
│                    Customize colors, themes, labels     │
│                    Download PNG or interactive HTML     │
│                              │                          │
│   5. ANALYZE       Correlation matrix & heatmap         │
│                    Linear regression + diagnostics      │
│                    Generate automated plain-text report │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Option 1 — Use the Live App (Zero Setup)

Open **[https://noahweidig.com/faststats/](https://noahweidig.com/faststats/)** in any modern browser. Nothing to install.

---

## 📁 Project Structure

```
faststats/
│
├── app/
│   ├── app.R              # Complete Shiny application (~3,400 lines)
│   └── DESCRIPTION        # Package metadata & dependency declarations
│
├── docs/
│   └── index.html         # GitHub Pages landing page
│
├── .github/
│   └── workflows/
│       └── deploy.yml     # Automated deployment to shinyapps.io
│
├── benchmark_debounce.r   # Performance benchmarking script
└── README.md
```

---

## ☁️ Deployment

The app deploys automatically to **GitHub Pages** on every push to `main` via GitHub Actions.

---

## 🤝 Contributing

Contributions are warmly welcome! Here's how to get started:

```bash
# 1. Fork and clone
git clone https://github.com/<your-username>/faststats.git

# 2. Create a feature branch
git checkout -b feature/your-idea

# 3. Make your changes, then commit
git commit -m "feat: describe your change"

# 4. Push and open a Pull Request
git push origin feature/your-idea
```

**Ideas for contributions:**
- Additional plot types or geoms
- More statistical tests (ANOVA, t-test, chi-square)
- Extra data export formats (JSON, Parquet)
- Improved mobile layout
- Tutorials or example datasets
- Internationalization / translations

---

## 👤 Author

<div align="center">

**Noah Weidig**

[![Website](https://img.shields.io/badge/Website-noahweidig.com-008080?style=flat&logo=safari&logoColor=white)](https://noahweidig.com)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-noahweidig-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/noahweidig/)
[![GitHub](https://img.shields.io/badge/GitHub-noahweidig-181717?style=flat&logo=github&logoColor=white)](https://github.com/noahweidig)

</div>

---

<div align="center">

Built with JS and a healthy obsession with making data science accessible.

**If FastStats saves you time, a ⭐ on GitHub means a lot — thank you!**

<br>

*Licensed under the [MIT License](https://opensource.org/licenses/MIT)*

</div>
