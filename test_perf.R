library(microbenchmark)
library(dplyr)
library(purrr)

set.seed(42)
df <- data.frame(
  x = sample(letters[1:10], 100000, replace = TRUE),
  y = sample(paste0("val", 1:50), 100000, replace = TRUE),
  z = sample(c(TRUE, FALSE, NA), 100000, replace = TRUE)
)

benchmark_table <- function(df) {
  df %>%
    select(where(~!is.numeric(.x))) %>%
    map_dfr(~{
      tbl <- sort(table(.x), decreasing = TRUE)
      tibble(top_levels = paste(names(tbl)[1:min(5,length(tbl))],
                                tbl[1:min(5,length(tbl))], collapse = ", "),
             n_levels = sum(tbl > 0) + (length(.x) > sum(tbl)))
    }, .id = "variable")
}

benchmark_count <- function(df) {
  df %>%
    select(where(~!is.numeric(.x))) %>%
    map_dfr(~{
      counts <- dplyr::count(data.frame(val = .x), val, name = "n", sort = TRUE)
      n_na <- sum(is.na(counts$val))
      tbl <- counts$n[!is.na(counts$val)]
      names(tbl) <- counts$val[!is.na(counts$val)]

      tibble(top_levels = paste(names(tbl)[1:min(5,length(tbl))],
                                tbl[1:min(5,length(tbl))], collapse = ", "),
             n_levels = length(tbl) + (n_na > 0))
    }, .id = "variable")
}

mb <- microbenchmark(
  table = benchmark_table(df),
  count = benchmark_count(df),
  times = 10
)
print(mb)
