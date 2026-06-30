library(shiny)
library(shinythemes)
library(ggplot2)
library(dplyr)
library(tidyr)
library(readr)
library(tibble)
library(stringr)
library(readxl)
library(janitor)
library(gapminder)
library(palmerpenguins)
library(scales)
library(lubridate)
library(plotly)
library(DT)
library(sortable)
library(ggcorrplot)
library(broom)
library(report)
library(RColorBrewer)

custom_css <- "
body {
  background: #f7fafa;
  color: #333333;
  font-family: 'Open Sans', sans-serif;
}

.external-links {
  position: fixed;
  top: 16px;
  right: 20px;
  display: flex;
  gap: 12px;
  z-index: 1030;
}

.external-links a {
  color: #008080;
  font-size: 22px;
  transition: color 0.2s ease;
}

.external-links a:hover {
  color: #006666;
  text-decoration: none;
}

.external-links a:focus-visible {
  outline: 2px solid #006666;
  outline-offset: 4px;
  border-radius: 4px;
}

.app-footer {
  position: fixed;
  bottom: 12px;
  right: 20px;
  background: rgba(247, 250, 250, 0.98);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: #4f5d5d !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.app-footer,
.app-footer span,
.app-footer strong {
  color: #4f5d5d !important;
}

.app-footer a {
  color: #008080 !important;
  font-weight: 600;
  text-decoration: none;
}

.app-footer a:hover {
  color: #006666;
  text-decoration: underline;
}

.app-footer a:focus-visible {
  outline: 2px solid #006666;
  outline-offset: 2px;
  border-radius: 2px;
}

#top-upload {
  background: #ffffff;
  border-bottom: 1px solid #dfecec;
  padding: 16px 18px 12px;
  margin-bottom: 20px;
}

#top-upload .shiny-input-container {
  margin-bottom: 0;
}

#top-upload .current-file-label {
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  color: #008080;
  margin-bottom: 4px;
}

#current_file {
  font-size: 16px;
}

#top-upload .active-dataset-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

#top-upload .dataset-badge {
  align-self: flex-start;
  background: #e6f3f3;
  color: #006666;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

#top-upload .sample-description {
  font-size: 13px;
  color: #4f5d5d;
  margin-top: 6px;
}

#top-upload .dataset-meta {
  margin-top: 8px;
}

.dataset-description,
.dataset-dimensions {
  font-size: 13px;
  color: #4f5d5d;
}

.dataset-description {
  margin-bottom: 6px;
}

.dataset-column-list {
  margin-bottom: 0;
  padding-left: 18px;
  font-size: 13px;
  color: #4f5d5d;
}

.dataset-column-list li + li {
  margin-top: 4px;
}

.dataset-column-summary > strong,
.dataset-columns-block > strong {
  display: block;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #008080;
  margin-bottom: 4px;
}

.nav.nav-pills.nav-stacked > li + li {
  margin-top: 8px;
}

.nav.nav-pills.nav-stacked > li > a {
  border-radius: 12px;
  color: #006666;
  border: 1px solid #008080;
}

.nav.nav-pills.nav-stacked > li > a {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.35;
}

.nav.nav-pills.nav-stacked > li > a > span[aria-hidden='true'] {
  display: inline-flex;
  align-items: center;
}


.nav.nav-pills.nav-stacked > li > a:hover,
.nav.nav-pills.nav-stacked > li.active > a,
.nav.nav-pills.nav-stacked > li.active > a:focus {
  background-color: #008080 !important;
  color: #ffffff !important;
}

.nav.nav-pills.nav-stacked > li > a:focus-visible {
  outline: 2px solid #006666;
  outline-offset: 2px;
}

h4 {
  color: #008080;
  font-weight: 600;
}

.btn:not(.btn-link) {
  background: #008080;
  color: #ffffff;
  border: none;
}

.btn:not(.btn-link):hover {
  background: #006666;
  color: #ffffff;
}

.btn:focus-visible {
  outline: 2px solid #006666;
  outline-offset: 2px;
}

.irs-bar,
.irs-single,
.irs-handle {
  background: #008080 !important;
  border-color: #008080 !important;
}

.dataTables_wrapper .dataTables_paginate .paginate_button.current {
  background: #008080 !important;
  color: #ffffff !important;
}

.plot-box {
  border: 1px solid #dfecec;
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
}

.wrangle-step-item {
  background: #ffffff;
  border: 1px solid #dfecec;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.wrangle-step-item:hover {
  border-color: #008080;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.wrangle-step-item:focus-visible {
  outline: 2px solid #008080;
  outline-offset: 2px;
}

.wrangle-step-item.selected {
  border-color: #008080;
  background: #e6f3f3;
}

.wrangle-step-title {
  font-weight: 600;
  color: #006666;
  margin-bottom: 4px;
}

.wrangle-step-summary {
  font-size: 13px;
  color: #4f5d5d;
}

.overview-highlight {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #e6f3f3, #ffffff);
  border: 1px solid #c8e2e2;
  border-radius: 14px;
  padding: 18px 20px;
  margin-bottom: 18px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.overview-highlight span {
  font-size: 40px;
  line-height: 1;
}

.overview-highlight p {
  margin-bottom: 0;
}

.overview-card {
  background: #ffffff;
  border: 1px solid #dfecec;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.overview-card h4 {
  margin-top: 0;
  color: #008080;
  font-weight: 700;
}

.overview-card ul {
  margin-bottom: 12px;
  padding-left: 20px;
}

.overview-card li {
  margin-bottom: 6px;
}

.overview-upload #upload_info {
  margin-bottom: 0;
  font-weight: 400;
  color: #4f5d5d;
}

.overview-upload #upload_info strong {
  color: #008080;
}

.plotly html-widget {
  width: 100% !important;
  height: 100% !important;
}

.lm-summary {
  font-family: 'Open Sans', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  background: #ffffff;
  border: 1px solid #dfecec;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.lm-summary h5 {
  margin-top: 20px;
  color: #008080;
  font-weight: 600;
}

.lm-summary h5:first-of-type {
  margin-top: 0;
}

.lm-summary-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.lm-summary-table th,
.lm-summary-table td {
  padding: 8px 10px;
  border-bottom: 1px solid #e1eded;
}

.lm-summary-table th {
  text-transform: uppercase;
  letter-spacing: 0.02em;
  font-size: 13px;
  color: #008080;
  font-weight: 600;
}

.lm-summary-table tr:last-child td {
  border-bottom: none;
}

.lm-summary details {
  margin-top: 12px;
  background: #f4fbfb;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid #dfecec;
}

.lm-summary details > summary {
  cursor: pointer;
  font-weight: 600;
  color: #008080;
}

.lm-report-text {
  margin-top: 8px;
  font-size: 14px;
  color: #4f5d5d;
}
"

sample_datasets <- list(
  iris = list(
    menu_label = "Sample: Iris flower measurements",
    name = "Iris flower measurements",
    description = "150 iris flowers with sepal and petal measurements plus species labels.",
    loader = function() {
      as_tibble(iris) %>%
        clean_names()
    }
  ),
  gapminder = list(
    menu_label = "Sample: Gapminder global development",
    name = "Gapminder global development",
    description = "Country-level life expectancy, GDP per capita, and population from 1952 to 2007.",
    loader = function() {
      gapminder::gapminder %>%
        as_tibble() %>%
        clean_names()
    }
  ),
  penguins = list(
    menu_label = "Sample: Palmer Penguins",
    name = "Palmer Penguins",
    description = "Size measurements for 344 adult penguins from three species on three islands in the Palmer Archipelago, Antarctica.",
    loader = function() {
      palmerpenguins::penguins %>%
        as_tibble() %>%
        clean_names()
    }
  ),
  mtcars = list(
    menu_label = "Sample: Motor Trend car specs",
    name = "Motor Trend car specs",
    description = "32 automobiles from the 1974 Motor Trend US magazine with fuel economy and performance metrics.",
    loader = function() {
      mtcars %>%
        as_tibble(rownames = "model") %>%
        clean_names()
    }
  )
)

sample_dataset_choices <- setNames(
  names(sample_datasets),
  vapply(sample_datasets, `[[`, "menu_label", FUN.VALUE = character(1), USE.NAMES = FALSE)
)

default_dataset_id <- names(sample_datasets)[1]

wrangle_step_options <- function() {
  c(
    "Select columns" = "select",
    "Mutate column" = "mutate",
    "Rename column" = "rename",
    "Filter rows" = "filter",
    "Sample rows" = "sample",
    "Keep distinct combinations" = "distinct",
    "Drop missing rows" = "drop_na",
    "Replace missing values" = "replace_na",
    "Group rows" = "group_by",
    "Summarize" = "summarize",
    "Pivot longer" = "pivot_longer",
    "Pivot wider" = "pivot_wider"
  )
}

ui <- fluidPage(
  theme = shinytheme("flatly"),
  tags$head(
    tags$title("QuickPlot"),
    tags$link(
      rel="icon",
      href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📊</text></svg>"
    ),
    tags$style(HTML(custom_css)),
    tags$link(rel="stylesheet",
              href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap")
  ),

  titlePanel(div(HTML("<span aria-hidden='true'>📊</span> QuickPlot"), style="color:#008080;font-weight:700"), windowTitle = "📊 QuickPlot"),

  tags$div(
    class = "external-links",
    tags$a(icon("github"), href = "https://github.com/noahweidig", target = "_blank", rel = "noopener noreferrer", title = "GitHub", `aria-label` = "GitHub Profile"),
    tags$a(icon("globe"), href = "https://noahweidig.com", target = "_blank", rel = "noopener noreferrer", title = "Personal site", `aria-label` = "Personal Website"),
    tags$a(icon("linkedin"), href = "https://www.linkedin.com/in/noahweidig/", target = "_blank", rel = "noopener noreferrer", title = "LinkedIn", `aria-label` = "LinkedIn Profile")
  ),

  div(
    id = "top-upload",
    fluidRow(
      column(
        width = 4,
        fileInput("file", "Upload CSV/Excel",
                  accept = c(".csv", ".tsv", ".xlsx", ".xls"))
      ),
      column(
        width = 2,
        checkboxInput("header", "CSV has header", TRUE)
      ),
      column(
        width = 3,
        selectInput(
          "data_source",
          "Dataset",
          choices = sample_dataset_choices,
          selected = default_dataset_id
        ),
        div(class = "sample-description", uiOutput("data_source_description"))
      ),
      column(
        width = 3,
        div(class = "current-file-label", "Current data"),
        uiOutput("current_file"),
        div(class = "dataset-meta", uiOutput("active_dataset_summary"))
      )
    )
  ),

  navlistPanel(
    id = "main_tabs",
    widths = c(2, 10),
    fluid = TRUE,
    well = FALSE,
    tabPanel(title = HTML("<span aria-hidden='true'>🧭</span> Overview"), value = "🧭 Overview",
             tags$div(
               class = "overview-highlight",
               tags$span("✨", `aria-hidden`="true"),
               tags$div(
                 tags$strong("Welcome to QuickPlot!"),
                 tags$p("Upload a dataset above or explore one of the built-in sample datasets to test-drive the workflow.")
               )
             ),
             tags$div(
               class = "overview-card overview-upload",
               tags$h4(HTML("<span aria-hidden='true'>📄</span> Active dataset details")),
               uiOutput("upload_info")
             ),
             tags$div(
               class = "overview-card",
               tags$h4(HTML("<span aria-hidden='true'>🗂️</span> Step 1 — Upload or select your data")),
               tags$p("Use the upload controls at the top of the page to bring in your file."),
               tags$ul(
                 tags$li("Click ", tags$strong("Upload CSV/Excel"), " to choose a .csv, .tsv, or Excel file."),
                 tags$li("Keep ", tags$strong("CSV has header"), " checked when your first row holds column names."),
                 tags$li("Watch the ", tags$strong("Current data"), " label to confirm what dataset is active.")
               ),
               tags$p("No file yet? The classic ", tags$code("iris"), " dataset loads automatically, or pick another sample from the dropdown to experiment right away.")
             ),
             tags$div(
               class = "overview-card",
               tags$h4(HTML("<span aria-hidden='true'>👀</span> Step 2 — Preview and validate")),
               tags$p("Switch to the ", tags$strong(HTML("<span aria-hidden='true'>👀</span> View")), " tab to inspect your data."),
               tags$ul(
                 tags$li("Scroll through the interactive preview table to spot issues fast."),
                 tags$li("Check summary tables for quick stats on numeric and categorical/date columns."),
                 tags$li("Use built-in table tools for sorting, searching, and downloading snapshots.")
               )
             ),
             tags$div(
               class = "overview-card",
               tags$h4(HTML("<span aria-hidden='true'>🛠️</span> Step 3 — Build your wrangling recipe")),
               tags$p("Visit the ", tags$strong(HTML("<span aria-hidden='true'>🛠️</span> Wrangle")), " tab to craft a clean data pipeline."),
               tags$ul(
                 tags$li("Choose an ", tags$strong("Operation"), " and click ", tags$strong(HTML("Add step <span aria-hidden='true'>➕</span>")), "."),
                 tags$li("Select any step to fine-tune settings and preview the results instantly."),
                 tags$li("Drag to reorder steps and remove the highlighted one with the ", HTML("<span aria-hidden='true'>🗑️</span>"), " button."),
                 tags$li("Download the cleaned dataset or reveal the generated dplyr code for reproducibility.")
               )
             ),
             tags$div(
               class = "overview-card",
               tags$h4(HTML("<span aria-hidden='true'>📈</span> Step 4 — Visualize insights")),
               tags$p("Head over to the ", tags$strong(HTML("<span aria-hidden='true'>📈</span> Plot")), " tab and bring your story to life."),
               tags$ul(
                 tags$li("Choose whether to use the original data or your wrangled version."),
                 tags$li("Map variables, pick a plot type, and refine binning, trend lines, and aesthetics."),
                 tags$li("Try different color themes and palettes to match your presentation style."),
                 tags$li("Hover, zoom, and download interactive graphics powered by Plotly.")
               )
             ),
             tags$div(
               class = "overview-card",
               tags$h4(HTML("<span aria-hidden='true'>📐</span> Step 5 — Analyze and report")),
               tags$p("Dive into the ", tags$strong(HTML("<span aria-hidden='true'>📐</span> Stats")), " tab to run quick models and tests on your selected variables."),
               tags$ul(
                 tags$li("Choose numeric or categorical variables to run the appropriate statistical test."),
                 tags$li("Generate a plain-text automated report of the results."),
                 tags$li("Download the R code needed to reproduce the analysis.")
               )
             ),
             tags$div(
               class = "overview-card",
               tags$h4(HTML("<span aria-hidden='true'>💡</span> Helpful tips")),
               tags$ul(
                 tags$li("Look for dimension readouts below previews to ensure each step behaves as expected."),
                 tags$li("Use the download buttons across tabs to export data and charts for sharing."),
                 tags$li("Palette and theme choices keep visuals on brand and presentation-ready.")
               )
             )
    ),
    tabPanel(title = HTML("<span aria-hidden='true'>👀</span> View"), value = "👀 View",
             fluidRow(
               column(12,
                      h4("Data Preview"),
                      DTOutput("data_preview"),
                      hr(),
                      h4("Numeric Variables"),
                      tableOutput("num_summary"),
                      hr(),
                      h4("Categorical / Date Variables"),
                      tableOutput("cat_summary")
               )
             )
    ),
    tabPanel(title = HTML("<span aria-hidden='true'>🛠️</span> Wrangle"), value = "🛠️ Wrangle",
             fluidRow(
               column(4,
                      h4("Pipeline"),
                      selectInput("wrangle_add_type", "Operation",
                                  choices = wrangle_step_options(),
                                  selected = "select"),
                      actionButton("wrangle_add_btn", HTML("Add step <span aria-hidden='true'>➕</span>"), `aria-label` = "Add wrangling step"),
                      hr(),
                      conditionalPanel(
                        condition = "output.has_wrangle_steps === false",
                        div(
                          class = "text-center",
                          style = "padding:20px;border:2px dashed #dfecec;border-radius:8px;color:#4f5d5d;",
                          icon("inbox", class = "fa-2x"),
                          p(style = "margin-top:10px;font-weight:600;", "No steps configured"),
                          p(style = "font-size:13px;", "Use the dropdown above to add a wrangle step.")
                        )
                      ),
                      conditionalPanel(
                        condition = "output.has_wrangle_steps === true",
                        uiOutput("wrangle_steps_ui")
                      ),
                      conditionalPanel(
                        condition = "output.has_wrangle_steps === true",
                        actionButton("wrangle_remove_btn", HTML("Remove selected step <span aria-hidden='true'>🗑️</span>"), class = "btn btn-link text-danger", `aria-label` = "Remove selected wrangling step"),
                        hr(),
                        div(
                          class = "wrangle-export-controls",
                          style = "display:flex;gap:8px;flex-wrap:wrap;",
                          downloadButton("wrangle_download", HTML("Download wrangled CSV <span aria-hidden='true'>📥</span>"), `aria-label` = "Download wrangled CSV"),
                          actionButton("wrangle_show_script", HTML("View wrangle code <span aria-hidden='true'>🧾</span>"), `aria-label` = "View generated dplyr wrangle code")
                        )
                      ),
                      uiOutput("wrangle_status")
               ),
               column(8,
                      h4("Step settings"),
                      conditionalPanel(
                        condition = "output.has_wrangle_selected === false",
                        div(
                          class = "text-center",
                          style = "padding:20px;border:2px dashed #dfecec;border-radius:8px;color:#4f5d5d;",
                          icon("sliders-h", class = "fa-2x"),
                          p(style = "margin-top:10px;font-weight:600;", "No step selected"),
                          p(style = "font-size:13px;", "Select a step from the pipeline to configure its options.")
                        )
                      ),
                      conditionalPanel(
                        condition = "output.has_wrangle_selected === true",
                        uiOutput("wrangle_step_config")
                      ),
                      hr(),
                      h4("Preview"),
                      DTOutput("wrangle_preview"),
                      hr(),
                      verbatimTextOutput("wrangle_dims")
               )
             )
    ),
    tabPanel(title = HTML("<span aria-hidden='true'>📈</span> Plot"), value = "📈 Plot",
             sidebarLayout(
               sidebarPanel(
                 checkboxInput("plot_use_wrangled", "Use wrangled data", FALSE),
                 uiOutput("var_ui"),
                 uiOutput("date_fmt_ui"),
                 textInput("x_lab", "X axis label", ""),
                 textInput("y_lab", "Y axis label", ""),
                 textInput("legend_lab", "Legend title", ""),
                 selectInput("plot_type", "Plot type",
                             c("auto","scatter","histogram","density","boxplot","violin","bar","line",
                               "Correlation matrix" = "corr_matrix")),
                 checkboxInput("use_percent", "Bar %", FALSE),
                 sliderInput("bins", "Bins", 10, 200, 30),
                 sliderInput("alpha", "Alpha", 0.05, 1, 0.8, step = 0.05),
                 sliderInput("pt_size", "Point/line size", 0.2, 6, 2, step = 0.1),
                 checkboxGroupInput(
                   "trendline_options",
                   "Scatter trendlines",
                   choices = c("Linear fit" = "linear", "Smooth curve" = "smooth"),
                   selected = "smooth"
                 ),
                 checkboxInput("free_y", "Facet free y", FALSE),
                 checkboxInput("show_legend", "Show legend", TRUE),
                 selectInput("theme_choice", "Theme", c("classic","minimal","void","light","dark")),
                 selectInput(
                   "palette_choice", "Palette",
                   c(
                     "Default" = "default",
                     "Manual" = "manual",
                     "Viridis" = "viridis",
                     "Plasma" = "plasma",
                     "Inferno" = "inferno",
                     "Magma" = "magma",
                     "Cividis" = "cividis",
                     "Brewer - Set2" = "brewer_Set2",
                     "Brewer - Dark2" = "brewer_Dark2",
                     "Brewer - Set3" = "brewer_Set3",
                     "Brewer - Spectral" = "brewer_Spectral",
                     "Brewer - YlGnBu" = "brewer_YlGnBu"
                   )
                 ),
                 conditionalPanel(
                   condition = "input.palette_choice == 'manual'",
                   textInput(
                     "palette_manual",
                     "Manual colors (comma separated)",
                     "#1b9e77,#d95f02,#7570b3"
                   )
                 ),
                 hr(),
                numericInput("w", "Width (in)", 6),
                numericInput("h", "Height (in)", 4),
                numericInput("dpi", "DPI", 300),
                div(
                  style = "display:flex;gap:8px;flex-wrap:wrap;",
                  downloadButton("dl_png", HTML("Download PNG <span aria-hidden='true'>📥</span>"), `aria-label` = "Download plot as PNG"),
                  downloadButton("dl_jpg", HTML("Download JPG <span aria-hidden='true'>📥</span>"), `aria-label` = "Download plot as JPG"),
                  actionButton("plot_show_code", HTML("View plot code <span aria-hidden='true'>🧾</span>"), class = "btn btn-default", `aria-label` = "View generated ggplot2 code")
                )
              ),
               mainPanel(div(class="plot-box", plotlyOutput("plt", height = "600px")))
             )
    ),
    tabPanel(title = HTML("<span aria-hidden='true'>📐</span> Stats"), value = "📐 Stats",
             sidebarLayout(
               sidebarPanel(
                 checkboxInput("stat_use_wrangled", "Use wrangled data", FALSE),
                 selectInput("stat_test", "Analysis",
                             c(
                               "Linear Regression" = "lm",
                               "ANOVA" = "anova",
                               "Kruskal-Wallis" = "kruskal",
                               "Paired t-test" = "paired_t",
                               "Wilcoxon Signed-Rank" = "wilcoxon_signed",
                               "Unpaired t-test" = "unpaired_t",
                               "Mann-Whitney U" = "mann_whitney",
                               "Pearson Correlation" = "pearson_cor",
                               "Spearman Correlation" = "spearman_cor",
                               "Chi-squared Test" = "chisq"
                             )),
                 selectInput("stat_x", "Predictor / grouping", choices = NULL),
                 selectInput("stat_y", "Response / comparison", choices = NULL),
                 uiOutput("stat_group_ui"),
                 helpText("Tip: choose a grouping column to compare levels (e.g., species) or select two numeric columns."),
                 div(
                   style = "display:flex;gap:8px;flex-wrap:wrap;",
                   actionButton("run_stat", "Run Analysis", class="btn btn-primary", `aria-label` = "Run statistical analysis"),
                   actionButton("stat_show_code", HTML("View stats code <span aria-hidden='true'>🧾</span>"), class = "btn btn-default", `aria-label` = "View generated R statistics code")
                 )
               ),
               mainPanel(
                 h4("Results"),
                 conditionalPanel(
                   condition = "output.has_stat_result === false",
                   div(class = "text-center", style = "padding:20px;border:2px dashed #dfecec;border-radius:8px;color:#4f5d5d;",
                       icon("chart-bar", class = "fa-2x"),
                       p(style = "margin-top:10px;font-weight:600;", "No analysis run"),
                       p(style = "font-size:13px;", "Configure your test and click 'Run Analysis' to see results.")
                   )
                 ),
                 conditionalPanel(
                   condition = "output.has_stat_result === true",
                   uiOutput("stat_output")
                 )
               )
             )
    )
  ),
  tags$footer(
    class = "app-footer",
    tags$span(
      "Built by ",
      tags$a(
        "Noah Weidig",
        href = "https://noahweidig.com",
        target = "_blank",
        rel = "noopener noreferrer"
      )      
    )
  )
)

server <- function(input, output, session) {
  
  read_delim_auto <- function(path, header = TRUE) {
    first <- readr::read_lines(path, n_max = 1)
    sep <- if (stringr::str_detect(first, "\t")) "\t" else ","
    readr::read_delim(path, delim = sep, col_names = header, show_col_types = FALSE)
  }
  
  # Cached as a reactive to prevent re-parsing the file on every downstream invalidation
  uploaded_data <- reactive({
    file <- input$file
    if (is.null(file)) {
      return(NULL)
    }
    ext <- tools::file_ext(file$name) %>% tolower()
    x <- switch(
      ext,
      "csv"  = read_delim_auto(file$datapath, input$header),
      "tsv"  = read_delim_auto(file$datapath, input$header),
      "xlsx" = read_excel(file$datapath),
      "xls"  = read_excel(file$datapath),
      read_delim_auto(file$datapath, input$header)
    )
    attempt_date_parsing <- function(col) {
      # Fast-path: sample up to 100 non-NA values to test for date format
      # This prevents expensive O(n) regex parsing on large text columns
      # Optimization: Use [!is.na(col)] instead of na.omit() to avoid creating omission attributes
      non_na_col <- if (anyNA(col)) col[!is.na(col)] else col
      if (length(non_na_col) == 0) return(col)

      sample_vals <- head(non_na_col, 100)
      sample_parsed <- parse_date_time(sample_vals, orders = c("ymd", "mdy", "dmy"), quiet = TRUE)

      # If no values in the sample parsed successfully, skip full column parse
      if (all(is.na(sample_parsed))) {
        return(col)
      }

      # Otherwise perform full parse
      parsed <- parse_date_time(col, orders = c("ymd", "mdy", "dmy"), quiet = TRUE)
      if (any(!is.na(parsed))) {
        parsed
      } else {
        col
      }
    }

    x <- clean_names(x)
    char_cols <- vapply(x, is.character, logical(1), USE.NAMES = FALSE)
    if (any(char_cols)) {
      x[char_cols] <- lapply(x[char_cols], function(col) {
        col[which(col == "")] <- NA_character_
        attempt_date_parsing(col)
      })
    }
    x
  })

  observe({
    file <- input$file
    choices <- sample_dataset_choices
    if (!is.null(file)) {
      upload_label <- paste0("Uploaded: ", file$name)
      choices <- c(setNames("upload", upload_label), choices)
    }
    current <- isolate(input$data_source)
    valid_values <- unname(choices)
    selected <- current
    if (is.null(selected) || !selected %in% valid_values) {
      selected <- if (!is.null(file)) "upload" else default_dataset_id
    }
    updateSelectInput(session, "data_source", choices = choices, selected = selected)
  })

  observeEvent(input$file, {
    if (!is.null(input$file)) {
      updateSelectInput(session, "data_source", selected = "upload")
    }
  })

  active_dataset <- reactive({
    selection <- input$data_source
    if (is.null(selection)) {
      selection <- default_dataset_id
    }
    valid_values <- c("upload", names(sample_datasets))
    if (!selection %in% valid_values) {
      selection <- default_dataset_id
    }
    if (identical(selection, "upload")) {
      file <- input$file
      if (!is.null(file)) {
        data <- uploaded_data()
        return(list(
          id = "upload",
          name = if (!is.null(file$name)) file$name else "Uploaded data",
          description = if (!is.null(file$name)) paste0("Data imported from ", file$name, ".") else "Uploaded data.",
          source_type = "upload",
          data = data
        ))
      }
      selection <- default_dataset_id
    }
    sample <- sample_datasets[[selection]]
    data <- sample$loader()
    list(
      id = selection,
      name = sample$name,
      description = sample$description,
      source_type = "sample",
      data = data
    )
  })

  dat <- reactive({
    info <- active_dataset()
    req(info$data)
    info$data
  })
  
  `%||%` <- function(x, y) if (!is.null(x)) x else y
  
  summarise_default_name <- function(fn, column) {
    fn <- fn %||% ""
    column <- column %||% ""
    if (identical(fn, "n")) {
      return("n")
    }
    base <- if (nzchar(column)) paste(fn, column, sep = "_") else paste0(fn, "_result")
    gsub("[^A-Za-z0-9_]", "_", base)
  }

  dataset_column_summary <- function(df) {
    if (is.null(df) || ncol(df) == 0) {
      return(list())
    }
    classify <- function(x) {
      if (inherits(x, c("Date", "POSIXct", "POSIXlt"))) return("date")
      if (is.numeric(x)) return("numeric")
      if (is.logical(x)) return("logical")
      if (is.factor(x) || is.ordered(x)) return("categorical")
      if (is.character(x)) return("text")
      "other"
    }
    types <- vapply(df, classify, character(1), USE.NAMES = TRUE)
    groups <- split(names(types), types)
    groups <- groups[lengths(groups) > 0]
    if (length(groups) == 0) {
      return(list())
    }
    type_labels <- c(
      numeric = "Numeric",
      categorical = "Categorical",
      text = "Text",
      date = "Date / time",
      logical = "Logical",
      other = "Other"
    )
    lapply(names(groups), function(type) {
      cols <- groups[[type]]
      label <- type_labels[[type]] %||% stringr::str_to_title(type)
      preview <- paste(cols[seq_len(min(length(cols), 5))], collapse = ", ")
      extra <- if (length(cols) > 5) paste0(" +", length(cols) - 5, " more") else ""
      tags$li(tags$strong(label), ": ", preview, extra)
    })
  }

  dataset_overview_content <- function(info, include_description = TRUE, show_name = FALSE) {
    df <- info$data
    if (is.null(df)) {
      return(NULL)
    }
    pieces <- list()
    if (isTRUE(show_name)) {
      pieces <- append(pieces, list(tags$p(tags$strong(info$name))))
    }
    description <- info$description %||% ""
    if (isTRUE(include_description) && nzchar(description)) {
      pieces <- append(pieces, list(tags$p(class = "dataset-description", description)))
    }
    dims <- sprintf(
      "%s rows × %s columns",
      scales::comma(nrow(df)),
      scales::comma(ncol(df))
    )
    pieces <- append(pieces, list(tags$p(class = "dataset-dimensions", dims)))
    column_items <- dataset_column_summary(df)
    if (length(column_items) > 0) {
      pieces <- append(
        pieces,
        list(
          tags$div(
            class = "dataset-column-summary",
            tags$strong("Key columns"),
            tags$ul(class = "dataset-column-list", column_items)
          )
        )
      )
    }
    do.call(tagList, pieces)
  }

  wrangle_steps <- reactiveVal(list())
  wrangle_selected <- reactiveVal(NULL)

  wrangle_mutate_name_d     <- reactive(input$wrangle_mutate_name)     |> debounce(500)
  wrangle_mutate_expr_d     <- reactive(input$wrangle_mutate_expr)     |> debounce(500)
  wrangle_rename_new_d      <- reactive(input$wrangle_rename_new)      |> debounce(500)
  wrangle_filter_expr_d     <- reactive(input$wrangle_filter_expr)     |> debounce(500)
  wrangle_replace_na_val_d  <- reactive(input$wrangle_replace_na_value)|> debounce(500)
  wrangle_summarize_name_d  <- reactive(input$wrangle_summarize_name)  |> debounce(500)
  wrangle_longer_names_to_d <- reactive(input$wrangle_longer_names_to) |> debounce(500)
  wrangle_longer_values_to_d<- reactive(input$wrangle_longer_values_to)|> debounce(500)
  
  generate_step_id <- function(type) {
    timestamp_ms <- as.integer(as.numeric(Sys.time()) * 1000)
    paste0(type, "_", timestamp_ms, sample(1000:9999, 1))
  }
  
  wrangle_step_title <- function(type) {
    opts <- wrangle_step_options()
    label <- names(opts)[match(type, opts)]
    ifelse(is.na(label), type, label)
  }
  
  truncate_text <- function(text, max = 60) {
    if (is.null(text) || !nzchar(text)) return("")
    if (nchar(text) <= max) return(text)
    paste0(substr(text, 1, max - 3), "...")
  }
  
  wrangle_step_summary <- function(step) {
    args <- step$args
    type <- step$type
    switch(
      type,
      "select" = {
        cols <- args$columns
        if (is.null(cols) || length(cols) == 0) {
          if (identical(args$mode, "drop")) "Drop no columns" else "Keep all columns"
        } else {
          prefix <- if (identical(args$mode, "drop")) "Drop" else "Keep"
          paste0(prefix, ": ", paste(cols, collapse = ", "))
        }
      },
      "mutate" = {
        name <- args$name %||% ""
        expr <- args$expression %||% ""
        if (!nzchar(name) && !nzchar(expr)) "Add a new column" else paste0(name, " = ", truncate_text(expr, 40))
      },
      "rename" = {
        column <- args$column %||% ""
        new_name <- args$new_name %||% ""
        if (!nzchar(column) || !nzchar(new_name)) "Rename column" else paste0(column, " → ", new_name)
      },
      "filter" = {
        expr <- args$expression %||% ""
        if (!nzchar(expr)) "Filter rows" else truncate_text(expr, 60)
      },
      "sample" = {
        mode <- args$mode %||% "n"
        size <- args$size %||% 1
        replace <- if (isTRUE(args$replace)) "with replacement" else "without replacement"
        if (identical(mode, "prop")) paste0("Sample ", size, " fraction ", replace) else paste0("Sample ", size, " rows ", replace)
      },
      "distinct" = {
        cols <- args$columns
        if (is.null(cols) || length(cols) == 0) "Distinct rows across all columns" else paste0("Distinct on: ", paste(cols, collapse = ", "))
      },
      "drop_na" = {
        cols <- args$columns
        if (is.null(cols) || length(cols) == 0) "Drop rows with any missing value" else paste0("Drop NA in: ", paste(cols, collapse = ", "))
      },
      "replace_na" = {
        column <- args$column %||% ""
        value <- args$value %||% ""
        if (!nzchar(column)) "Fill missing values" else paste0("Replace NA in ", column, " with ", value)
      },
      "group_by" = {
        cols <- args$columns
        if (is.null(cols) || length(cols) == 0) "Ungroup data" else paste0("Group by: ", paste(cols, collapse = ", "))
      },
      "summarize" = {
        fn <- args$fn %||% ""
        column <- args$column %||% ""
        name <- args$name %||% summarise_default_name(fn, column)
        if (identical(fn, "n")) paste0(name, " = n()")
        else if (identical(fn, "n_distinct")) paste0(name, " = n_distinct(", column, ")")
        else paste0(name, " = ", fn, "(", column, ")")
      },
      "pivot_longer" = {
        cols <- args$columns
        names_to <- args$names_to %||% "name"
        values_to <- args$values_to %||% "value"
        if (is.null(cols) || length(cols) == 0) "Select columns to pivot" else paste0("Columns → ", names_to, "/", values_to)
      },
      "pivot_wider" = {
        nf <- args$names_from %||% ""
        vf <- args$values_from %||% ""
        if (!nzchar(nf) || !nzchar(vf)) "Configure names and values columns" else paste0("Names from ", nf, ", values from ", vf)
      },
      ""
    )
  }
  
  default_wrangle_args <- function(type, data = NULL) {
    cols <- if (!is.null(data)) names(data) else character(0)
    num_cols <- if (!is.null(data)) cols[vapply(data, is.numeric, logical(1))] else character(0)
    first_col <- if (length(cols) > 0) cols[1] else ""
    second_col <- if (length(cols) > 1) cols[2] else ""
    first_num <- if (length(num_cols) > 0) num_cols[1] else ""
    switch(
      type,
      "select" = list(columns = character(0), mode = "keep"),
      "mutate" = list(name = "new_column", expression = ""),
      "rename" = list(column = first_col, new_name = if (nzchar(first_col)) paste0(first_col, "_renamed") else ""),
      "filter" = list(expression = ""),
      "sample" = list(mode = "n", size = if (!is.null(data)) min(10, nrow(data)) else 10, replace = FALSE),
      "distinct" = list(columns = character(0), keep_all = TRUE),
      "drop_na" = list(columns = character(0)),
      "replace_na" = list(column = first_col, value = ""),
      "group_by" = list(columns = character(0), drop = TRUE),
      "summarize" = {
        default_col <- if (nzchar(first_num)) first_num else first_col
        list(fn = "mean", column = default_col, name = summarise_default_name("mean", default_col), na_rm = TRUE, auto_name = TRUE)
      },
      "pivot_longer" = list(columns = character(0), names_to = "name", values_to = "value", drop_na = FALSE),
      "pivot_wider" = list(names_from = first_col, values_from = second_col),
      list()
    )
  }
  
  parse_date_value <- function(value) {
    if (is.null(value) || !nzchar(value)) stop("Provide a replacement value.")
    parsed <- suppressWarnings(as.Date(value))
    if (is.na(parsed)) {
      dt <- suppressWarnings(parse_date_time(value, orders = c("ymd", "mdy", "dmy"), quiet = TRUE))
      if (all(is.na(dt))) stop("Unable to parse date value.")
      parsed <- as.Date(dt)
    }
    parsed
  }
  
  parse_datetime_value <- function(value) {
    if (is.null(value) || !nzchar(value)) stop("Provide a replacement value.")
    dt <- suppressWarnings(parse_date_time(value,
                                           orders = c("ymd HMS", "ymd HM", "ymd", "mdy HMS", "mdy HM", "mdy",
                                                      "dmy HMS", "dmy HM", "dmy"),
                                           quiet = TRUE))
    if (all(is.na(dt))) stop("Unable to parse date-time value.")
    dt[1]
  }
  
  replace_missing_column <- function(column_data, value_string) {
    # Optimization: Use anyNA() instead of any(is.na()) for faster, short-circuiting NA checks without allocation overhead
    if (!anyNA(column_data)) return(column_data)
    if (is.factor(column_data)) {
      replacement <- as.character(value_string)
      levels(column_data) <- union(levels(column_data), replacement)
      column_data[is.na(column_data)] <- replacement
      return(column_data)
    }
    if (inherits(column_data, "Date")) {
      replacement <- parse_date_value(value_string)
      column_data[is.na(column_data)] <- replacement
      return(column_data)
    }
    if (inherits(column_data, "POSIXct")) {
      replacement <- parse_datetime_value(value_string)
      column_data[is.na(column_data)] <- replacement
      return(column_data)
    }
    if (is.integer(column_data)) {
      replacement <- suppressWarnings(as.integer(value_string))
      if (is.na(replacement)) stop("Replacement must be an integer.")
      column_data[is.na(column_data)] <- replacement
      return(column_data)
    }
    if (is.numeric(column_data)) {
      replacement <- suppressWarnings(as.numeric(value_string))
      if (is.na(replacement)) stop("Replacement must be numeric.")
      column_data[is.na(column_data)] <- replacement
      return(column_data)
    }
    if (is.logical(column_data)) {
      val <- tolower(trimws(value_string))
      if (val %in% c("true", "t", "yes", "y", "1")) replacement <- TRUE
      else if (val %in% c("false", "f", "no", "n", "0")) replacement <- FALSE
      else stop("Replacement must be TRUE or FALSE.")
      column_data[is.na(column_data)] <- replacement
      return(column_data)
    }
    column_data[is.na(column_data)] <- value_string
    column_data
  }
  
  # Security check: ensures user-supplied expressions only contain safe functions/operators
  # thereby preventing RCE (Remote Code Execution) via `eval` / `system` injections.
  is_safe_expr <- function(expr) {
    if (is.atomic(expr) || is.name(expr)) {
      return(TRUE)
    }
    if (is.call(expr)) {
      # Handle potential namespaced calls like dplyr::n
      if (is.call(expr[[1]]) && identical(as.character(expr[[1]][[1]]), "::")) {
        fn_name <- as.character(expr[[1]][[3]])
      } else {
        fn_name <- as.character(expr[[1]])
      }

      if (length(fn_name) != 1) {
        return(FALSE)
      }

      safe_funcs <- c(
        "+", "-", "*", "/", "^", "%%", "%/%", "(", "[", "[[", ":",
        "==", "!=", "<", "<=", ">", ">=", "&", "|", "!", "%in%",
        "c", "mean", "sum", "paste", "paste0", "ifelse", "is.na",
        "abs", "round", "floor", "ceiling", "tolower", "toupper",
        "as.numeric", "as.character", "as.logical", "as.integer", "as.Date",
        "str_detect", "str_replace", "str_replace_all", "n", "n_distinct",
        "min", "max", "sd", "var", "median", "length", "log", "log10", "exp", "sqrt"
      )
      if (!fn_name %in% safe_funcs) {
        return(FALSE)
      }

      if (length(expr) > 1) {
        for (i in seq_along(expr)[-1]) {
          if (!is_safe_expr(expr[[i]])) {
            return(FALSE)
          }
        }
      }
      return(TRUE)
    }
    return(FALSE)
  }

  apply_wrangle_step_single <- function(df, step) {
    args <- step$args
    type <- step$type
    switch(
      type,
      "select" = {
        cols <- args$columns
        if (is.null(cols) || length(cols) == 0) {
          df
        } else if (identical(args$mode, "drop")) {
          df %>% select(-all_of(cols))
        } else {
          df %>% select(all_of(cols))
        }
      },
      "mutate" = {
        name <- args$name %||% ""
        expr <- args$expression %||% ""
        if (!nzchar(name)) stop("Provide a name for the new column.")
        if (!nzchar(expr)) stop("Provide an expression for the new column.")
        parsed_expr <- rlang::parse_expr(expr)
        if (!is_safe_expr(parsed_expr)) {
          stop("Expression contains unauthorized function calls or operations for security reasons.")
        }
        df %>% mutate(!!rlang::sym(name) := !!parsed_expr)
      },
      "rename" = {
        column <- args$column %||% ""
        new_name <- args$new_name %||% ""
        if (!nzchar(column) || !nzchar(new_name)) stop("Choose a column and enter a new name.")
        if (!column %in% names(df)) stop("Column not found in the data.")
        names(df)[names(df) == column] <- new_name
        df
      },
      "filter" = {
        expr <- args$expression %||% ""
        if (!nzchar(expr)) stop("Provide a filter expression.")
        parsed_expr <- rlang::parse_expr(expr)
        if (!is_safe_expr(parsed_expr)) {
          stop("Expression contains unauthorized function calls or operations for security reasons.")
        }
        df %>% filter(!!parsed_expr)
      },
      "sample" = {
        mode <- args$mode %||% "n"
        size <- as.numeric(args$size)
        if (is.na(size)) stop("Provide a sample size.")
        replace <- isTRUE(args$replace)
        if (identical(mode, "prop")) {
          if (size < 0 || size > 1) stop("Fraction must be between 0 and 1.")
          df %>% slice_sample(prop = size, replace = replace)
        } else {
          if (size < 0) stop("Sample size must be non-negative.")
          if (size > 1e6) stop("Sample size cannot exceed 1,000,000 to prevent memory exhaustion.")
          df %>% slice_sample(n = floor(size), replace = replace)
        }
      },
      "distinct" = {
        cols <- args$columns
        keep_all <- isTRUE(args$keep_all)
        if (is.null(cols) || length(cols) == 0) {
          df %>% distinct(.keep_all = keep_all)
        } else {
          # Optimization: Use pick(all_of(cols)) instead of across(all_of(cols)) inside distinct()
          # to avoid across() evaluation overhead and evaluate tidyselect natively.
          df %>% distinct(pick(all_of(cols)), .keep_all = keep_all)
        }
      },
      "drop_na" = {
        cols <- args$columns
        if (is.null(cols) || length(cols) == 0) {
          df %>% drop_na()
        } else {
          df %>% drop_na(all_of(cols))
        }
      },
      "replace_na" = {
        column <- args$column %||% ""
        if (!nzchar(column)) stop("Choose a column to fill.")
        if (!column %in% names(df)) stop("Column not found in the data.")
        value <- args$value %||% ""
        df[[column]] <- replace_missing_column(df[[column]], value)
        df
      },
      "group_by" = {
        cols <- args$columns
        drop <- isTRUE(args$drop)
        if (is.null(cols) || length(cols) == 0) {
          df %>% ungroup()
        } else {
          # Optimization: Use pick(all_of(cols)) instead of across(all_of(cols)) inside group_by()
          # to avoid across() evaluation overhead and evaluate tidyselect natively.
          df %>% group_by(pick(all_of(cols)), .drop = drop)
        }
      },
      "summarize" = {
        fn <- args$fn %||% ""
        column <- args$column %||% ""
        name <- args$name %||% summarise_default_name(fn, column)
        na_rm <- isTRUE(args$na_rm)
        if (identical(fn, "n")) {
          df %>% summarise(!!name := dplyr::n())
        } else if (identical(fn, "n_distinct")) {
          if (!nzchar(column)) stop("Choose a column for n_distinct.")
          df %>% summarise(!!name := dplyr::n_distinct(.data[[column]]))
        } else {
          if (!nzchar(column)) stop("Choose a column to summarise.")
          if (!fn %in% c("mean", "median", "sum", "min", "max", "sd")) {
            stop("Invalid summary function.")
          }
          fun <- match.fun(fn)
          df %>% summarise(!!name := fun(.data[[column]], na.rm = na_rm))
        }
      },
      "pivot_longer" = {
        cols <- args$columns
        if (is.null(cols) || length(cols) == 0) stop("Select one or more columns to pivot.")
        names_to <- args$names_to %||% "name"
        values_to <- args$values_to %||% "value"
        drop_na <- isTRUE(args$drop_na)
        df %>% pivot_longer(cols = all_of(cols), names_to = names_to, values_to = values_to, values_drop_na = drop_na)
      },
      "pivot_wider" = {
        names_from <- args$names_from %||% ""
        values_from <- args$values_from %||% ""
        if (!nzchar(names_from) || !nzchar(values_from)) stop("Choose both names and values columns.")
        df %>% pivot_wider(names_from = !!rlang::sym(names_from), values_from = !!rlang::sym(values_from))
      },
      df
    )
  }

  wrangle_steps_to_script <- function(steps, input_name = "input_data", output_name = "wrangled_data") {
    if (is.null(steps)) steps <- list()

    needs_tidyr <- any(vapply(steps, function(step) {
      type <- step$type %||% ""
      type %in% c("drop_na", "replace_na", "pivot_longer", "pivot_wider")
    }, logical(1), USE.NAMES = FALSE))

    escape_string <- function(x) {
      x <- gsub("\\\\", "\\\\\\\\", x)
      x <- gsub("\"", "\\\"", x)
      paste0("\"", x, "\"")
    }

    format_all_of <- function(cols) {
      cols <- cols[!is.na(cols) & nzchar(cols)]
      if (length(cols) == 0) {
        return("everything()")
      }
      quoted <- vapply(cols, escape_string, character(1))
      if (length(quoted) == 1) {
        sprintf("all_of(%s)", quoted)
      } else {
        sprintf("all_of(c(%s))", paste(quoted, collapse = ", "))
      }
    }

    format_bool <- function(x) {
      if (isTRUE(x)) "TRUE" else "FALSE"
    }

    format_name <- function(name) {
      if (is.null(name) || !nzchar(name)) return("` `")
      valid <- grepl("^[A-Za-z.][A-Za-z0-9._]*$", name) && !grepl("^\\d", name)
      if (valid) {
        name
      } else {
        backticked <- gsub("`", "\\`", name, fixed = TRUE)
        paste0("`", backticked, "`")
      }
    }

    format_literal <- function(value) {
      if (is.null(value) || length(value) == 0) return("NA")
      value <- as.character(value[[1]])
      trimmed <- trimws(value)
      if (!nzchar(trimmed)) return("\"\"")

      int_val <- suppressWarnings(as.integer(trimmed))
      if (!is.na(int_val) && identical(trimmed, as.character(int_val))) {
        return(as.character(int_val))
      }

      num_val <- suppressWarnings(as.numeric(trimmed))
      if (!is.na(num_val)) {
        return(format(num_val, scientific = FALSE, trim = TRUE))
      }

      low <- tolower(trimmed)
      if (low %in% c("true", "t", "yes", "y")) return("TRUE")
      if (low %in% c("false", "f", "no", "n")) return("FALSE")

      date_val <- suppressWarnings(as.Date(trimmed))
      if (!is.na(date_val)) {
        return(sprintf("as.Date(%s)", escape_string(as.character(date_val))))
      }

      if (grepl(":", trimmed) || grepl("t", trimmed, ignore.case = TRUE) || grepl(" ", trimmed, fixed = TRUE)) {
        dt_val <- suppressWarnings(as.POSIXct(trimmed, tz = "UTC"))
        if (!is.na(dt_val)) {
          iso <- format(dt_val, "%Y-%m-%d %H:%M:%S", tz = "UTC")
          return(sprintf("as.POSIXct(%s, tz = \"UTC\")", escape_string(iso)))
        }
      }

      escape_string(trimmed)
    }

    lines <- c("# Packages required for the pipeline", "library(dplyr)")
    if (needs_tidyr) {
      lines <- c(lines, "library(tidyr)")
    }
    lines <- c(lines, "", sprintf("# Replace `%s` below with the name of your data frame.", input_name))

    assignment <- sprintf("%s <- %s", output_name, input_name)
    if (length(steps) > 0) {
      assignment <- paste0(assignment, " %>%")
    }
    lines <- c(lines, assignment)

    if (length(steps) == 0) {
      lines <- c(lines, "# No wrangle steps were configured; the data will remain unchanged.")
      return(paste(lines, collapse = "\n"))
    }

    step_lines <- vector("list", length(steps))
    for (i in seq_along(steps)) {
      step <- steps[[i]]
      if (is.null(step)) next

      type <- step$type %||% ""
      args <- step$args %||% list()
      title <- wrangle_step_title(type)
      summary <- wrangle_step_summary(step)
      comment <- if (nzchar(summary)) paste(title, "-", summary) else title
      if (!nzchar(comment)) comment <- "Configured step"
      note <- NULL

      if (identical(type, "select")) {
        cols <- args$columns
        mode <- args$mode %||% "keep"
        if (is.null(cols) || length(cols) == 0) {
          note <- if (identical(mode, "drop")) "no columns selected to drop" else "keeping all columns"
          code <- "identity()"
        } else {
          expr <- format_all_of(cols)
          if (identical(mode, "drop")) {
            code <- sprintf("select(-%s)", expr)
          } else {
            code <- sprintf("select(%s)", expr)
          }
        }
      } else if (identical(type, "mutate")) {
        name <- args$name %||% ""
        expr <- args$expression %||% ""
        if (!nzchar(name) || !nzchar(expr)) {
          note <- "configure column name and expression"
          code <- "identity()"
        } else {
          code <- sprintf("mutate(%s = %s)", format_name(name), expr)
        }
      } else if (identical(type, "rename")) {
        column <- args$column %||% ""
        new_name <- args$new_name %||% ""
        if (!nzchar(column) || !nzchar(new_name)) {
          note <- "requires original and new names"
          code <- "identity()"
        } else {
          code <- sprintf("rename(%s = %s)", format_name(new_name), format_name(column))
        }
      } else if (identical(type, "filter")) {
        expr <- args$expression %||% ""
        if (!nzchar(expr)) {
          note <- "add a filter expression"
          code <- "identity()"
        } else {
          code <- sprintf("filter(%s)", expr)
        }
      } else if (identical(type, "sample")) {
        mode <- args$mode %||% "n"
        size <- suppressWarnings(as.numeric(args$size))
        if (is.na(size)) {
          note <- "sample size is not set"
          code <- "identity()"
        } else if (identical(mode, "prop")) {
          code <- sprintf("slice_sample(prop = %s, replace = %s)",
                          format(size, trim = TRUE), format_bool(args$replace))
        } else {
          n_val <- max(0, floor(size))
          code <- sprintf("slice_sample(n = %s, replace = %s)",
                          format(n_val, trim = TRUE), format_bool(args$replace))
        }
      } else if (identical(type, "distinct")) {
        cols <- args$columns
        keep_all <- format_bool(args$keep_all)
        if (is.null(cols) || length(cols) == 0) {
          code <- sprintf("distinct(.keep_all = %s)", keep_all)
        } else {
          code <- sprintf("distinct(pick(%s), .keep_all = %s)", format_all_of(cols), keep_all)
        }
      } else if (identical(type, "drop_na")) {
        cols <- args$columns
        if (is.null(cols) || length(cols) == 0) {
          code <- "drop_na()"
        } else {
          code <- sprintf("drop_na(%s)", format_all_of(cols))
        }
      } else if (identical(type, "replace_na")) {
        column <- args$column %||% ""
        value <- args$value %||% ""
        if (!nzchar(column)) {
          note <- "select a column to fill"
          code <- "identity()"
        } else {
          col_name <- format_name(column)
          value_code <- format_literal(value)
          code <- sprintf("mutate(%s = replace_na(%s, %s))", col_name, col_name, value_code)
        }
      } else if (identical(type, "group_by")) {
        cols <- args$columns
        drop <- format_bool(args$drop)
        if (is.null(cols) || length(cols) == 0) {
          code <- "ungroup()"
        } else {
          code <- sprintf("group_by(pick(%s), .drop = %s)", format_all_of(cols), drop)
        }
      } else if (identical(type, "summarize")) {
        fn <- args$fn %||% "mean"
        column <- args$column %||% ""
        name <- args$name %||% summarise_default_name(fn, column)
        na_rm <- format_bool(args$na_rm)
        if (identical(fn, "n")) {
          code <- sprintf("summarise(%s = dplyr::n())", format_name(name))
        } else if (identical(fn, "n_distinct")) {
          if (!nzchar(column)) {
            note <- "choose a column for n_distinct"
            code <- "identity()"
          } else {
            code <- sprintf("summarise(%s = dplyr::n_distinct(%s))", format_name(name), format_name(column))
          }
        } else {
          if (!nzchar(column)) {
            note <- "choose a column to summarise"
            code <- "identity()"
          } else {
            code <- sprintf("summarise(%s = %s(%s, na.rm = %s))",
                            format_name(name), fn, format_name(column), na_rm)
          }
        }
      } else if (identical(type, "pivot_longer")) {
        cols <- args$columns
        names_to <- args$names_to %||% "name"
        values_to <- args$values_to %||% "value"
        drop_na <- format_bool(args$drop_na)
        if (is.null(cols) || length(cols) == 0) {
          note <- "select columns to pivot"
          code <- "identity()"
        } else {
          code <- sprintf("pivot_longer(cols = %s, names_to = %s, values_to = %s, values_drop_na = %s)",
                          format_all_of(cols), escape_string(names_to), escape_string(values_to), drop_na)
        }
      } else if (identical(type, "pivot_wider")) {
        names_from <- args$names_from %||% ""
        values_from <- args$values_from %||% ""
        if (!nzchar(names_from) || !nzchar(values_from)) {
          note <- "choose both names and values columns"
          code <- "identity()"
        } else {
          code <- sprintf("pivot_wider(names_from = %s, values_from = %s)",
                          format_all_of(names_from), format_all_of(values_from))
        }
      } else {
        note <- sprintf("step type '%s' is not supported", type)
        code <- "identity()"
      }

      if (!is.null(note) && nzchar(note)) {
        comment <- paste0(comment, " (", note, ")")
      }

      step_lines[[i]] <- c(
        sprintf("  # Step %s: %s", i, comment),
        paste0("  ", if (i < length(steps)) paste0(code, " %>%") else code)
      )
    }

    paste(c(lines, unlist(step_lines)), collapse = "\n")
  }

  code_quote <- function(x) {
    if (is.null(x) || length(x) == 0) return("\"\"")
    encodeString(as.character(x), quote = "\"")
  }

  code_format_number <- function(x) {
    if (is.null(x) || length(x) == 0 || anyNA(x)) {
      return("NA")
    }
    format(x, digits = 6, trim = TRUE, scientific = FALSE)
  }

  code_format_vector <- function(values) {
    if (is.null(values) || length(values) == 0) {
      return("c()")
    }
    quoted <- vapply(values, code_quote, character(1))
    paste0("c(", paste(quoted, collapse = ", "), ")")
  }

  code_data_column <- function(column, data_name = "analysis_data") {
    sprintf("%s[[%s]]", data_name, code_quote(column))
  }

  code_copy_js <- function(button_id, code_id, status_id) {
    sprintf("(function(){\n  $(document).off('click', '#%1$s').on('click', '#%1$s', function(){\n    var codeEl = document.getElementById('%2$s');\n    if (!codeEl) { return; }\n    var text = codeEl.innerText;\n    var status = $('#%3$s');\n    var showStatus = function(message, color){\n      status.stop(true, true).text(message).css('color', color).fadeIn(120).delay(1800).fadeOut(300);\n    };\n    if (!navigator.clipboard || !navigator.clipboard.writeText) {\n      var textarea = document.createElement('textarea');\n      textarea.value = text;\n      textarea.style.position = 'fixed';\n      textarea.style.opacity = '0';\n      document.body.appendChild(textarea);\n      textarea.focus();\n      textarea.select();\n      try {\n        var successful = document.execCommand('copy');\n        showStatus(successful ? 'Copied!' : 'Copy failed', successful ? '#008080' : '#c0392b');\n      } catch (err) {\n        showStatus('Copy not supported', '#c0392b');\n      }\n      document.body.removeChild(textarea);\n      return;\n    }\n    navigator.clipboard.writeText(text).then(function(){\n      showStatus('Copied!', '#008080');\n    }).catch(function(){\n      showStatus('Copy failed', '#c0392b');\n    });\n  });\n})();",
            button_id, code_id, status_id)
  }

  show_code_modal <- function(title, description, code, copy_id, status_id, code_id) {
    if (is.null(code) || length(code) == 0) {
      code <- "# No code available for the current configuration."
    }
    showModal(modalDialog(
      title = title,
      size = "l",
      easyClose = TRUE,
      footer = modalButton("Close"),
      tags$p(description),
      tags$div(
        style = "margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;",
        tags$button(
          id = copy_id,
          type = "button",
          class = "btn btn-default btn-sm",
          `aria-label` = "Copy code to clipboard",
          HTML("Copy to clipboard <span aria-hidden='true'>📋</span>")
        ),
        tags$span(
          id = status_id,
          style = "display:none;font-weight:600;color:#008080;",
          `aria-live` = "polite",
          "Copied!"
        )
      ),
      tags$pre(
        id = code_id,
        style = paste(
          "max-height:420px;overflow-y:auto;",
          "background:#f4fbfb;border:1px solid #dfecec;",
          "border-radius:8px;padding:12px;font-size:13px;"
        ),
        paste(code, collapse = "\n")
      ),
      tags$script(HTML(code_copy_js(copy_id, code_id, status_id)))
    ))
  }

  apply_wrangle_pipeline <- function(df, steps) {
    if (length(steps) == 0) {
      return(list(data = df, message = NULL, message_type = NULL))
    }
    current <- df
    for (step in steps) {
      res <- tryCatch(apply_wrangle_step_single(current, step), error = function(e) e)
      if (inherits(res, "error")) {
        title <- wrangle_step_title(step$type)
        summary <- wrangle_step_summary(step)
        detail <- if (nzchar(summary)) paste(title, "-", summary) else title
        return(list(
          data = current,
          message = paste0("Step '", detail, "' failed: ", conditionMessage(res)),
          message_type = "warning"
        ))
      }
      current <- res
    }
    list(
      data = current,
      message = paste0("Applied ", length(steps), " step(s)."),
      message_type = "success"
    )
  }

  wrangle_data_after_steps <- function(data, steps_subset) {
    if (is.null(data)) {
      return(NULL)
    }
    if (is.null(steps_subset) || length(steps_subset) == 0) {
      return(data)
    }
    result <- apply_wrangle_pipeline(data, steps_subset)
    result$data %||% data
  }
  
  observe({
    req(dat())
    cols <- names(dat())

    longer_sel <- input$wrangle_longer_cols
    if (is.null(longer_sel)) longer_sel <- character(0)

    names_from_sel <- input$wrangle_names_from
    if (is.null(names_from_sel) || length(names_from_sel) == 0 || !names_from_sel[1] %in% cols) {
      names_from_sel <- character(0)
    } else {
      names_from_sel <- names_from_sel[1]
    }

    values_from_sel <- input$wrangle_values_from
    if (is.null(values_from_sel) || length(values_from_sel) == 0 || !values_from_sel[1] %in% cols) {
      values_from_sel <- character(0)
    } else {
      values_from_sel <- values_from_sel[1]
    }

    updateSelectizeInput(
      session,
      "wrangle_longer_cols",
      choices = cols,
      selected = intersect(longer_sel, cols)
    )
    updateSelectizeInput(
      session,
      "wrangle_names_from",
      choices = cols,
      selected = names_from_sel
    )
    updateSelectizeInput(
      session,
      "wrangle_values_from",
      choices = cols,
      selected = values_from_sel
    )
  })
  
  observe({
    steps <- wrangle_steps()
    ids <- vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE)
    selected <- wrangle_selected()
    if (length(ids) == 0) {
      if (!is.null(selected)) wrangle_selected(NULL)
    } else if (is.null(selected) || !selected %in% ids) {
      wrangle_selected(ids[1])
    }
  })
  
  observeEvent(input$wrangle_add_btn, {
    req(input$wrangle_add_type)
    steps <- wrangle_steps()
    base_data <- isolate(dat())
    data_snapshot <- wrangle_data_after_steps(base_data, steps)
    new_step <- list(
      id = generate_step_id(input$wrangle_add_type),
      type = input$wrangle_add_type,
      args = default_wrangle_args(input$wrangle_add_type, data_snapshot)
    )
    wrangle_steps(append(steps, list(new_step)))
    wrangle_selected(new_step$id)
  })
  
  observeEvent(input$wrangle_remove_btn, {
    selected <- wrangle_selected()
    req(selected)
    showModal(modalDialog(
      title = HTML("<span aria-hidden='true'>🗑️</span> Confirm Removal"),
      "Are you sure you want to remove this wrangling step? This action cannot be undone.",
      easyClose = TRUE,
      footer = tagList(
        modalButton("Cancel"),
        actionButton("confirm_remove_step", "Remove Step", class = "btn btn-danger text-white", `aria-label` = "Confirm removal of the selected wrangling step")
      )
    ))
  }, ignoreNULL = TRUE)

  observeEvent(input$confirm_remove_step, {
    selected <- wrangle_selected()
    req(selected)
    steps <- wrangle_steps()
    ids <- vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE)
    idx <- match(selected, ids)
    if (!is.na(idx)) {
      steps <- steps[-idx]
      wrangle_steps(steps)
      if (length(steps) == 0) {
        wrangle_selected(NULL)
      } else {
        new_ids <- vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE)
        next_index <- min(idx, length(new_ids))
        wrangle_selected(new_ids[next_index])
      }
    }
    removeModal()
  }, ignoreNULL = TRUE)
  
  observeEvent(input$wrangle_select_step, {
    val <- input$wrangle_select_step
    steps <- wrangle_steps()
    ids <- vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE)
    if (!is.null(val) && val %in% ids) {
      wrangle_selected(val)
    }
  })
  
  observeEvent(input$wrangle_order_changed, {
    order <- input$wrangle_order_changed
    steps <- wrangle_steps()
    ids <- vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE)
    if (!is.null(order) && length(order) == length(ids)) {
      idx <- match(order, ids)
      if (all(!is.na(idx))) {
        wrangle_steps(steps[idx])
      }
    }
  })
  
  output$has_wrangle_steps <- reactive({ length(wrangle_steps()) > 0 })
  outputOptions(output, "has_wrangle_steps", suspendWhenHidden = FALSE)

  output$has_wrangle_selected <- reactive({
    steps <- wrangle_steps()
    selected <- wrangle_selected()
    ids <- vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE)
    !is.null(selected) && selected %in% ids
  })
  outputOptions(output, "has_wrangle_selected", suspendWhenHidden = FALSE)

  output$wrangle_steps_ui <- renderUI({
    steps <- wrangle_steps()
    if (length(steps) == 0) {
      return(NULL)
    }
    selected <- wrangle_selected()
    container <- tags$div(
      id = "wrangle_steps_container",
      lapply(steps, function(step) {
        classes <- "wrangle-step-item"
        is_selected <- !is.null(selected) && identical(selected, step$id)
        if (is_selected) {
          classes <- paste(classes, "selected")
        }
        tags$div(
          class = classes,
          `data-id` = step$id,
          role = "button",
          tabindex = "0",
          `aria-pressed` = if (is_selected) "true" else "false",
          onclick = sprintf("Shiny.setInputValue('%s', '%s', {priority: 'event'});", "wrangle_select_step", step$id),
          onkeydown = sprintf("if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); Shiny.setInputValue('%s', '%s', {priority: 'event'}); }", "wrangle_select_step", step$id),
          tags$div(class = "wrangle-step-title", wrangle_step_title(step$type)),
          tags$div(class = "wrangle-step-summary", wrangle_step_summary(step))
        )
      })
    )
    tagList(
      container,
      sortable::sortable_js(
        "wrangle_steps_container",
        options = sortable::sortable_options(
          animation = 150,
          onSort = htmlwidgets::JS("function(evt){ var order = Array.from(evt.to.children).map(function(el){ return el.dataset.id; }); Shiny.setInputValue('wrangle_order_changed', order, {priority: 'event'}); }")
        )
      )
    )
  })
  
  output$wrangle_step_config <- renderUI({
    base_data <- dat()
    steps <- wrangle_steps()
    ids <- vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE)
    selected <- wrangle_selected()
    if (is.null(selected) || !selected %in% ids) {
      return(NULL)
    }
    idx <- match(selected, ids)
    prior_steps <- if (!is.na(idx) && idx > 1) steps[seq_len(idx - 1)] else list()
    data_snapshot <- wrangle_data_after_steps(base_data, prior_steps)
    columns <- if (is.null(data_snapshot)) character(0) else names(data_snapshot)
    snapshot_rows <- if (is.null(data_snapshot)) 0 else nrow(data_snapshot)
    step <- steps[[idx]]
    tagList(
      tags$div(class = "wrangle-step-title", wrangle_step_title(step$type)),
      switch(
        step$type,
        "select" = {
          tagList(
            helpText("Choose the columns to keep or drop in this step."),
            selectizeInput("wrangle_select_columns", "Columns", choices = columns, selected = step$args$columns, multiple = TRUE, options = list(plugins = list("remove_button"))),
            radioButtons("wrangle_select_mode", "Mode", c("Keep only selected columns" = "keep", "Drop selected columns" = "drop"), selected = step$args$mode %||% "keep")
          )
        },
        "mutate" = {
          tagList(
            textInput("wrangle_mutate_name", "New column name", value = step$args$name %||% ""),
            textAreaInput("wrangle_mutate_expr", "Expression", value = step$args$expression %||% "", rows = 3, placeholder = "e.g. Sepal_length * 0.5"),
            helpText("Use existing column names in the expression to build a new column.")
          )
        },
        "rename" = {
          if (length(columns) == 0) {
            div(class = "alert alert-danger", role = "alert", icon("exclamation-circle"), " No columns available to rename.")
          } else {
            selected_col <- step$args$column
            if (is.null(selected_col) || !selected_col %in% columns) selected_col <- columns[1]
            tagList(
              selectInput("wrangle_rename_column", "Column", choices = columns, selected = selected_col),
              textInput("wrangle_rename_new", "New name", value = step$args$new_name %||% "")
            )
          }
        },
        "filter" = {
          tagList(
            textAreaInput("wrangle_filter_expr", "Expression", value = step$args$expression %||% "", rows = 3, placeholder = "e.g. Sepal_length > 5 & Species == 'setosa'"),
            helpText("Enter a dplyr-compatible expression to keep matching rows.")
          )
        },
        "sample" = {
          mode <- step$args$mode %||% "n"
          current_size <- step$args$size
          if (is.null(current_size)) {
            current_size <- if (identical(mode, "prop")) 0.1 else min(10, snapshot_rows)
          }
          tagList(
            radioButtons("wrangle_sample_mode", "Mode", c("Number of rows" = "n", "Fraction of rows" = "prop"), selected = mode),
            numericInput("wrangle_sample_size", if (identical(mode, "prop")) "Fraction" else "Rows", value = current_size, min = if (identical(mode, "prop")) 0 else 0, max = if (identical(mode, "prop")) 1 else snapshot_rows, step = if (identical(mode, "prop")) 0.01 else 1),
            checkboxInput("wrangle_sample_replace", "With replacement", value = isTRUE(step$args$replace))
          )
        },
        "distinct" = {
          tagList(
            selectizeInput("wrangle_distinct_columns", "Columns", choices = columns, selected = step$args$columns, multiple = TRUE, options = list(plugins = list("remove_button"))),
            checkboxInput("wrangle_distinct_keep", "Keep all additional columns", value = isTRUE(step$args$keep_all))
          )
        },
        "drop_na" = {
          tagList(
            selectizeInput("wrangle_drop_na_columns", "Columns", choices = columns, selected = step$args$columns, multiple = TRUE, options = list(plugins = list("remove_button"))),
            helpText("Leave blank to drop rows with any missing value across all columns.")
          )
        },
        "replace_na" = {
          tagList(
            selectInput("wrangle_replace_na_column", "Column", choices = c("Choose column" = "", columns), selected = step$args$column %||% ""),
            textInput("wrangle_replace_na_value", "Value", value = step$args$value %||% ""),
            if (nzchar(step$args$column %||% "") && step$args$column %in% columns) {
              col_type <- paste(class(data_snapshot[[step$args$column]]), collapse = "/")
              helpText(paste("Column type:", col_type))
            } else NULL
          )
        },
        "group_by" = {
          tagList(
            selectizeInput("wrangle_group_columns", "Columns", choices = columns, selected = step$args$columns, multiple = TRUE, options = list(plugins = list("remove_button"))),
            checkboxInput("wrangle_group_drop", "Drop empty groups", value = isTRUE(step$args$drop))
          )
        },
        "summarize" = {
          fn_choices <- c("Mean" = "mean", "Median" = "median", "Sum" = "sum", "Minimum" = "min", "Maximum" = "max", "Standard deviation" = "sd", "Count rows" = "n", "Count distinct" = "n_distinct")
          selected_fn <- step$args$fn %||% "mean"
          selected_col <- step$args$column %||% ""
          if (nzchar(selected_col) && !selected_col %in% columns) selected_col <- ""
          tagList(
            selectInput("wrangle_summarize_fn", "Function", choices = fn_choices, selected = selected_fn),
            selectInput("wrangle_summarize_column", "Column", choices = c("Choose column" = "", columns), selected = selected_col),
            textInput("wrangle_summarize_name", "Result name", value = step$args$name %||% summarise_default_name(selected_fn, selected_col)),
            checkboxInput("wrangle_summarize_na_rm", "Remove NA values", value = isTRUE(step$args$na_rm)),
            helpText("Add a group step before summarizing to get per-group results.")
          )
        },
        "pivot_longer" = {
          tagList(
            selectizeInput("wrangle_longer_columns", "Columns", choices = columns, selected = step$args$columns, multiple = TRUE, options = list(plugins = list("remove_button"))),
            textInput("wrangle_longer_names_to", "Names column", value = step$args$names_to %||% "name"),
            textInput("wrangle_longer_values_to", "Values column", value = step$args$values_to %||% "value"),
            checkboxInput("wrangle_longer_drop_na", "Drop NA values", value = isTRUE(step$args$drop_na))
          )
        },
        "pivot_wider" = {
          if (length(columns) == 0) {
            div(class = "alert alert-danger", role = "alert", icon("exclamation-circle"), " No columns available to pivot.")
          } else {
            tagList(
              selectInput("wrangle_wider_names_from", "Names from", choices = c("Choose column" = "", columns), selected = step$args$names_from %||% ""),
              selectInput("wrangle_wider_values_from", "Values from", choices = c("Choose column" = "", columns), selected = step$args$values_from %||% "")
            )
          }
        },
        div(class = "alert alert-danger", role = "alert", icon("exclamation-circle"), " Unsupported step type.")
      )
    )
  })
  
  observeEvent(input$wrangle_select_columns, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    ids <- vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE)
    idx <- match(id, ids)
    if (is.na(idx) || steps[[idx]]$type != "select") return()
    cols <- input$wrangle_select_columns
    if (is.null(cols)) cols <- character(0)
    steps[[idx]]$args$columns <- cols
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_select_mode, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    ids <- vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE)
    idx <- match(id, ids)
    if (is.na(idx) || steps[[idx]]$type != "select") return()
    steps[[idx]]$args$mode <- input$wrangle_select_mode
    wrangle_steps(steps)
  })
  
  observeEvent(wrangle_mutate_name_d(), {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "mutate") return()
    steps[[idx]]$args$name <- wrangle_mutate_name_d()
    wrangle_steps(steps)
  })
  
  observeEvent(wrangle_mutate_expr_d(), {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "mutate") return()
    steps[[idx]]$args$expression <- wrangle_mutate_expr_d()
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_rename_column, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "rename") return()
    steps[[idx]]$args$column <- input$wrangle_rename_column
    wrangle_steps(steps)
  })
  
  observeEvent(wrangle_rename_new_d(), {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "rename") return()
    steps[[idx]]$args$new_name <- wrangle_rename_new_d()
    wrangle_steps(steps)
  })
  
  observeEvent(wrangle_filter_expr_d(), {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "filter") return()
    steps[[idx]]$args$expression <- wrangle_filter_expr_d()
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_sample_mode, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "sample") return()
    mode <- input$wrangle_sample_mode
    steps[[idx]]$args$mode <- mode
    current_size <- steps[[idx]]$args$size
    base_data <- isolate(dat())
    prior_steps <- if (idx > 1) steps[seq_len(idx - 1)] else list()
    data_snapshot <- wrangle_data_after_steps(base_data, prior_steps)
    snapshot_rows <- if (!is.null(data_snapshot)) nrow(data_snapshot) else 0
    if (identical(mode, "prop") && (is.null(current_size) || current_size > 1)) {
      steps[[idx]]$args$size <- 0.1
      updateNumericInput(session, "wrangle_sample_size", value = 0.1)
    }
    if (identical(mode, "n") && (is.null(current_size) || current_size <= 1)) {
      default_n <- 1
      if (!is.null(data_snapshot)) {
        default_n <- min(10, snapshot_rows)
      }
      steps[[idx]]$args$size <- default_n
      updateNumericInput(session, "wrangle_sample_size", value = default_n)
    }
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_sample_size, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "sample") return()
    steps[[idx]]$args$size <- input$wrangle_sample_size
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_sample_replace, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "sample") return()
    steps[[idx]]$args$replace <- isTRUE(input$wrangle_sample_replace)
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_distinct_columns, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "distinct") return()
    cols <- input$wrangle_distinct_columns
    if (is.null(cols)) cols <- character(0)
    steps[[idx]]$args$columns <- cols
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_distinct_keep, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "distinct") return()
    steps[[idx]]$args$keep_all <- isTRUE(input$wrangle_distinct_keep)
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_drop_na_columns, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "drop_na") return()
    cols <- input$wrangle_drop_na_columns
    if (is.null(cols)) cols <- character(0)
    steps[[idx]]$args$columns <- cols
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_replace_na_column, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "replace_na") return()
    steps[[idx]]$args$column <- input$wrangle_replace_na_column
    wrangle_steps(steps)
  })
  
  observeEvent(wrangle_replace_na_val_d(), {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "replace_na") return()
    steps[[idx]]$args$value <- wrangle_replace_na_val_d()
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_group_columns, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "group_by") return()
    cols <- input$wrangle_group_columns
    if (is.null(cols)) cols <- character(0)
    steps[[idx]]$args$columns <- cols
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_group_drop, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "group_by") return()
    steps[[idx]]$args$drop <- isTRUE(input$wrangle_group_drop)
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_summarize_fn, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "summarize") return()
    steps[[idx]]$args$fn <- input$wrangle_summarize_fn
    if (isTRUE(steps[[idx]]$args$auto_name)) {
      column <- steps[[idx]]$args$column %||% ""
      new_name <- summarise_default_name(input$wrangle_summarize_fn, column)
      steps[[idx]]$args$name <- new_name
      updateTextInput(session, "wrangle_summarize_name", value = new_name)
    }
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_summarize_column, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "summarize") return()
    steps[[idx]]$args$column <- input$wrangle_summarize_column
    if (isTRUE(steps[[idx]]$args$auto_name)) {
      fn <- steps[[idx]]$args$fn %||% "mean"
      new_name <- summarise_default_name(fn, input$wrangle_summarize_column)
      steps[[idx]]$args$name <- new_name
      updateTextInput(session, "wrangle_summarize_name", value = new_name)
    }
    wrangle_steps(steps)
  })
  
  observeEvent(wrangle_summarize_name_d(), {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "summarize") return()
    new_value <- wrangle_summarize_name_d()
    steps[[idx]]$args$name <- new_value
    default_name <- summarise_default_name(steps[[idx]]$args$fn %||% "mean", steps[[idx]]$args$column %||% "")
    steps[[idx]]$args$auto_name <- identical(new_value, default_name)
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_summarize_na_rm, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "summarize") return()
    steps[[idx]]$args$na_rm <- isTRUE(input$wrangle_summarize_na_rm)
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_longer_columns, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "pivot_longer") return()
    cols <- input$wrangle_longer_columns
    if (is.null(cols)) cols <- character(0)
    steps[[idx]]$args$columns <- cols
    wrangle_steps(steps)
  })
  
  observeEvent(wrangle_longer_names_to_d(), {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "pivot_longer") return()
    steps[[idx]]$args$names_to <- wrangle_longer_names_to_d()
    wrangle_steps(steps)
  })

  observeEvent(wrangle_longer_values_to_d(), {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "pivot_longer") return()
    steps[[idx]]$args$values_to <- wrangle_longer_values_to_d()
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_longer_drop_na, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "pivot_longer") return()
    steps[[idx]]$args$drop_na <- isTRUE(input$wrangle_longer_drop_na)
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_wider_names_from, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "pivot_wider") return()
    steps[[idx]]$args$names_from <- input$wrangle_wider_names_from
    wrangle_steps(steps)
  })
  
  observeEvent(input$wrangle_wider_values_from, {
    id <- wrangle_selected()
    if (is.null(id)) return()
    steps <- wrangle_steps()
    idx <- match(id, vapply(steps, `[[`, "id", FUN.VALUE = character(1), USE.NAMES = FALSE))
    if (is.na(idx) || steps[[idx]]$type != "pivot_wider") return()
    steps[[idx]]$args$values_from <- input$wrangle_wider_values_from
    wrangle_steps(steps)
  })
  
  wrangle_steps_reactive <- reactive({
    wrangle_steps()
  })
  # Reduced debounce to 500ms to improve responsiveness (was 5000ms)
  wrangle_steps_delayed <- debounce(wrangle_steps_reactive, 500)

  wrangle_result <- reactive({
    req(dat())
    steps <- wrangle_steps_delayed()
    if (is.null(steps)) {
      steps <- list()
    }
    apply_wrangle_pipeline(dat(), steps)
  })

  plot_data <- reactive({
    req(dat())
    if (isTRUE(input$plot_use_wrangled)) {
      res <- wrangle_result()
      req(res$data)
      res$data
    } else {
      dat()
    }
  })

  stat_result_ui <- reactiveVal(NULL)

  observeEvent({
    input$stat_x
    input$stat_y
    input$stat_test
    input$stat_group_levels
    input$stat_use_wrangled
  }, {
    stat_result_ui(NULL)
  }, ignoreInit = TRUE)

  observeEvent(stats_data(), {
    stat_result_ui(NULL)
  }, ignoreInit = TRUE)

  stats_data <- reactive({
    req(dat())
    if (isTRUE(input$stat_use_wrangled)) {
      res <- wrangle_result()
      req(res$data)
      res$data
    } else {
      dat()
    }
  })

  observe({
    df <- stats_data()
    req(df)
    cols <- names(df)
    current_x <- isolate(input$stat_x)
    current_y <- isolate(input$stat_y)
    selected_x <- if (!is.null(current_x) && current_x %in% cols) {
      current_x
    } else if (length(cols) > 0) {
      cols[1]
    } else {
      character(0)
    }
    selected_y <- if (!is.null(current_y) && current_y %in% cols) {
      current_y
    } else if (length(cols) > 0) {
      cols[1]
    } else {
      character(0)
    }
    updateSelectInput(session, "stat_x", choices = cols, selected = selected_x)
    updateSelectInput(session, "stat_y", choices = cols, selected = selected_y)
  })

  output$stat_group_ui <- renderUI({
    df <- stats_data()
    req(df)
    x <- input$stat_x
    test <- input$stat_test
    if (!nzchar(x) || !x %in% names(df)) {
      return(NULL)
    }
    if (!test %in% c("anova", "kruskal", "unpaired_t", "mann_whitney")) {
      return(NULL)
    }
    column <- df[[x]]
    if (is.numeric(column)) {
      return(NULL)
    }
    # Optimization: Use [!is.na(column)] instead of stats::na.omit() to avoid creating omission attributes
    levels_available <- unique(if (anyNA(column)) column[!is.na(column)] else column)
    if (length(levels_available) < 2) {
      return(NULL)
    }
    max_items <- if (test %in% c("unpaired_t", "mann_whitney")) 2 else length(levels_available)
    selected <- isolate(input$stat_group_levels)
    if (is.null(selected) || !all(selected %in% levels_available)) {
      selected <- levels_available[seq_len(min(length(levels_available), max_items))]
    }
    selectizeInput(
      "stat_group_levels",
      "Groups",
      choices = levels_available,
      selected = selected,
      multiple = TRUE,
      options = list(
        maxItems = max_items,
        placeholder = "Select groups"
      )
    )
  })

  num_vars <- reactive({
    df <- plot_data()
    req(df)
    # Optimization: Use vapply instead of select(where()) %>% names() to avoid the overhead of allocating a new dataframe
    names(df)[vapply(df, is.numeric, logical(1))]
  })

  cat_vars <- reactive({
    df <- plot_data()
    req(df)
    # Optimization: Use vapply instead of select(where()) %>% names() to avoid the overhead of allocating a new dataframe
    names(df)[vapply(df, function(x) is.character(x) || is.factor(x) || inherits(x, "Date") || inherits(x, "POSIXct") || is.logical(x), logical(1))]
  })

  output$wrangle_preview <- renderDT({
    res <- wrangle_result()
    shiny::validate(shiny::need(res$data, "No data available after wrangling. Check your pipeline steps."))
    datatable(res$data, options = list(scrollX = TRUE, pageLength = 10))
  })
  
  output$wrangle_dims <- renderText({
    res <- wrangle_result()
    req(res$data)
    paste0("Rows: ", nrow(res$data), " | Cols: ", ncol(res$data))
  })
  
  output$wrangle_status <- renderUI({
    res <- wrangle_result()
    if (is.null(res$message)) return(NULL)

    alert_class <- switch(res$message_type,
                          warning = "alert-danger",
                          success = "alert-success",
                          "alert-info")

    alert_icon <- switch(res$message_type,
                         warning = "exclamation-circle",
                         success = "check-circle",
                         "info-circle")

    div(
      class = paste("alert", alert_class),
      role = "alert",
      style = "margin-top:12px;margin-bottom:0;padding:8px 12px;",
      icon(alert_icon),
      " ", res$message
    )
  })

  observeEvent(input$wrangle_show_script, {
    steps <- wrangle_steps()
    script <- wrangle_steps_to_script(steps)
    showModal(modalDialog(
      title = "Wrangle pipeline code",
      size = "l",
      easyClose = TRUE,
      footer = modalButton("Close"),
      tags$p("Use this dplyr pipeline to reproduce the wrangling steps outside the app."),
      tags$div(
        style = "margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;",
        tags$button(
          id = "copy_wrangle_script",
          type = "button",
          class = "btn btn-default btn-sm",
          `aria-label` = "Copy code to clipboard",
          HTML("Copy to clipboard <span aria-hidden='true'>📋</span>")
        ),
        tags$span(
          id = "wrangle_copy_status",
          style = "display:none;font-weight:600;color:#008080;",
          `aria-live` = "polite",
          "Copied!"
        )
      ),
      tags$pre(
        id = "wrangle_script_code",
        style = paste(
          "max-height:420px;overflow-y:auto;",
          "background:#f4fbfb;border:1px solid #dfecec;",
          "border-radius:8px;padding:12px;font-size:13px;"
        ),
        script
      ),
      tags$script(HTML("(function(){\n  $(document).off('click', '#copy_wrangle_script').on('click', '#copy_wrangle_script', function(){\n    var codeEl = document.getElementById('wrangle_script_code');\n    if (!codeEl) { return; }\n    var text = codeEl.innerText;\n    var status = $('#wrangle_copy_status');\n    var showStatus = function(message, color){\n      status.stop(true, true).text(message).css('color', color).fadeIn(120).delay(1800).fadeOut(300);\n    };\n    if (!navigator.clipboard || !navigator.clipboard.writeText) {\n      var textarea = document.createElement('textarea');\n      textarea.value = text;\n      textarea.style.position = 'fixed';\n      textarea.style.opacity = '0';\n      document.body.appendChild(textarea);\n      textarea.focus();\n      textarea.select();\n      try {\n        var successful = document.execCommand('copy');\n        showStatus(successful ? 'Copied!' : 'Copy failed', successful ? '#008080' : '#c0392b');\n      } catch (err) {\n        showStatus('Copy not supported', '#c0392b');\n      }\n      document.body.removeChild(textarea);\n      return;\n    }\n    navigator.clipboard.writeText(text).then(function(){\n      showStatus('Copied!', '#008080');\n    }).catch(function(){\n      showStatus('Copy failed', '#c0392b');\n    });\n  });\n})();"))
    ))
  })

  output$wrangle_download <- downloadHandler(
    filename = function() paste0("wrangled_", Sys.Date(), ".csv"),
    content = function(file) {
      res <- wrangle_result()
      req(res$data)
      write_csv(res$data, file)
    }
  )

  output$current_file <- renderUI({
    info <- active_dataset()
    req(info)
    badge_text <- if (identical(info$source_type, "upload")) "Uploaded file" else "Sample dataset"
    tags$div(
      class = "active-dataset-label",
      tags$span(info$name),
      tags$span(class = "dataset-badge", badge_text)
    )
  })

  output$data_source_description <- renderUI({
    info <- active_dataset()
    req(info)
    if (identical(info$source_type, "upload")) {
      file <- input$file
      if (!is.null(file)) {
        return(tags$span(sprintf("Using data uploaded from %s.", file$name)))
      }
      return(tags$span("Upload a CSV or Excel file to work with your own data."))
    }
    tags$span(info$description)
  })

  output$active_dataset_summary <- renderUI({
    info <- active_dataset()
    req(info)
    req(info$data)
    dataset_overview_content(info, include_description = FALSE, show_name = FALSE)
  })

  output$upload_info <- renderUI({
    info <- active_dataset()
    req(info)
    req(info$data)
    dataset_overview_content(info, include_description = TRUE, show_name = TRUE)
  })
  
  output$data_preview <- renderDT({
    shiny::validate(shiny::need(dat(), "No data available. Please upload a file or select a sample dataset."))
    datatable(dat(), options = list(scrollX = TRUE, pageLength = 10))
  })
  
  output$num_summary <- renderTable({
    shiny::validate(shiny::need(dat(), "No data available. Please upload a file or select a sample dataset."))
    df <- dat()
    # Optimization: Use base R vapply for column subsetting instead of dplyr::select(where(is.numeric))
    # This bypasses tidyselect evaluation overhead and avoids allocating entirely new intermediate data frames,
    # significantly speeding up summary rendering for wide datasets.
    num_data <- df[, vapply(df, is.numeric, logical(1)), drop = FALSE]
    if (ncol(num_data) == 0) return(tibble())

    # Optimization: vectorize the numeric summary across all columns using summarise(across())
    # to avoid the overhead of instantiating many individual 1-row tibbles inside a map_dfr loop.
    num_data %>%
      summarise(across(everything(), list(
        mean = ~mean(.x, na.rm = TRUE),
        sd = ~sd(.x, na.rm = TRUE),
        min = ~min(.x, na.rm = TRUE),
        max = ~max(.x, na.rm = TRUE)
      ))) %>%
      pivot_longer(everything(),
                   names_to = c("variable", ".value"),
                   names_pattern = "^(.*)_(mean|sd|min|max)$")
  })
  
  output$cat_summary <- renderTable({
    shiny::validate(shiny::need(dat(), "No data available. Please upload a file or select a sample dataset."))
    df <- dat()
    # Optimization: Use base R vapply for column subsetting instead of dplyr::select(where(~!is.numeric(.x)))
    # This bypasses tidyselect evaluation overhead and avoids allocating entirely new intermediate data frames,
    # significantly speeding up summary rendering for wide datasets.
    cat_data <- df[, vapply(df, function(x) !is.numeric(x), logical(1)), drop = FALSE]

    # Optimization: use lapply + bind_rows instead of map_dfr to avoid the overhead of map_dfr's generic internal checks
    res_list <- lapply(names(cat_data), function(var) {
      counts <- dplyr::count(tibble(val = cat_data[[var]]), val, name = "n", sort = TRUE)
      n_na <- sum(is.na(counts$val))

      valid_counts <- counts[!is.na(counts$val), ]
      tbl <- valid_counts$n
      names(tbl) <- valid_counts$val

      tibble(variable = var,
             top_levels = paste(names(tbl)[1:min(5,length(tbl))],
                                tbl[1:min(5,length(tbl))], collapse = ", "),
             n_levels = length(tbl) + (n_na > 0))
    })
    dplyr::bind_rows(res_list)
  })
  
  output$var_ui <- renderUI({
    req(input$plot_type)
    df <- plot_data()
    req(df)
    if (identical(input$plot_type, "corr_matrix")) {
      nums <- num_vars()
      if (length(nums) < 2) {
        return(div(class = "text-center", style = "padding:20px;border:2px dashed #dfecec;border-radius:8px;color:#4f5d5d;", icon("exclamation-circle", class = "fa-2x"), p(style = "margin-top:10px;font-weight:600;", "Add at least two numeric columns to compute a correlation matrix.")))
      }
      return(selectizeInput(
        "corr_vars", "Numeric columns",
        choices = nums,
        selected = nums,
        multiple = TRUE,
        options = list(plugins = list("remove_button"))
      ))
    }
    vars <- names(df)
    if (length(vars) == 0) {
      return(div(class = "text-center", style = "padding:20px;border:2px dashed #dfecec;border-radius:8px;color:#4f5d5d;", icon("exclamation-circle", class = "fa-2x"), p(style = "margin-top:10px;font-weight:600;", "No columns available in the selected data.")))
    }
    tagList(
      selectInput("x", "x", vars),
      selectInput("y", "y (optional)", c("None" = "", vars)),
      selectInput("color", "color (optional)", c("None" = "", vars)),
      selectInput("facet", "facet (optional)", c("None" = "", cat_vars()))
    )
  })
  
  output$date_fmt_ui <- renderUI({
    df <- plot_data()
    req(df)
    x <- input$x
    if (is.null(x) || !nzchar(x) || !x %in% names(df)) return(NULL)
    col <- df[[x]]
    if (inherits(col, "Date") || inherits(col, "POSIXct")) {
      selectInput("date_fmt", "Date axis format",
                  c("YYYY-MM-DD" = "%Y-%m-%d",
                    "Mon YYYY" = "%b %Y",
                    "Mon DD" = "%b %d",
                    "YYYY" = "%Y"))
    }
  })

  parse_manual_palette <- function(x) {
    if (is.null(x) || !nzchar(x)) return(character(0))
    cols <- strsplit(x, ",", fixed = TRUE)[[1]]
    cols <- trimws(cols)
    cols[nzchar(cols)]
  }

  apply_palette_scales <- function(g, palette_choice, manual_values, color_is_numeric, has_color_mapping) {
    if (palette_choice == "default") return(g)

    if (!has_color_mapping) {
      if (palette_choice == "manual" && length(manual_values) > 0) {
        single_color <- manual_values[1]
        g <- g +
          scale_color_manual(values = single_color, guide = "none") +
          scale_fill_manual(values = single_color, guide = "none")
      }
      return(g)
    }

    if (palette_choice == "manual") {
      if (color_is_numeric) {
        if (length(manual_values) >= 2) {
          g <- g +
            scale_color_gradientn(colors = manual_values) +
            scale_fill_gradientn(colors = manual_values)
        }
      } else if (length(manual_values) > 0) {
        g <- g +
          scale_color_manual(values = manual_values) +
          scale_fill_manual(values = manual_values)
      }
      return(g)
    }

    if (palette_choice %in% c("viridis", "plasma", "inferno", "magma", "cividis")) {
      if (color_is_numeric) {
        g <- g +
          scale_color_viridis_c(option = palette_choice) +
          scale_fill_viridis_c(option = palette_choice)
      } else {
        g <- g +
          scale_color_viridis_d(option = palette_choice) +
          scale_fill_viridis_d(option = palette_choice)
      }
      return(g)
    }

    if (startsWith(palette_choice, "brewer_")) {
      palette_name <- sub("brewer_", "", palette_choice, fixed = TRUE)
      info <- RColorBrewer::brewer.pal.info
      if (!palette_name %in% rownames(info)) return(g)
      max_cols <- info[palette_name, "maxcolors"]
      brewer_cols <- RColorBrewer::brewer.pal(max_cols, palette_name)
      if (color_is_numeric) {
        g <- g +
          scale_color_gradientn(colors = brewer_cols) +
          scale_fill_gradientn(colors = brewer_cols)
      } else {
        g <- g +
          scale_color_brewer(palette = palette_name) +
          scale_fill_brewer(palette = palette_name)
      }
      return(g)
    }

    g
  }

  build_plot <- reactive({
    shiny::validate(shiny::need(input$plot_type, "Please select a plot type."))
    df <- plot_data()
    shiny::validate(shiny::need(df, "No data available to plot. Please select a valid dataset."))
    ptype <- input$plot_type

    if (ptype == "corr_matrix") {
      num_cols <- num_vars()
      shiny::validate(shiny::need(length(num_cols) >= 2, "Need at least two numeric columns for a correlation matrix."))
      vars <- input$corr_vars
      if (is.null(vars) || length(vars) < 2) {
        vars <- num_cols
      } else {
        vars <- intersect(vars, num_cols)
        if (length(vars) < 2) vars <- num_cols
      }
      shiny::validate(shiny::need(length(vars) >= 2, "Need at least two numeric columns for a correlation matrix."))
      corr_df <- df %>% select(all_of(vars))
      cm <- cor(as.matrix(corr_df), use = "pairwise.complete.obs")
      return(ggcorrplot(cm, type = "lower", lab = TRUE))
    }

    x <- input$x
    shiny::validate(shiny::need(x, "Please select an x variable to build the plot."))
    shiny::validate(shiny::need(x %in% names(df), "Selected x variable not available in current data."))
    y <- if (nzchar(input$y)) input$y else NULL
    color <- if (nzchar(input$color)) input$color else NULL
    facet <- if (nzchar(input$facet)) input$facet else NULL
    if (!is.null(y) && !y %in% names(df)) y <- NULL
    if (!is.null(color) && !color %in% names(df)) color <- NULL
    if (!is.null(facet) && !facet %in% names(df)) facet <- NULL
    is_num <- function(v) v %in% num_vars()
    is_cat <- function(v) v %in% cat_vars()

    if (ptype == "auto") {
      ptype <- if (!is.null(y) && is_num(x) && is_num(y)) "scatter" else
        if (is_num(x) && is.null(y)) "histogram" else
          if (!is.null(y) && is_cat(x) && is_num(y)) "boxplot" else
            if (is_cat(x) && is.null(y)) "bar" else "scatter"
    }
    
    g <- ggplot(df, aes(x = .data[[x]]))
    if (!is.null(color)) g <- g + aes(color = .data[[color]], fill = .data[[color]])
    
    if (ptype == "bar") {
      if (input$use_percent) {
        g <- g + geom_bar(aes(y = after_stat(prop), group = 1), alpha = input$alpha) +
          scale_y_continuous(labels = percent_format())
      } else g <- g + geom_bar(alpha = input$alpha)
    } else if (ptype == "histogram") {
      shiny::validate(shiny::need(is_num(x), "The selected x variable must be numeric for a histogram."))
      g <- g + geom_histogram(bins = input$bins, alpha = input$alpha)
    } else if (ptype == "density") {
      shiny::validate(shiny::need(is_num(x), "The selected x variable must be numeric for a density plot."))
      g <- g + geom_density(alpha = input$alpha)
    } else {
      shiny::validate(shiny::need(!is.null(y), paste("Please choose a y variable to generate a", ptype, "plot.")))
      g <- g + aes(y = .data[[y]])
      if (ptype == "scatter") {
        g <- g + geom_point(alpha = input$alpha, size = input$pt_size)
        trend_opts <- input$trendline_options %||% character(0)
        if ("smooth" %in% trend_opts) {
          g <- g + geom_smooth(se = FALSE, method = "loess", linewidth = 0.8)
        }
        if ("linear" %in% trend_opts) {
          g <- g + geom_smooth(se = FALSE, method = "lm", linetype = "dashed", linewidth = 0.8)
        }
      } else if (ptype == "boxplot") {
        g <- g + geom_boxplot(alpha = input$alpha)
      } else if (ptype == "violin") {
        g <- g + geom_violin(alpha = input$alpha)
      } else if (ptype == "line") {
        g <- g + geom_line(linewidth = input$pt_size/3)
      }
    }
    
    if (!is.null(facet)) g <- g + facet_wrap(reformulate(facet), scales = if (input$free_y) "free_y" else "fixed")
    if (!input$show_legend) g <- g + theme(legend.position = "none")

    if (!is.null(input$date_fmt) && x %in% names(df) && (inherits(df[[x]],"Date")||inherits(df[[x]],"POSIXct"))) {
      g <- g + scale_x_datetime(labels = scales::date_format(input$date_fmt), guide = guide_axis(angle = 45))
    }

    palette_choice <- input$palette_choice %||% "default"
    manual_values <- parse_manual_palette(input$palette_manual)
    has_color_mapping <- !is.null(color)
    color_is_numeric <- has_color_mapping && is_num(color)
    g <- apply_palette_scales(g, palette_choice, manual_values, color_is_numeric, has_color_mapping)

    thm <- switch(input$theme_choice,
                  minimal = theme_minimal(),
                  void = theme_void(),
                  light = theme_light(),
                  dark = theme_dark(),
                  theme_classic())
    
    labs_list <- list()
    labs_list$x <- if (nzchar(input$x_lab)) input$x_lab else x
    if (!is.null(y)) labs_list$y <- if (nzchar(input$y_lab)) input$y_lab else y
    if (!is.null(color) && nzchar(input$legend_lab)) { labs_list$color <- input$legend_lab; labs_list$fill <- input$legend_lab }

    g + thm + do.call(labs, labs_list)
  })

  build_plot_code <- function() {
    df <- plot_data()
    if (is.null(df)) {
      return("# No data available to generate plot code.")
    }

    data_ref <- if (isTRUE(input$plot_use_wrangled)) "wrangled_data" else "input_data"
    data_comment <- if (identical(data_ref, "wrangled_data")) {
      "# `wrangled_data` should contain the transformed dataset from the Wrangle tab."
    } else {
      "# `input_data` should contain the raw dataset you uploaded."
    }

    plot_type <- input$plot_type %||% "auto"

    if (identical(plot_type, "corr_matrix")) {
      available <- num_vars()
      if (length(available) < 2) {
        return("# At least two numeric columns are required to build a correlation matrix.")
      }
      vars <- input$corr_vars
      if (is.null(vars) || length(vars) < 2) {
        vars <- available
      } else {
        vars <- intersect(vars, available)
        if (length(vars) < 2) {
          vars <- available
        }
      }
      if (length(vars) < 2) {
        return("# At least two numeric columns are required to build a correlation matrix.")
      }

      libs <- unique(c("ggplot2", "ggcorrplot"))
      lines <- c(
        "# Required packages",
        paste0("library(", libs, ")"),
        "",
        "# Data used for plotting",
        data_comment,
        sprintf("plot_data <- %s", data_ref),
        "",
        sprintf("corr_vars <- %s", code_format_vector(vars)),
        "cm <- cor(plot_data[corr_vars], use = \"pairwise.complete.obs\")",
        "ggcorrplot(cm, type = \"lower\", lab = TRUE)"
      )
      return(paste(lines, collapse = "\n"))
    }

    x <- input$x
    if (is.null(x) || !nzchar(x)) {
      return("# Please choose an x variable before generating plot code.")
    }
    if (!x %in% names(df)) {
      return("# The selected x variable is not available in the chosen data.")
    }

    y <- if (!is.null(input$y) && nzchar(input$y) && input$y %in% names(df)) input$y else NULL
    color <- if (!is.null(input$color) && nzchar(input$color) && input$color %in% names(df)) input$color else NULL
    facet <- if (!is.null(input$facet) && nzchar(input$facet) && input$facet %in% names(df)) input$facet else NULL

    num_columns <- num_vars()
    cat_columns <- cat_vars()
    is_num <- function(v) !is.null(v) && v %in% num_columns
    is_cat <- function(v) !is.null(v) && v %in% cat_columns

    actual_type <- plot_type
    if (identical(actual_type, "auto")) {
      if (!is.null(y) && is_num(x) && is_num(y)) {
        actual_type <- "scatter"
      } else if (is_num(x) && is.null(y)) {
        actual_type <- "histogram"
      } else if (!is.null(y) && is_cat(x) && is_num(y)) {
        actual_type <- "boxplot"
      } else if (is_cat(x) && is.null(y)) {
        actual_type <- "bar"
      } else {
        actual_type <- "scatter"
      }
    }

    libs <- "ggplot2"
    needs_scales <- identical(actual_type, "bar") && isTRUE(input$use_percent)
    use_date_scale <- FALSE
    if (!is.null(input$date_fmt) && x %in% names(df) && (inherits(df[[x]], "Date") || inherits(df[[x]], "POSIXct"))) {
      use_date_scale <- TRUE
      needs_scales <- TRUE
    }
    if (needs_scales) {
      libs <- unique(c(libs, "scales"))
    }

    lines <- c(
      "# Required packages",
      paste0("library(", libs, ")"),
      "",
      "# Data used for plotting",
      data_comment,
      sprintf("plot_data <- %s", data_ref),
      ""
    )

    mapping_parts <- c(sprintf("x = %s", code_quote(x)))
    if (!is.null(y)) {
      mapping_parts <- c(mapping_parts, sprintf("y = %s", code_quote(y)))
    }
    if (!is.null(color)) {
      mapping_parts <- c(mapping_parts, sprintf("color = %s", code_quote(color)), sprintf("fill = %s", code_quote(color)))
    }
    mapping <- paste0("aes_string(", paste(mapping_parts, collapse = ", "), ")")
    lines <- c(lines, sprintf("g <- ggplot(plot_data, %s)", mapping))

    alpha_val <- code_format_number(input$alpha)

    if (identical(actual_type, "bar")) {
      if (isTRUE(input$use_percent)) {
        lines <- c(lines,
                   sprintf("g <- g + geom_bar(aes(y = after_stat(prop), group = 1), alpha = %s)", alpha_val),
                   "g <- g + scale_y_continuous(labels = scales::percent_format())")
      } else {
        lines <- c(lines, sprintf("g <- g + geom_bar(alpha = %s)", alpha_val))
      }
    } else if (identical(actual_type, "histogram")) {
      if (!is_num(x)) {
        return("# The selected x variable must be numeric for a histogram.")
      }
      bin_count <- if (is.null(input$bins)) "30" else code_format_number(as.integer(round(input$bins)))
      lines <- c(lines, sprintf("g <- g + geom_histogram(bins = %s, alpha = %s)", bin_count, alpha_val))
    } else if (identical(actual_type, "density")) {
      if (!is_num(x)) {
        return("# The selected x variable must be numeric for a density plot.")
      }
      lines <- c(lines, sprintf("g <- g + geom_density(alpha = %s)", alpha_val))
    } else {
      if (is.null(y)) {
        return("# Please choose a y variable before generating plot code for this plot type.")
      }
      if (identical(actual_type, "scatter")) {
        size_val <- code_format_number(input$pt_size)
        lines <- c(lines, sprintf("g <- g + geom_point(alpha = %s, size = %s)", alpha_val, size_val))
        trend_opts <- input$trendline_options %||% character(0)
        if ("smooth" %in% trend_opts) {
          lines <- c(lines, "g <- g + geom_smooth(se = FALSE, method = \"loess\", linewidth = 0.8)")
        }
        if ("linear" %in% trend_opts) {
          lines <- c(lines, "g <- g + geom_smooth(se = FALSE, method = \"lm\", linetype = \"dashed\", linewidth = 0.8)")
        }
      } else if (identical(actual_type, "boxplot")) {
        lines <- c(lines, sprintf("g <- g + geom_boxplot(alpha = %s)", alpha_val))
      } else if (identical(actual_type, "violin")) {
        lines <- c(lines, sprintf("g <- g + geom_violin(alpha = %s)", alpha_val))
      } else if (identical(actual_type, "line")) {
        line_width <- code_format_number(input$pt_size / 3)
        lines <- c(lines, sprintf("g <- g + geom_line(linewidth = %s)", line_width))
      }
    }

    if (!is.null(facet)) {
      facet_scales <- if (isTRUE(input$free_y)) "free_y" else "fixed"
      lines <- c(lines, sprintf("g <- g + facet_wrap(reformulate(%s), scales = \"%s\")", code_quote(facet), facet_scales))
    }
    if (!isTRUE(input$show_legend)) {
      lines <- c(lines, "g <- g + theme(legend.position = \"none\")")
    }
    if (use_date_scale && !is.null(input$date_fmt)) {
      lines <- c(lines, sprintf("g <- g + scale_x_datetime(labels = scales::date_format(%s), guide = guide_axis(angle = 45))", code_quote(input$date_fmt)))
    }

    palette_choice <- input$palette_choice %||% "default"
    manual_values <- parse_manual_palette(input$palette_manual)
    has_color_mapping <- !is.null(color)
    color_is_numeric <- has_color_mapping && is_num(color)

    if (!identical(palette_choice, "default")) {
      if (!has_color_mapping) {
        if (identical(palette_choice, "manual") && length(manual_values) > 0) {
          lines <- c(lines,
                     sprintf("g <- g + scale_color_manual(values = %s, guide = \"none\")", code_format_vector(manual_values[1])),
                     sprintf("g <- g + scale_fill_manual(values = %s, guide = \"none\")", code_format_vector(manual_values[1])))
        }
      } else if (identical(palette_choice, "manual")) {
        if (color_is_numeric && length(manual_values) >= 2) {
          lines <- c(lines,
                     sprintf("g <- g + scale_color_gradientn(colors = %s)", code_format_vector(manual_values)),
                     sprintf("g <- g + scale_fill_gradientn(colors = %s)", code_format_vector(manual_values)))
        } else if (!color_is_numeric && length(manual_values) > 0) {
          lines <- c(lines,
                     sprintf("g <- g + scale_color_manual(values = %s)", code_format_vector(manual_values)),
                     sprintf("g <- g + scale_fill_manual(values = %s)", code_format_vector(manual_values)))
        }
      } else if (palette_choice %in% c("viridis", "plasma", "inferno", "magma", "cividis")) {
        if (color_is_numeric) {
          lines <- c(lines,
                     sprintf("g <- g + scale_color_viridis_c(option = %s)", code_quote(palette_choice)),
                     sprintf("g <- g + scale_fill_viridis_c(option = %s)", code_quote(palette_choice)))
        } else {
          lines <- c(lines,
                     sprintf("g <- g + scale_color_viridis_d(option = %s)", code_quote(palette_choice)),
                     sprintf("g <- g + scale_fill_viridis_d(option = %s)", code_quote(palette_choice)))
        }
      } else if (startsWith(palette_choice, "brewer_")) {
        palette_name <- sub("brewer_", "", palette_choice, fixed = TRUE)
        lines <- c(lines,
                   sprintf("palette_name <- %s", code_quote(palette_name)),
                   "max_cols <- RColorBrewer::brewer.pal.info[palette_name, \"maxcolors\"]",
                   "brewer_cols <- RColorBrewer::brewer.pal(max_cols, palette_name)")
        if (color_is_numeric) {
          lines <- c(lines,
                     "g <- g + scale_color_gradientn(colors = brewer_cols)",
                     "g <- g + scale_fill_gradientn(colors = brewer_cols)")
        } else {
          lines <- c(lines,
                     "g <- g + scale_color_brewer(palette = palette_name)",
                     "g <- g + scale_fill_brewer(palette = palette_name)")
        }
      }
    }

    theme_call <- switch(input$theme_choice,
                         minimal = "theme_minimal()",
                         void = "theme_void()",
                         light = "theme_light()",
                         dark = "theme_dark()",
                         "theme_classic()")
    lines <- c(lines, sprintf("g <- g + %s", theme_call))

    lab_args <- c(sprintf("x = %s", code_quote(if (nzchar(input$x_lab)) input$x_lab else x)))
    if (!is.null(y)) {
      lab_args <- c(lab_args, sprintf("y = %s", code_quote(if (nzchar(input$y_lab)) input$y_lab else y)))
    }
    if (!is.null(color) && nzchar(input$legend_lab)) {
      lab_args <- c(lab_args,
                    sprintf("color = %s", code_quote(input$legend_lab)),
                    sprintf("fill = %s", code_quote(input$legend_lab)))
    }
    lines <- c(lines, sprintf("g <- g + labs(%s)", paste(lab_args, collapse = ", ")))

    lines <- c(lines, "", "g")
    paste(lines, collapse = "\n")
  }

  output$plt <- renderPlotly({ ggplotly(build_plot()) })
  
  output$dl_png <- downloadHandler(
    filename = function() paste0("plot_", Sys.Date(), ".png"),
    content = function(file) ggsave(file, build_plot(), width = input$w, height = input$h, dpi = input$dpi, bg = "white")
  )
  output$dl_jpg <- downloadHandler(
    filename = function() paste0("plot_", Sys.Date(), ".jpg"),
    content = function(file) ggsave(file, build_plot(), width = input$w, height = input$h, dpi = input$dpi, bg = "white")
  )

  observeEvent(input$plot_show_code, {
    code <- build_plot_code()
    show_code_modal(
      title = "Plot code",
      description = "Use this ggplot2 code to reproduce the current visualization outside the app.",
      code = code,
      copy_id = "copy_plot_code",
      status_id = "plot_copy_status",
      code_id = "plot_code_block"
    )
  })

  format_number <- function(x, digits = 3) {
    ifelse(is.na(x), "—", formatC(x, format = "f", digits = digits))
  }

  format_integer <- function(x) {
    ifelse(is.na(x), "—", formatC(as.integer(round(x)), format = "d"))
  }

  format_p_value <- function(p) {
    ifelse(is.na(p), "—", ifelse(p < 0.001, "<0.001", formatC(p, format = "f", digits = 3)))
  }

  build_lm_summary <- function(model) {
    tidy_df <- tryCatch(
      broom::tidy(model, conf.int = TRUE) %>%
        mutate(
          term = stringr::str_replace_all(term, "`", ""),
          term = ifelse(term == "(Intercept)", "Intercept", term),
          estimate = format_number(estimate),
          std.error = format_number(std.error),
          statistic = format_number(statistic),
          p.value = format_p_value(p.value),
          conf.low = format_number(conf.low),
          conf.high = format_number(conf.high)
        ),
      error = function(e) NULL
    )

    glance_df <- tryCatch(broom::glance(model), error = function(e) NULL)

    if (is.null(tidy_df) || is.null(glance_df)) {
      fallback <- paste(capture.output(summary(model)), collapse = "\n")
      return(tags$div(
        class = "lm-summary",
        tags$pre(class = "lm-report-text", fallback)
      ))
    }

    metrics <- tibble::tibble(
      Metric = c("Observations", "R-squared", "Adjusted R-squared", "F-statistic", "p-value", "Residual Std. Error"),
      Value = c(
        format_integer(glance_df$nobs),
        format_number(glance_df$r.squared),
        format_number(glance_df$adj.r.squared),
        format_number(glance_df$statistic),
        format_p_value(glance_df$p.value),
        format_number(glance_df$sigma)
      )
    )

    narrative <- tryCatch({
      rep <- suppressWarnings(report::report(model, standardize = FALSE))
      paste(capture.output(rep), collapse = "\n")
    }, error = function(e) NULL)

    narrative_block <- NULL
    if (!is.null(narrative) && nzchar(narrative)) {
      narrative_block <- tags$details(
        tags$summary("Narrative report"),
        tags$div(class = "lm-report-text", HTML(gsub("\n", "<br>", htmltools::htmlEscape(narrative))))
      )
    }

    tags$div(
      class = "lm-summary",
      tags$h5("Model fit"),
      tags$table(
        class = "lm-summary-table",
        tags$thead(tags$tr(
          tags$th("Metric", style = "text-align:left;"),
          tags$th("Value", style = "text-align:right;")
        )),
        # Optimization: use base R Map instead of purrr::pmap to avoid generic checks and coercion overhead
        tags$tbody(Map(function(Metric, Value) {
          tags$tr(
            tags$td(Metric),
            tags$td(style = "text-align:right;", Value)
          )
        }, metrics$Metric, metrics$Value, USE.NAMES = FALSE))
      ),
      tags$h5("Coefficients"),
      tags$table(
        class = "lm-summary-table",
        tags$thead(tags$tr(
          tags$th("Term", style = "text-align:left;"),
          tags$th("Estimate", style = "text-align:right;"),
          tags$th("Std. Error", style = "text-align:right;"),
          tags$th("t value", style = "text-align:right;"),
          tags$th("p value", style = "text-align:right;"),
          tags$th("95% CI", style = "text-align:right;")
        )),
        # Optimization: use base R Map instead of purrr::pmap to avoid generic checks and coercion overhead
        tags$tbody(Map(function(term, estimate, std.error, statistic, p.value, conf.low, conf.high) {
          ci_value <- if (conf.low == "—" || conf.high == "—") {
            "—"
          } else {
            paste0(conf.low, " — ", conf.high)
          }
          tags$tr(
            tags$td(term),
            tags$td(style = "text-align:right;", estimate),
            tags$td(style = "text-align:right;", std.error),
            tags$td(style = "text-align:right;", statistic),
            tags$td(style = "text-align:right;", p.value),
            tags$td(style = "text-align:right;", ci_value)
          )
        }, tidy_df$term, tidy_df$estimate, tidy_df$std.error, tidy_df$statistic, tidy_df$p.value, tidy_df$conf.low, tidy_df$conf.high, USE.NAMES = FALSE))
      ),
      narrative_block
    )
  }
  
  build_stats_code <- function() {
    df <- stats_data()
    if (is.null(df)) {
      return("# No data available to generate statistics code.")
    }

    if (!nzchar(input$stat_x) || !nzchar(input$stat_y) || !nzchar(input$stat_test)) {
      return("# Select predictor (x), response (y), and an analysis type before requesting the code.")
    }

    x <- input$stat_x
    y <- input$stat_y
    if (!x %in% names(df) || !y %in% names(df)) {
      return("# The selected variables are not available in the current data.")
    }

    test <- input$stat_test
    group_levels <- input$stat_group_levels
    data_ref <- if (isTRUE(input$stat_use_wrangled)) "wrangled_data" else "input_data"
    data_comment <- if (identical(data_ref, "wrangled_data")) {
      "# `wrangled_data` should contain the transformed dataset from the Wrangle tab."
    } else {
      "# `input_data` should contain the raw dataset you uploaded."
    }

    lines <- c(
      "# Required packages",
      "library(report)",
      "",
      "# Data used for analysis",
      data_comment,
      sprintf("analysis_data <- %s", data_ref),
      ""
    )

    if (!is.null(group_levels) && length(group_levels) > 0 &&
        test %in% c("anova", "kruskal", "unpaired_t", "mann_whitney") &&
        !is.numeric(df[[x]])) {
      lines <- c(lines,
                 sprintf("analysis_data <- analysis_data[analysis_data[[%s]] %%in%% %s, , drop = FALSE]",
                         code_quote(x), code_format_vector(group_levels)),
                 sprintf("analysis_data[[%s]] <- droplevels(factor(analysis_data[[%s]]))",
                         code_quote(x), code_quote(x)),
                 "")
    }

    if (identical(test, "lm")) {
      if (!is.numeric(df[[y]])) {
        return("# Response (y) must be numeric for linear regression.")
      }
      if (!is.numeric(df[[x]])) {
        lines <- c(lines,
                   sprintf("%s <- as.numeric(as.factor(%s))", code_data_column(x), code_data_column(x)))
      }
      lines <- c(lines,
                 sprintf("lm_fit <- lm(reformulate(%s, response = %s), data = analysis_data)", code_quote(x), code_quote(y)),
                 "summary(lm_fit)",
                 "report::report(lm_fit)")
    } else if (identical(test, "anova")) {
      if (!is.numeric(df[[y]])) {
        return("# Response (y) must be numeric for ANOVA.")
      }
      grp <- df[[x]]
      grp <- droplevels(as.factor(grp))
      if (nlevels(grp) < 2) {
        return("# Predictor (x) needs at least two groups for ANOVA.")
      }
      lines <- c(lines,
                 sprintf("%s <- as.factor(%s)", code_data_column(x), code_data_column(x)),
                 sprintf("%s <- droplevels(%s)", code_data_column(x), code_data_column(x)),
                 sprintf("stopifnot(nlevels(%s) >= 2)", code_data_column(x)),
                 sprintf("anova_fit <- aov(reformulate(%s, response = %s), data = analysis_data)", code_quote(x), code_quote(y)),
                 "summary(anova_fit)",
                 "report::report(anova_fit)")
    } else if (identical(test, "kruskal")) {
      if (!is.numeric(df[[y]])) {
        return("# Response (y) must be numeric for the Kruskal-Wallis test.")
      }
      grp <- df[[x]]
      grp <- droplevels(as.factor(grp))
      if (nlevels(grp) < 2) {
        return("# Predictor (x) needs at least two groups for the Kruskal-Wallis test.")
      }
      lines <- c(lines,
                 sprintf("%s <- as.factor(%s)", code_data_column(x), code_data_column(x)),
                 sprintf("%s <- droplevels(%s)", code_data_column(x), code_data_column(x)),
                 sprintf("stopifnot(nlevels(%s) >= 2)", code_data_column(x)),
                 sprintf("kruskal_fit <- kruskal.test(reformulate(%s, response = %s), data = analysis_data)", code_quote(x), code_quote(y)),
                 "kruskal_fit",
                 "report::report(kruskal_fit)")
    } else if (identical(test, "paired_t")) {
      if (!is.numeric(df[[x]]) || !is.numeric(df[[y]])) {
        return("# Both x and y must be numeric for a paired t-test.")
      }
      lines <- c(lines,
                 sprintf("t_test <- t.test(%s, %s, paired = TRUE)", code_data_column(x), code_data_column(y)),
                 "t_test",
                 "report::report(t_test)")
    } else if (identical(test, "wilcoxon_signed")) {
      if (!is.numeric(df[[x]]) || !is.numeric(df[[y]])) {
        return("# Both x and y must be numeric for a Wilcoxon signed-rank test.")
      }
      lines <- c(lines,
                 sprintf("wilcox_res <- wilcox.test(%s, %s, paired = TRUE, exact = FALSE)", code_data_column(x), code_data_column(y)),
                 "wilcox_res",
                 "report::report(wilcox_res)")
    } else if (identical(test, "unpaired_t")) {
      if (!is.numeric(df[[y]])) {
        return("# Response (y) must be numeric for an unpaired t-test.")
      }
      if (is.numeric(df[[x]])) {
        lines <- c(lines,
                   sprintf("t_test <- t.test(%s, %s, paired = FALSE)", code_data_column(x), code_data_column(y)),
                   "t_test",
                   "report::report(t_test)")
      } else {
        grp <- df[[x]]
        grp <- droplevels(as.factor(grp))
        if (nlevels(grp) != 2) {
          return("# Predictor (x) must define exactly two groups for an unpaired t-test.")
        }
        lines <- c(lines,
                   sprintf("%s <- as.factor(%s)", code_data_column(x), code_data_column(x)),
                   sprintf("%s <- droplevels(%s)", code_data_column(x), code_data_column(x)),
                   sprintf("stopifnot(nlevels(%s) == 2)", code_data_column(x)),
                   sprintf("t_test <- t.test(reformulate(%s, response = %s), data = analysis_data)", code_quote(x), code_quote(y)),
                   "t_test",
                   "report::report(t_test)")
      }
    } else if (identical(test, "mann_whitney")) {
      if (!is.numeric(df[[y]])) {
        return("# Response (y) must be numeric for a Mann-Whitney U test.")
      }
      grp <- df[[x]]
      if (is.numeric(grp)) {
        return("# Predictor (x) must define two groups for a Mann-Whitney U test.")
      }
      grp <- droplevels(as.factor(grp))
      if (nlevels(grp) != 2) {
        return("# Predictor (x) must define exactly two groups for a Mann-Whitney U test.")
      }
      lines <- c(lines,
                 sprintf("%s <- as.factor(%s)", code_data_column(x), code_data_column(x)),
                 sprintf("%s <- droplevels(%s)", code_data_column(x), code_data_column(x)),
                 sprintf("stopifnot(nlevels(%s) == 2)", code_data_column(x)),
                 sprintf("mann_whitney <- wilcox.test(reformulate(%s, response = %s), data = analysis_data, exact = FALSE)", code_quote(x), code_quote(y)),
                 "mann_whitney",
                 "report::report(mann_whitney)")
    } else if (identical(test, "pearson_cor")) {
      if (!is.numeric(df[[x]]) || !is.numeric(df[[y]])) {
        return("# Both variables must be numeric for a Pearson correlation.")
      }
      lines <- c(lines,
                 sprintf("cor_test <- cor.test(%s, %s, method = 'pearson')", code_data_column(x), code_data_column(y)),
                 "cor_test",
                 "report::report(cor_test)")
    } else if (identical(test, "spearman_cor")) {
      if (!is.numeric(df[[x]]) || !is.numeric(df[[y]])) {
        return("# Both variables must be numeric for a Spearman correlation.")
      }
      lines <- c(lines,
                 sprintf("cor_test <- cor.test(%s, %s, method = 'spearman', exact = FALSE)", code_data_column(x), code_data_column(y)),
                 "cor_test",
                 "report::report(cor_test)")
    } else if (identical(test, "chisq")) {
      if (is.numeric(df[[x]]) || is.numeric(df[[y]])) {
        return("# Both variables must be categorical for a chi-squared test.")
      }
      lines <- c(lines,
                 sprintf("%s <- as.factor(%s)", code_data_column(x), code_data_column(x)),
                 sprintf("%s <- as.factor(%s)", code_data_column(y), code_data_column(y)),
                 sprintf("chisq_tbl <- table(%s, %s)", code_data_column(x), code_data_column(y)),
                 "chisq.test(chisq_tbl)",
                 "report::report(chisq.test(chisq_tbl))")
    } else {
      return("# The selected analysis is not supported for code export.")
    }

    paste(lines, collapse = "\n")
  }

  observeEvent(input$run_stat, {
    df <- stats_data()
    req(df)

    if (!nzchar(input$stat_x) || !nzchar(input$stat_y) || !nzchar(input$stat_test)) {
      stat_result_ui(div(class = "alert alert-danger", role = "alert", icon("exclamation-circle"), " Please select X, Y, and a test type first."))
      return()
    }

    x_var <- input$stat_x
    y_var <- input$stat_y
    test <- input$stat_test
    group_levels <- input$stat_group_levels

    if (!x_var %in% names(df) || !y_var %in% names(df)) {
      stat_result_ui(div(class = "alert alert-danger", role = "alert", icon("exclamation-circle"), " The selected variables are not available in the current data."))
      return()
    }

    show_error <- function(message) {
      stat_result_ui(div(class = "alert alert-danger", role = "alert", icon("exclamation-circle"), sprintf(" %s", message)))
    }

    safe_report <- function(object, fallback = NULL) {
      tryCatch({
        suppressWarnings(report::report(object))
      }, error = function(e) {
        if (is.null(fallback)) {
          paste(capture.output(object), collapse = "\n")
        } else if (is.function(fallback)) {
          fallback(object)
        } else {
          fallback
        }
      })
    }

    if (test %in% c("anova", "kruskal", "unpaired_t", "mann_whitney") &&
        x_var %in% names(df) &&
        !is.numeric(df[[x_var]]) &&
        !is.null(group_levels) && length(group_levels) > 0) {
      df <- df[df[[x_var]] %in% group_levels, , drop = FALSE]
      df <- df[!is.na(df[[x_var]]), , drop = FALSE]
      if (nrow(df) == 0) {
        show_error("No data available after filtering by the selected groups.")
        return()
      }
      df[[x_var]] <- droplevels(as.factor(df[[x_var]]))
    }

    out <- switch(
      test,
      "lm" = {
        if (!is.numeric(df[[y_var]])) {
          show_error("Response (y) must be numeric for regression.")
          return()
        }
        if (!is.numeric(df[[x_var]])) {
          df[[x_var]] <- as.numeric(as.factor(df[[x_var]]))
        }
        f <- reformulate(x_var, response = y_var)
        model <- lm(f, data = df)
        build_lm_summary(model)
      },
      "anova" = {
        if (!is.numeric(df[[y_var]])) {
          show_error("Response (y) must be numeric for ANOVA.")
          return()
        }
        grp <- df[[x_var]]
        if (!is.factor(grp)) {
          grp <- as.factor(grp)
        }
        grp <- droplevels(grp)
        if (n_distinct(if (anyNA(grp)) grp[!is.na(grp)] else grp) < 2) {
          show_error("Predictor (x) needs at least two groups for ANOVA.")
          return()
        }
        df[[x_var]] <- grp
        f <- reformulate(x_var, response = y_var)
        model <- aov(f, data = df)
        safe_report(model, function(obj) paste(capture.output(summary(obj)), collapse = "\n"))
      },
      "kruskal" = {
        if (!is.numeric(df[[y_var]])) {
          show_error("Response (y) must be numeric for the Kruskal-Wallis test.")
          return()
        }
        grp <- df[[x_var]]
        if (!is.factor(grp)) {
          grp <- as.factor(grp)
        }
        grp <- droplevels(grp)
        if (n_distinct(if (anyNA(grp)) grp[!is.na(grp)] else grp) < 2) {
          show_error("Predictor (x) needs at least two groups for the Kruskal-Wallis test.")
          return()
        }
        df[[x_var]] <- grp
        test_obj <- kruskal.test(reformulate(x_var, response = y_var), data = df)
        safe_report(test_obj)
      },
      "paired_t" = {
        x <- df[[x_var]]
        y <- df[[y_var]]
        if (!is.numeric(x) || !is.numeric(y)) {
          show_error("Both x and y must be numeric for a paired t-test.")
          return()
        }
        test_obj <- t.test(x, y, paired = TRUE)
        safe_report(test_obj)
      },
      "wilcoxon_signed" = {
        x <- df[[x_var]]
        y <- df[[y_var]]
        if (!is.numeric(x) || !is.numeric(y)) {
          show_error("Both x and y must be numeric for a Wilcoxon signed-rank test.")
          return()
        }
        test_obj <- wilcox.test(x, y, paired = TRUE, exact = FALSE)
        safe_report(test_obj)
      },
      "unpaired_t" = {
        y <- df[[y_var]]
        x <- df[[x_var]]
        if (is.numeric(x) && is.numeric(y)) {
          safe_report(t.test(x, y, paired = FALSE))
        } else {
          if (!is.numeric(y)) {
            show_error("Response (y) must be numeric for an unpaired t-test.")
            return()
          }
          if (!is.factor(x)) {
            x <- as.factor(x)
          }
          x <- droplevels(x)
          if (nlevels(x) != 2) {
            show_error("Predictor (x) must define exactly two groups for an unpaired t-test.")
            return()
          }
          df[[x_var]] <- x
          safe_report(t.test(reformulate(x_var, response = y_var), data = df))
        }
      },
      "mann_whitney" = {
        if (!is.numeric(df[[y_var]])) {
          show_error("Response (y) must be numeric for a Mann-Whitney U test.")
          return()
        }
        grp <- df[[x_var]]
        if (!is.factor(grp)) {
          grp <- as.factor(grp)
        }
        grp <- droplevels(grp)
        if (nlevels(grp) != 2) {
          show_error("Predictor (x) must define exactly two groups for a Mann-Whitney U test.")
          return()
        }
        df[[x_var]] <- grp
        safe_report(wilcox.test(reformulate(x_var, response = y_var), data = df, exact = FALSE))
      },
      "pearson_cor" = {
        x <- df[[x_var]]
        y <- df[[y_var]]
        if (!is.numeric(x) || !is.numeric(y)) {
          show_error("Both variables must be numeric for a Pearson correlation.")
          return()
        }
        safe_report(cor.test(x, y, method = "pearson"))
      },
      "spearman_cor" = {
        x <- df[[x_var]]
        y <- df[[y_var]]
        if (!is.numeric(x) || !is.numeric(y)) {
          show_error("Both variables must be numeric for a Spearman correlation.")
          return()
        }
        safe_report(cor.test(x, y, method = "spearman", exact = FALSE))
      },
      "chisq" = {
        x <- df[[x_var]]
        y <- df[[y_var]]
        if (is.numeric(x) || is.numeric(y)) {
          show_error("Both variables must be categorical for a chi-squared test.")
          return()
        }
        x <- droplevels(as.factor(x))
        y <- droplevels(as.factor(y))
        if (nlevels(x) < 2 || nlevels(y) < 2) {
          show_error("Both variables must have at least two categories for a chi-squared test.")
          return()
        }
        tbl <- table(x, y)
        safe_report(chisq.test(tbl), function(obj) paste(capture.output(obj), collapse = "\n"))
      },
      {
        show_error("The selected analysis is not supported.")
        return()
      }
    )

    stat_result_ui({
      if (inherits(out, c("shiny.tag", "shiny.tag.list"))) {
        out
      } else {
        HTML(paste0(
          "<div style='font-family:Open Sans;font-size:16px;line-height:1.6;'>",
          gsub("\n", "<br>", htmltools::htmlEscape(as.character(out))),
          "</div>"
        ))
      }
    })
  })

  output$has_stat_result <- reactive({ !is.null(stat_result_ui()) })
  outputOptions(output, "has_stat_result", suspendWhenHidden = FALSE)

  output$stat_output <- renderUI({
    stat_result_ui()
  })

  observeEvent(input$stat_show_code, {
    code <- build_stats_code()
    show_code_modal(
      title = "Stats code",
      description = "Use this R code to reproduce the selected statistical analysis outside the app.",
      code = code,
      copy_id = "copy_stats_code",
      status_id = "stats_copy_status",
      code_id = "stats_code_block"
    )
  })
}

shinyApp(ui, server)
