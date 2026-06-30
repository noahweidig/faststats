library(microbenchmark)
library(lubridate)

col <- sample(letters, 100000, replace = TRUE)

attempt_date_parsing_old <- function(col) {
  parsed <- suppressWarnings(parse_date_time(col, orders = c("ymd", "mdy", "dmy"), quiet = TRUE))
  if (any(!is.na(parsed))) {
    parsed
  } else {
    col
  }
}

attempt_date_parsing_new <- function(col) {
  non_na_col <- na.omit(col)
  if (length(non_na_col) == 0) return(col)

  sample_vals <- head(non_na_col, 100)
  sample_parsed <- suppressWarnings(parse_date_time(sample_vals, orders = c("ymd", "mdy", "dmy"), quiet = TRUE))

  if (all(is.na(sample_parsed))) {
    return(col)
  }

  parsed <- suppressWarnings(parse_date_time(col, orders = c("ymd", "mdy", "dmy"), quiet = TRUE))
  if (any(!is.na(parsed))) {
    parsed
  } else {
    col
  }
}

mb <- microbenchmark(
  old = attempt_date_parsing_old(col),
  new = attempt_date_parsing_new(col),
  times = 10
)
print(mb)
