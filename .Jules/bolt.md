## 2024-05-24 - table() bottleneck in categorical profiling
**Learning:** Using `table()` for categorical summaries in large datasets is inefficient because it requires multiple passes to count values, handle NAs, and sort.
**Action:** Replace `table()` with `dplyr::count()`, which computes distinct levels and top counts in a single pass, significantly improving profiling speed in `output$cat_summary`.
## 2024-05-25 - Dataframe iteration penalty in Shiny UI rendering
**Learning:** Using `lapply(seq_len(nrow(df)), function(i) df$col[i])` to generate Shiny UI tags dynamically incurs a significant performance overhead because `df$col[i]` forces repeated single-row subsets from vectors which scale poorly as the row count increases. Data frames are not built for fast row-wise iteration in base R.
**Action:** Replace `lapply(seq_len(nrow(df)))` with `purrr::pmap(df, function(...) ...)` when building a list of Shiny elements from rows of a data frame, to completely eliminate the manual vector indexing overhead and efficiently distribute column values to the function arguments.

## 2024-05-26 - O(N) regex parsing trap on character columns
**Learning:** Automatically attempting to parse dates on all character columns using `lubridate::parse_date_time` causes a severe performance bottleneck. It runs an expensive regex engine against every row of every text column (O(N)), which blocks the main Shiny UI thread significantly for large datasets.
**Action:** Implemented a heuristic fast-path. By extracting non-NA values, sampling the first 100, and checking if *any* parse successfully before parsing the entire column, we bypass the O(N) cost for purely text columns while retaining auto-discovery for date columns.

## 2024-05-27 - data.frame() instantiation overhead in mapping loops
**Learning:** Creating intermediate `data.frame(val = .x)` structures inside iteration loops (like `map_dfr`) for categorical summaries is surprisingly slow because base R `data.frame()` creation incurs significant overhead checking dimension constraints, names, and attribute creation on every iteration.
**Action:** Replaced `data.frame(val = .x)` with `tibble(val = .x)`, which constructs the data structure much faster, greatly accelerating `dplyr::count()` operations performed repeatedly across many columns in large datasets.

## 2024-05-28 - map_dfr overhead in column-wise summarization
**Learning:** Using `purrr::map_dfr()` with `tibble()` to iterate over columns and compute numeric summaries creates high overhead because it instantiates a new tiny 1-row tibble on every iteration. This approach does not scale well to wide datasets.
**Action:** Replace `map_dfr(~tibble(...))` with `dplyr::summarise(across(everything(), ...))` combined with `tidyr::pivot_longer()`. This pushes the aggregation into dplyr's highly optimized, vectorized C++ code and performs the reshaping in bulk, significantly improving performance when profiling many numeric columns.

## 2024-05-29 - Missing reactive caching on file upload
**Learning:** Extracting file parsing logic (like reading large CSVs or Excel files) into a standard R `function` inside a Shiny server block causes the expensive parsing to be re-executed every time a downstream reactive that calls it (like `active_dataset()`) invalidates for other reasons (e.g., when the user toggles between the uploaded dataset and built-in sample datasets).
**Action:** Wrap the file upload parsing logic in its own `reactive({})` expression (`uploaded_data`) so that the parsed dataframe is cached and only re-evaluated when the uploaded `input$file` actually changes.

## 2024-05-30 - Extracting column names overhead with dplyr
**Learning:** Using `dplyr::select(where(...)) %>% names()` to retrieve column names creates high overhead because it builds an entirely new subsetted data frame in memory before simply returning the names.
**Action:** Replace this with base R `names(df)[vapply(df, ...)]` to bypass data frame allocation and dramatically speed up schema lookups, especially for wide datasets.

## 2024-05-31 - map_chr generic overhead in tight loops and reactives
**Learning:** Using `purrr::map_chr()` to extract properties from a list of steps (e.g., `purrr::map_chr(steps, "id")`) or types from a data frame (e.g., `purrr::map_chr(df, classify)`) incurs significant overhead compared to base R `vapply`. The overhead comes from `purrr::map`'s generic nature, S3 dispatch, and robust error handling which are unnecessary in tight, well-defined reactive loops or data wrangling pipelines.
**Action:** Replace `purrr::map_chr(x, "prop")` with `vapply(x, \`[[\`, "prop", FUN.VALUE = character(1), USE.NAMES = FALSE)` and `purrr::map_chr(df, fun)` with `vapply(df, fun, character(1), USE.NAMES = TRUE)` across the codebase to remove this overhead. This speeds up reactive updates when selecting or rearranging wrangle steps, and profiling data frames.

## 2024-06-01 - na.omit() attribute overhead
**Learning:** Using `na.omit()` or `stats::na.omit()` on large vectors is significantly slower than using bracket subsetting `col[!is.na(col)]`. The base R `na.omit` operation adds an `na.action` attribute containing the indices of all omitted elements, which incurs substantial allocation overhead that isn't needed when we only want the remaining non-NA values.
**Action:** Replace `na.omit()` with `x[!is.na(x)]` throughout the data parsing fast paths and level checks to avoid creating large omission attributes.

## 2026-03-21 - any(is.na()) allocation overhead
**Learning:** Using `any(is.na(x))` creates an intermediate logical vector of the same length as `x` in memory before checking for true values. This causes a significant performance and memory overhead on large datasets. `anyNA(x)` is implemented directly in C, avoids allocating this intermediate vector entirely, and short-circuits to return TRUE the moment the first NA is encountered.
**Action:** Replace `any(is.na(x))` with `anyNA(x)` whenever checking for the presence of missing values in large columns or vectors, especially inside iterative pipelines like `replace_missing_column`.

## 2024-06-02 - map_dfr overhead in column-wise iterative data frame operations
**Learning:** Using `purrr::map_dfr` to apply a function over a large list of columns and bind the results is slower than using base R `lapply` combined with `dplyr::bind_rows`. The overhead comes from `purrr::map_dfr`'s internal generic checks and coercions, especially noticeable when dealing with many columns or repeating operations within reactive UI contexts.
**Action:** Replace `purrr::map_dfr()` with `lapply` over column names combined with `dplyr::bind_rows()` when building column summary tables, eliminating mapping overhead and accelerating `output$cat_summary`.

## 2024-06-03 - map and imap overhead in list iterations
**Learning:** Using `purrr::map()` and `purrr::imap()` to iterate over lists (like `groups` or `steps`) inside rendering logic incurs significant overhead because of `purrr`'s generic dispatch and type checking. Base R `lapply` is considerably faster for simple iterations where type strictness is not required.
**Action:** Replaced `purrr::map(steps, ...)` and `purrr::imap(groups, ...)` with `lapply(steps, ...)` and `lapply(names(groups), function(type) { cols <- groups[[type]]; ... })` to eliminate generic mapping overhead and speed up UI rendering contexts like `output$wrangle_steps_ui` and `dataset_column_summary`.

## 2024-06-04 - mutate(across(where(is.character))) overhead in data ingestion
**Learning:** Using `dplyr::mutate(across(where(is.character), ...))` sequentially to process character columns and parse dates incurs significant overhead. The tidyselect `where` clause creates intermediate full data frames, evaluating the condition across all columns, multiple times.
**Action:** Replace sequential `mutate(across(where(is.character)))` calls with a single base R pass: `vapply(x, is.character, logical(1))` to identify column indices, then using `lapply` to perform replacement and parsing directly. This eliminates tidyselect overhead and avoids intermediate dataframe allocations.

## 2024-06-05 - across(all_of(...)) overhead inside distinct
**Learning:** Using `dplyr::distinct(across(all_of(cols)), .keep_all = keep_all)` incurs a significant performance penalty. The `across()` function evaluates tidyselect logic and creates internal scopes that add unnecessary overhead. The correct and faster modern `dplyr` approach for selecting columns inside data-masking verbs like `distinct` is `pick(all_of(cols))` instead of `across(all_of(cols))`.
**Action:** Replace `distinct(across(all_of(...)))` with `distinct(pick(all_of(...)))` in the data wrangling pipeline execution to avoid `across()` evaluation overhead while maintaining correct tidyselect behavior.

## 2024-06-06 - purrr::pmap overhead in HTML tag generation
**Learning:** While `purrr::pmap` is better than `lapply(seq_len(nrow(df)))` to avoid row-wise indexing overhead, it still incurs significant overhead from `purrr`'s generic dispatch, error handling, and coercion. In base R, generating a list of tags from data frame columns row-by-row can be performed significantly faster using `Map(..., USE.NAMES = FALSE)`.
**Action:** Replaced `purrr::pmap` with `Map(..., USE.NAMES = FALSE)` for row-wise HTML tag generation in the statistical reporting logic, completely removing the dependency on `purrr` in the shiny app for improved rendering performance.
