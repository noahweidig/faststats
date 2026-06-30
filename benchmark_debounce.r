library(shiny)
library(testthat)

# Mocking the reactive behavior to measure debounce
# This script simulates the delay caused by debounce

test_that("Debounce is within acceptable range (500-1000ms)", {
  # We cannot easily test Shiny debounce without a running app,
  # but we can inspect the source code or use a reactive test harness.

  # For this reproduction, we will assume we can inspect the defined delay.
  # In a real scenario with shinytest2, we would measure the time between input and output update.

  source("app/app.R")

  # Extract the debounce value from the code (static analysis approach for this environment)
  lines <- readLines("app/app.R")
  debounce_line <- grep("wrangle_steps_delayed <- debounce", lines, value = TRUE)

  # Parse the value
  value <- as.numeric(gsub(".*debounce\\(.*, ([0-9]+)\\).*", "\\1", debounce_line))

  expect_true(!is.na(value))
  expect_true(value >= 500 && value <= 1000)

  cat(sprintf("Current debounce value: %dms\n", value))
})
