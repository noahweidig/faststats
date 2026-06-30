## 2024-05-18 - Improve Shiny Error Message Accessibility
**Learning:** Hardcoded raw HTML strings like `HTML("<b style='color:red;'>...</b>")` provide poor accessibility and contrast. Replacing them with Shiny's `div(class="alert alert-danger", role="alert", icon("exclamation-circle"), ...)` structure properly utilizes Bootstrap for accessible error messages that screen readers can interpret as alerts.
**Action:** Always prefer structured UI elements with appropriate ARIA roles (e.g., `role="alert"`) over raw HTML styling when displaying error or status messages in Shiny apps.

## 2025-02-13 - Hide Decorative Elements from Screen Readers
**Learning:** Purely decorative elements like abstract background canvases (`#particles`), animated gradient divs, and repeating icons (like emoji badges and button SVGs) add unnecessary noise to screen reader announcements. This makes the page tedious to navigate for visually impaired users.
**Action:** Apply `aria-hidden="true"` to purely decorative visual elements (like background canvases, decorative emojis, and decorative SVGs) so screen readers can skip them and focus on meaningful content and actionable elements.

## 2025-03-16 - Add Accessible Labels to Interactive Links
**Learning:** Image or icon-heavy interactive elements without explicit text descriptors (like the logo, GitHub icon, and view source buttons) get read by screen readers using only their URL or parent element content. This creates an unhelpful and confusing experience for visually impaired users.
**Action:** Add descriptive `aria-label` attributes to these links (e.g. `aria-label="QuickPlot GitHub Repository"`) so screen reader users hear an explicit purpose rather than raw URLs or generic content.

## 2025-03-24 - Provide Actionable Empty States in Shiny Reactives
**Learning:** In Shiny apps, using `req(input)` to halt execution when inputs are missing causes UI elements (like plots) to silently disappear, which is confusing and feels broken to the user.
**Action:** Replace `req()` calls with `shiny::validate(shiny::need(condition, message))` to display actionable, formatted feedback (e.g., "Please select an x variable...") instead of a blank UI.
## 2025-05-18 - Preserve Focus When Modifying UI State
**Learning:** Using `renderUI` to conditionally show/hide interactive elements (like buttons) destroys the DOM node and recreates it. This breaks keyboard navigation entirely, causing focus to jump back to the top of the page.
**Action:** When creating empty states or conditionally hiding buttons based on reactive data, prefer using Shiny's `conditionalPanel` (which toggles CSS `display: none`) instead of server-side `renderUI`. This preserves the DOM elements and ensures keyboard focus isn't lost.

## 2025-05-18 - Shiny conditionalPanel Reactive Constraints
**Learning:** Using jQuery DOM selectors (like `$('#id').length`) in Shiny's `conditionalPanel` condition fails because Shiny registers zero reactive dependencies for it, causing the condition to only evaluate once on initial page load. This leads to broken UI states where elements may permanently hide.
**Action:** To properly trigger `conditionalPanel` from server-side state, export a boolean reactive flag (e.g., `output$flag <- reactive({...})`), set `suspendWhenHidden = FALSE` on it via `outputOptions()`, and reference it in the UI using `condition = "output.flag === true"`.
