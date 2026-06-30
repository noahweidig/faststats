## 2024-03-20 - [Fix command injection in wrangle expressions]
**Vulnerability:** User-provided expressions in `mutate` and `filter` were passed to `rlang::parse_expr()` and evaluated, resulting in a critical Remote Code Execution (RCE) vulnerability via injected commands (e.g. `system('id')`).
**Learning:** R Shiny applications that use `dplyr` operations on user-supplied code require rigorous sanitization of the Abstract Syntax Tree (AST), not just string matching. It's crucial to explicitly allowlist basic functions and operators (`+`, `-`, `(`, `[`, `n`, etc.) while accounting for namespaced calls and zero-argument functions in the AST validation.
**Prevention:** Always validate parsed expressions using a strict allowlist of functions and operations before passing them to evaluation contexts in R.

## 2024-03-22 - [Fix Formula Injection (RCE) in run_stat]
**Vulnerability:** User-provided variables (`input$stat_x` and `input$stat_y`) were passed directly to `reformulate()` without validation to ensure they were valid column names in the active dataset. This allowed users to inject arbitrary R code (e.g., `system('id')`), which was executed when the formula was evaluated by modeling functions like `lm()`, `aov()`, etc., resulting in a critical Remote Code Execution (RCE) vulnerability.
**Learning:** In R/Shiny applications, user inputs dynamically passed to statistical formula functions (like `reformulate()`) must be strictly validated against the active dataset's column names (e.g., `input_var %in% names(df)`) prior to execution to prevent formula injection and RCE.
**Prevention:** Always check that user-supplied variable names exist in the target dataset's `names()` before using them in formula generation functions.

## 2024-05-18 - [Fix RCE in match.fun() via unvalidated string]
**Vulnerability:** User-provided string in `summarize` step `fn` parameter was passed directly to `match.fun(fn)` without being constrained to a whitelist. If an attacker injects `system` or other functions, arbitrary code execution could occur.
**Learning:** In R/Shiny server logic, passing unvalidated, user-controlled strings to `match.fun()` enables arbitrary function execution. Always strictly validate such inputs against a hardcoded allowlist of permitted safe functions (e.g., `mean`, `sum`, etc.).
**Prevention:** Hardcode an allowlist (e.g., `c("mean", "median", "sum", "min", "max", "sd")`) and assert that the user input matches one of them before calling `match.fun()`.

## 2024-05-19 - [Fix DoS via unbound sample size]
**Vulnerability:** The data sampling function (`slice_sample`) accepted a user-provided numeric sample size without an upper bound. A large input (e.g., 1 billion) could be requested with replacement, leading to memory exhaustion and a Denial of Service (DoS) crash for the Shiny server.
**Learning:** To prevent Denial of Service (DoS) via memory exhaustion in R/Shiny applications, always enforce a maximum size constraint (e.g., `if (size > 1e6) stop(...)`) on user-controlled data sampling operations like `dplyr::slice_sample`, especially when sampling with replacement.
**Prevention:** Always add an upper limit validation check for user-controlled sample sizes.
