library(microbenchmark)
library(dplyr)
library(purrr)
library(tibble)
library(tidyr)

set.seed(42)
df <- data.frame(
  x = sample(letters[1:10], 100000, replace = TRUE),
  y = sample(paste0("val", 1:50), 100000, replace = TRUE),
  z = sample(c(TRUE, FALSE, NA), 100000, replace = TRUE),
  a = rnorm(100000),
  b = runif(100000),
  c = rpois(100000, 5)
)

benchmark_count_df <- function(df) {
  df %>%
    select(where(~!is.numeric(.x))) %>%
    map_dfr(~{
      counts <- dplyr::count(data.frame(val = .x), val, name = "n", sort = TRUE)
      n_na <- sum(is.na(counts$val))
      tbl <- counts$n[!is.na(counts$val)]
      names(tbl) <- counts$val[!is.na(counts$val)]
      tibble(top_levels = paste(names(tbl)[1:min(5,length(tbl))], tbl[1:min(5,length(tbl))], collapse = ", "),
             n_levels = length(tbl) + (n_na > 0))
    }, .id = "variable")
}

benchmark_count_tibble <- function(df) {
  df %>%
    select(where(~!is.numeric(.x))) %>%
    map_dfr(~{
      counts <- dplyr::count(tibble(val = .x), val, name = "n", sort = TRUE)
      n_na <- sum(is.na(counts$val))
      tbl <- counts$n[!is.na(counts$val)]
      names(tbl) <- counts$val[!is.na(counts$val)]
      tibble(top_levels = paste(names(tbl)[1:min(5,length(tbl))], tbl[1:min(5,length(tbl))], collapse = ", "),
             n_levels = length(tbl) + (n_na > 0))
    }, .id = "variable")
}

benchmark_num_map <- function(df) {
  df %>%
    select(where(is.numeric)) %>%
    map_dfr(~tibble(mean = mean(.x, na.rm=TRUE),
                    sd = sd(.x, na.rm=TRUE),
                    min = min(.x, na.rm=TRUE),
                    max = max(.x, na.rm=TRUE)),
            .id = "variable")
}

benchmark_num_summarise <- function(df) {
  df %>%
    select(where(is.numeric)) %>%
    summarise(across(everything(), list(
      mean = ~mean(.x, na.rm=TRUE),
      sd = ~sd(.x, na.rm=TRUE),
      min = ~min(.x, na.rm=TRUE),
      max = ~max(.x, na.rm=TRUE)
    ))) %>%
    pivot_longer(everything(),
                 names_to = c("variable", ".value"),
                 names_pattern = "(.*)_(mean|sd|min|max)")
}

mb <- microbenchmark(
  count_df = benchmark_count_df(df),
  count_tibble = benchmark_count_tibble(df),
  num_map = benchmark_num_map(df),
  num_summarise = benchmark_num_summarise(df),
  times = 10
)
print(mb)
