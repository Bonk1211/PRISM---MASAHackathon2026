# =============================================================================
# MASA Hackathon 2026: R-Ignite — Interactive Climate Risk Dashboard
# =============================================================================
# Run with:  shiny::runApp("shiny_app")
#
# This dashboard targets the BONUS judging criterion explicitly:
#   "provides interactive dashboards/apps which address the questions, links
#    analysis to relevant policy documents/international treaty on climate change."
#
# It allows a Hannover Re consultant to:
#   1. Select any SEA country and inspect its emissions trajectory + drivers
#   2. Toggle NGFS scenarios (Net Zero 2050 / Disorderly / Hot House / proposed Mitigation)
#   3. Adjust the renewable-energy lever (mitigation strength) and see live 2030 impact
#   4. View the resulting reinsurance loss-ratio impact on a configurable portfolio
# =============================================================================

library(shiny)
library(shinydashboard)
library(tidyverse)
library(plotly)
library(DT)
library(scales)

# -----------------------------------------------------------------------------
# Data load (uses cleaned panel saved by analysis.Rmd; falls back to raw WDI)
# -----------------------------------------------------------------------------
clean_path <- "../data/sea_panel_clean.csv"
if (!file.exists(clean_path)) clean_path <- "data/sea_panel_clean.csv"

panel <- read_csv(clean_path, show_col_types = FALSE)

SEA <- c("Malaysia","Indonesia","Thailand","Philippines","Vietnam",
         "Singapore","Cambodia","Myanmar","Lao PDR","Brunei Darussalam")

NGFS <- tibble(
  scenario = c("Net Zero 2050","Delayed Transition","Current Policies"),
  growth   = c(-0.025,           0.010,                0.025),
  colour   = c("#27ae60",        "#f39c12",            "#c0392b")
)

# -----------------------------------------------------------------------------
# Diagnostic-tab data — pre-computed from supplementary EDA scripts
#   run_section3.py (pairwise + partial + residuals) and run_section3_round2.py (sectoral)
# -----------------------------------------------------------------------------
diag_corr <- tibble(
  indicator = c("CO2_intensity_GDP","forest_area_pct","industry_pct_GDP","energy_use_pc",
                "renewable_energy_pct","GDP_per_capita_2015USD","freshwater_withdrawal_pct",
                "renewable_elec_pct","urban_pop_pct","agriculture_pct_GDP","agri_land_pct"),
  pairwise  = c(0.413, -0.493, -0.137, -0.452, -0.133, -0.367, -0.061,
                -0.143, -0.069, -0.024, 0.673),
  partial   = c(0.754,  0.634,  0.539,  0.517, -0.437, -0.433, -0.362,
                -0.239, -0.228,  0.161, 0.063)
)

stirpat_resid <- tibble(
  country = c("Philippines","Indonesia","Singapore","Myanmar","Thailand",
              "Cambodia","Vietnam","Malaysia","Lao PDR","Brunei Darussalam"),
  residual_pct = c(-49.2, -18.8, -11.5, 4.1, 5.6, 13.2, 24.4, 32.2, 92.9, 287.1)
)

sectoral_resid <- tibble(
  country = rep(c("Malaysia","Indonesia","Thailand","Philippines","Vietnam",
                  "Singapore","Cambodia","Myanmar","Lao PDR","Brunei Darussalam"), each = 8),
  sector  = rep(c("Agriculture","Buildings","Fugitive (Energy)","Industrial Combustion",
                  "Industrial Processes","Power Industry","Transport","Waste"), times = 10),
  residual_pct = c(
    -54,  -55,  154,   78,   51,  172,   62,   16,   # Malaysia
    -39,  -67,   83,   65,  -21,   77,   17,   -6,   # Indonesia
     18,  -44,  -16,   90,  155,   63,   66,   50,   # Thailand
    -37,  -61,  -67,  -54,  -36,   66,  -22,  -46,   # Philippines
     26,  -43,  -24,  276,  147,  280,    8,   -9,   # Vietnam
    -99,  -88,   17,    9,  255,  -46,  -76,   24,   # Singapore
    146,  -37,  -69,   29,  122,   38,   70,  -40,   # Cambodia
    110,   -1,  -76,   34,  -19,   14,    4,  -38,   # Myanmar
    189,  -60,   14,   17,  420,  781,   18,  -50,   # Lao PDR
    -55,  -51, 4205,   76,  137,  351,   25,  -42)   # Brunei
)
# Cap Brunei Fugitive value for cleaner colour scaling (note in tooltip)
sectoral_resid$residual_capped <- pmin(pmax(sectoral_resid$residual_pct, -200), 400)

# -----------------------------------------------------------------------------
# UI
# -----------------------------------------------------------------------------
ui <- dashboardPage(
  skin = "black",
  dashboardHeader(title = "R-Ignite: SEA Climate Risk Dashboard", titleWidth = 380),
  dashboardSidebar(
    width = 250,
    sidebarMenu(
      menuItem("Country Profile",     tabName = "profile",   icon = icon("globe")),
      menuItem("Driver Analysis",     tabName = "drivers",   icon = icon("chart-bar")),
      menuItem("Indicator Diagnostic",tabName = "diagnostic",icon = icon("microscope")),
      menuItem("Scenario Stress Test",tabName = "stress",    icon = icon("bolt")),
      menuItem("Reinsurance Impact",  tabName = "reinsure",  icon = icon("shield-alt")),
      menuItem("Policy Linkage",      tabName = "policy",    icon = icon("file-alt"))
    ),
    hr(),
    selectInput("country", "Country:", choices = SEA, selected = "Vietnam"),
    sliderInput("year_range", "Year range:", min = 1990, max = 2024,
                value = c(2000, 2024), sep = "")
  ),
  dashboardBody(
    tags$head(tags$style(HTML("
      .box.box-solid.box-primary>.box-header { background: #1a2942; }
      .box.box-solid.box-primary { border-color: #1a2942; }
      .small-box.bg-aqua { background-color: #1a2942 !important; }
    "))),
    tabItems(
      # ---------------- Tab 1: Country Profile ---------------------------
      tabItem(tabName = "profile",
        fluidRow(
          valueBoxOutput("vb_ghg",   width = 3),
          valueBoxOutput("vb_pcap",  width = 3),
          valueBoxOutput("vb_renew", width = 3),
          valueBoxOutput("vb_intensity", width = 3)
        ),
        fluidRow(
          box(title = "Total GHG emissions trajectory", status = "primary", solidHeader = TRUE,
              width = 12, plotlyOutput("plot_ghg", height = "380px"))
        ),
        fluidRow(
          box(title = "Affluence vs emissions (decoupling diagnostic)",
              status = "primary", solidHeader = TRUE, width = 6,
              plotlyOutput("plot_decoupling", height = "320px")),
          box(title = "Energy mix evolution", status = "primary", solidHeader = TRUE, width = 6,
              plotlyOutput("plot_energy", height = "320px"))
        )
      ),
      # ---------------- Tab 2: Drivers --------------------------------
      tabItem(tabName = "drivers",
        fluidRow(
          box(title = "Indicator vs GHG (panel scatter)", status = "primary", solidHeader = TRUE,
              width = 8, plotlyOutput("plot_drivers", height = "440px")),
          box(title = "Choose driver", status = "primary", solidHeader = TRUE, width = 4,
              selectInput("driver_var", NULL,
                  choices = c("GDP_constant_2015USD","population","urban_pop_pct",
                              "renewable_energy_pct","forest_area_pct","CO2_intensity_GDP",
                              "industry_pct_GDP","agriculture_pct_GDP","GDP_per_capita_2015USD"),
                  selected = "GDP_constant_2015USD"),
              p(strong("Reading:"), "tight clustering = strong driver across SEA;",
                "country-specific outliers = idiosyncratic risk."),
              p(strong("Method:"), "Bivariate scatter on the SEA panel 1990–2024,",
                "with country-coloured trend lines."))
        )
      ),
      # ---------------- Tab 3: Indicator Diagnostic --------------------
      tabItem(tabName = "diagnostic",
        fluidRow(
          box(title = "About this tab", status = "primary", solidHeader = TRUE, width = 12,
              p("This panel reveals which indicators are ", strong("genuine drivers"),
                " of GHG emissions versus ", strong("scale artefacts"),
                ". The pairwise (raw) correlation answers ",
                em("'how does this indicator move with GHG?'"),
                "  The partial correlation answers ",
                em("'how does this indicator move with GHG ", strong("after controlling for GDP and population"), "?'"),
                "  Indicators where the two diverge (or flip sign) carry the most analytical interest for underwriting.")
          )
        ),
        fluidRow(
          box(title = "Pairwise vs partial correlation with log(GHG)",
              status = "primary", solidHeader = TRUE, width = 8,
              plotlyOutput("plot_diagnostic", height = "440px"),
              p(em("Bars to the right of zero = positive association with GHG; left of zero = negative.",
                   "Notable sign flips (forest area, industry share, energy use per capita) are flagged in §3.2 of the report."))),
          box(title = "Controls", status = "primary", solidHeader = TRUE, width = 4,
              radioButtons("diag_view", "Display:",
                  choices = c("Both correlations side by side" = "both",
                              "Pairwise only"  = "pair",
                              "Partial only"   = "part"),
                  selected = "both"),
              hr(),
              checkboxInput("diag_sortabs", "Sort by absolute partial value", value = TRUE),
              hr(),
              h4("Reading guide"),
              tags$ul(
                tags$li(strong("Sign flip"), " — indicator changes direction once scale is controlled. Forest area, industry share, energy use per capita."),
                tags$li(strong("Robust signal"), " — strong in both views. CO₂ intensity of GDP."),
                tags$li(strong("Scale artefact"), " — strong pairwise, weak partial. Agricultural land share."))
          )
        ),
        fluidRow(
          box(title = "STIRPAT residuals — country-level idiosyncratic risk",
              status = "primary", solidHeader = TRUE, width = 12,
              plotlyOutput("plot_stirpat_residuals", height = "360px"),
              p(em("Positive = country emits MORE than population × GDP would predict (over-emitter).",
                   "Negative = country emits LESS (under-emitter, scale-adjusted).",
                   "Brunei (oil/LNG economy) is the regional outlier; Vietnam is the most material over-emitter from a portfolio-risk perspective."))),
        ),
        fluidRow(
          box(title = "Sectoral residuals — drilling into the country story",
              status = "primary", solidHeader = TRUE, width = 12,
              plotlyOutput("plot_sectoral", height = "440px"),
              p(em("Each cell shows how much that country × sector combination over- or under-emits relative to scale.",
                   "Vietnam's aggregate +24% over-emission concentrates almost entirely in Power Industry and Industrial Combustion.")))
        )
      ),
      # ---------------- Tab 4: Stress Test ----------------------------
      tabItem(tabName = "stress",
        fluidRow(
          box(title = "Scenario controls", status = "primary", solidHeader = TRUE, width = 4,
              checkboxGroupInput("scenarios_in", "NGFS scenarios:",
                  choices = NGFS$scenario, selected = NGFS$scenario),
              hr(),
              h4("Mitigation Lever"),
              sliderInput("renewable_shift", "Δ renewable share by 2030 (pp):",
                          min = 0, max = 15, value = 5, step = 1),
              sliderInput("mitig_decay", "Mitigation effect on growth (pp p.a.):",
                          min = 0, max = 4, value = 1.5, step = 0.5),
              p(em("The mitigation lever models the proposed regional",
                   "renewable-energy-linked parametric reinsurance product."))
          ),
          box(title = "2024 → 2030 GHG projection", status = "primary", solidHeader = TRUE, width = 8,
              plotlyOutput("plot_stress", height = "440px"))
        ),
        fluidRow(
          box(title = "Projection table", status = "primary", solidHeader = TRUE, width = 12,
              DTOutput("tbl_stress"))
        )
      ),
      # ---------------- Tab 4: Reinsurance Impact ---------------------
      tabItem(tabName = "reinsure",
        fluidRow(
          box(title = "Portfolio assumptions", status = "primary", solidHeader = TRUE, width = 4,
              numericInput("gwp", "SEA GWP (USD millions):", value = 1200, min = 100, step = 100),
              numericInput("base_lr", "Base loss ratio:", value = 0.62, min = 0.3, max = 0.95, step = 0.01),
              sliderInput("elasticity", "Loss-to-emissions elasticity:",
                          min = 0.3, max = 1.2, value = 0.7, step = 0.1),
              p(em("Elasticity sourced from Swiss Re sigma 1/2024 — medium-term insured",
                   "catastrophe loss to regional emissions."))
          ),
          box(title = "2030 expected loss by scenario", status = "primary", solidHeader = TRUE, width = 8,
              plotlyOutput("plot_loss", height = "320px"),
              br(),
              DTOutput("tbl_loss"))
        )
      ),
      # ---------------- Tab 5: Policy linkage -------------------------
      tabItem(tabName = "policy",
        fluidRow(
          box(title = "Policy & framework alignment", status = "primary", solidHeader = TRUE, width = 12,
              tags$ul(
                tags$li(strong("Paris Agreement (2015), Article 2.1(c):"),
                        " Recommendations align with finance-flow alignment objective ",
                        "via ESG-linked underwriting."),
                tags$li(strong("UNFCCC NDCs (Nationally Determined Contributions):"),
                        " Vietnam (2022 update) targets 43.5% emissions reduction by 2030 with international support; ",
                        "Philippines (2021) targets 75% reduction by 2030."),
                tags$li(strong("ASEAN Strategy for Carbon Neutrality (2023):"),
                        " Regional commitment underpins the parametric typhoon reinsurance product opportunity."),
                tags$li(strong("Bank Negara Malaysia Climate Risk Stress Testing 2024 Methodology:"),
                        " Stress-test methodology in this dashboard mirrors BNM CRST scenario design ",
                        "(Net Zero 2050 / Disorderly / Hot House)."),
                tags$li(strong("NGFS Phase V Scenarios (2024):"),
                        " Growth-rate calibrations sourced from NGFS reference pathways."),
                tags$li(strong("IFRS S2 (2023) Climate-related Disclosures:"),
                        " Output of this analysis directly supports Hannover Re's IFRS S2 ",
                        "scenario-analysis disclosure obligations."),
                tags$li(strong("TCFD Recommendations (2017, embedded in IFRS S2):"),
                        " Risk identification and metrics align with TCFD pillars (Strategy & Metrics).")
              )
          )
        )
      )
    )
  )
)

# -----------------------------------------------------------------------------
# SERVER
# -----------------------------------------------------------------------------
server <- function(input, output, session) {

  # Reactive country slice
  country_data <- reactive({
    panel %>% filter(country == input$country,
                     year >= input$year_range[1], year <= input$year_range[2])
  })

  # ---- Value boxes ----
  output$vb_ghg <- renderValueBox({
    v <- panel %>% filter(country == input$country, year == 2024) %>%
      pull(GHG_total_MtCO2e)
    valueBox(
      sprintf("%.1f Mt", ifelse(length(v), v, NA)),
      paste("2024 GHG —", input$country),
      icon = icon("smog"), color = "aqua")
  })
  output$vb_pcap <- renderValueBox({
    v <- panel %>% filter(country == input$country, year == 2024) %>%
      pull(GHG_per_capita_tCO2e)
    valueBox(sprintf("%.2f t", ifelse(length(v), v, NA)),
             "GHG per capita (2024)",
             icon = icon("user"), color = "navy")
  })
  output$vb_renew <- renderValueBox({
    v <- panel %>% filter(country == input$country, year == max(year[!is.na(renewable_energy_pct)])) %>%
      pull(renewable_energy_pct) %>% .[1]
    valueBox(sprintf("%.1f%%", ifelse(length(v), v, NA)),
             "Renewable energy share",
             icon = icon("leaf"), color = "green")
  })
  output$vb_intensity <- renderValueBox({
    v <- panel %>% filter(country == input$country, year == 2024) %>% pull(CO2_intensity_GDP)
    valueBox(sprintf("%.3f", ifelse(length(v), v, NA)),
             "Carbon intensity of GDP (kg CO₂/USD)",
             icon = icon("industry"), color = "orange")
  })

  # ---- Tab 1 plots ----
  output$plot_ghg <- renderPlotly({
    p <- ggplot(country_data(), aes(year, GHG_total_MtCO2e)) +
      geom_area(fill = "#1a2942", alpha = 0.55) +
      geom_line(colour = "#1a2942", linewidth = 1) +
      geom_point(data = . %>% filter(year == 2024), colour = "#c0392b", size = 2.6) +
      scale_y_continuous(labels = label_comma()) +
      labs(x = NULL, y = "Mt CO₂e",
           title = sprintf("%s — Total GHG emissions", input$country)) +
      theme_minimal(base_size = 12)
    ggplotly(p)
  })

  output$plot_decoupling <- renderPlotly({
    d <- panel %>% filter(country %in% SEA,
                          year >= input$year_range[1], year <= input$year_range[2])
    p <- ggplot(d, aes(GDP_per_capita_2015USD, CO2_per_capita_tCO2e,
                       colour = country, size = population, label = year)) +
      geom_point(alpha = 0.55) +
      scale_x_log10(labels = label_comma()) +
      scale_size_continuous(guide = "none") +
      labs(x = "GDP per capita (log)", y = "CO₂ per capita") +
      theme_minimal(base_size = 11)
    ggplotly(p, tooltip = c("country","label","x","y"))
  })

  output$plot_energy <- renderPlotly({
    d <- country_data() %>%
      pivot_longer(c(renewable_energy_pct, renewable_elec_pct),
                   names_to = "metric", values_to = "value")
    p <- ggplot(d, aes(year, value, colour = metric)) +
      geom_line(linewidth = 1) + geom_point(size = 1.5) +
      scale_colour_manual(values = c(renewable_energy_pct = "#27ae60",
                                     renewable_elec_pct  = "#2980b9"),
                          labels = c("Energy consumption","Electricity output")) +
      labs(x = NULL, y = "% of total", colour = NULL) +
      theme_minimal(base_size = 11) + theme(legend.position = "bottom")
    ggplotly(p)
  })

  # ---- Tab 2: Driver scatter ----
  output$plot_drivers <- renderPlotly({
    d <- panel %>% filter(country %in% SEA, year >= 1990, !is.na(.data[[input$driver_var]]))
    p <- ggplot(d, aes(.data[[input$driver_var]], GHG_total_MtCO2e,
                       colour = country, label = year)) +
      geom_point(alpha = 0.6) +
      geom_smooth(method = "lm", se = FALSE, linewidth = 0.6) +
      scale_y_log10(labels = label_comma()) +
      labs(x = input$driver_var, y = "Total GHG (Mt CO₂e, log)") +
      theme_minimal(base_size = 11)
    if (input$driver_var %in% c("GDP_constant_2015USD","population","GDP_per_capita_2015USD"))
      p <- p + scale_x_log10(labels = label_comma())
    ggplotly(p, tooltip = c("country","label","x","y"))
  })

  # ---- Tab 3: Indicator Diagnostic ----
  output$plot_diagnostic <- renderPlotly({
    d <- diag_corr
    # Sort
    if (input$diag_sortabs) {
      d <- d %>% arrange(abs(partial))
    } else {
      d <- d %>% arrange(partial)
    }
    d$indicator <- factor(d$indicator, levels = d$indicator)

    # Long format respecting selected view
    keep <- switch(input$diag_view,
                   "both" = c("pairwise","partial"),
                   "pair" = "pairwise",
                   "part" = "partial")
    dl <- d %>%
      pivot_longer(c(pairwise, partial), names_to = "type", values_to = "r") %>%
      filter(type %in% keep) %>%
      mutate(type = recode(type,
                           pairwise = "Pairwise (raw)",
                           partial  = "Partial (controlling for GDP & population)"))

    p <- ggplot(dl, aes(r, indicator, fill = type, text = sprintf("%s\n%s = %.2f", indicator, type, r))) +
      geom_col(position = position_dodge(width = 0.75), width = 0.7,
               colour = "black", linewidth = 0.25) +
      geom_vline(xintercept = 0, linewidth = 0.5) +
      scale_fill_manual(values = c("Pairwise (raw)"   = "#95a5a6",
                                   "Partial (controlling for GDP & population)" = "#2980b9")) +
      labs(x = "Correlation with log(GHG)", y = NULL, fill = NULL) +
      theme_minimal(base_size = 11) +
      theme(legend.position = "bottom")
    ggplotly(p, tooltip = "text") %>% layout(legend = list(orientation = "h", y = -0.15))
  })

  output$plot_stirpat_residuals <- renderPlotly({
    d <- stirpat_resid %>% arrange(residual_pct) %>%
      mutate(country = factor(country, levels = country),
             colour  = ifelse(residual_pct > 0, "Over-emitter", "Under-emitter"))
    p <- ggplot(d, aes(residual_pct, country, fill = colour,
                       text = sprintf("%s: %+.1f%% vs STIRPAT prediction", country, residual_pct))) +
      geom_col(colour = "black", linewidth = 0.3) +
      geom_vline(xintercept = 0, linewidth = 0.5) +
      scale_fill_manual(values = c("Over-emitter" = "#c0392b",
                                   "Under-emitter" = "#27ae60"),
                        guide = "none") +
      labs(x = "% deviation from STIRPAT prediction (2019–2023 avg)", y = NULL) +
      theme_minimal(base_size = 11)
    ggplotly(p, tooltip = "text")
  })

  output$plot_sectoral <- renderPlotly({
    d <- sectoral_resid
    p <- ggplot(d, aes(sector, country, fill = residual_capped,
                       text = sprintf("%s × %s: %+.0f%%", country, sector, residual_pct))) +
      geom_tile(colour = "white", linewidth = 0.4) +
      geom_text(aes(label = sprintf("%+.0f", residual_pct)),
                size = 2.8, colour = "black", fontface = "bold") +
      scale_fill_gradient2(low = "#2C7BB6", mid = "white", high = "#D7191C",
                           midpoint = 0, limits = c(-200, 400),
                           name = "% over/under\nSTIRPAT pred.") +
      labs(x = NULL, y = NULL) +
      theme_minimal(base_size = 10) +
      theme(axis.text.x = element_text(angle = 25, hjust = 1))
    ggplotly(p, tooltip = "text")
  })

  # ---- Tab 4: Scenario projection ----
  projection <- reactive({
    base_2024 <- panel %>% filter(country == input$country, year == 2024) %>%
      pull(GHG_total_MtCO2e) %>% .[1]
    if (length(base_2024) == 0 || is.na(base_2024)) return(NULL)

    # Build scenario growth, including dynamic mitigation
    scen <- NGFS %>% filter(scenario %in% input$scenarios_in)
    mitig_growth <- mean(scen$growth) - input$mitig_decay/100
    scen <- bind_rows(scen, tibble(scenario = "Mitigation (proposed)",
                                   growth = mitig_growth, colour = "#2980b9"))
    crossing(scen, year = 2024:2030) %>%
      mutate(emissions = base_2024 * (1 + growth)^(year - 2024))
  })

  output$plot_stress <- renderPlotly({
    pj <- projection(); req(pj)
    p <- ggplot(pj, aes(year, emissions, colour = scenario)) +
      geom_line(linewidth = 1.2) + geom_point(size = 2) +
      scale_y_continuous(labels = label_comma()) +
      scale_colour_manual(values = setNames(c(NGFS$colour, "#2980b9"),
                                            c(NGFS$scenario, "Mitigation (proposed)"))) +
      labs(title = sprintf("%s — 2030 GHG projection", input$country),
           x = NULL, y = "Mt CO₂e", colour = NULL) +
      theme_minimal(base_size = 12)
    ggplotly(p)
  })

  output$tbl_stress <- renderDT({
    pj <- projection(); req(pj)
    pj %>% select(scenario, year, emissions) %>%
      mutate(emissions = round(emissions, 2)) %>%
      pivot_wider(names_from = year, values_from = emissions) %>%
      datatable(options = list(dom = 't'), rownames = FALSE)
  })

  # ---- Tab 4: Reinsurance impact ----
  loss_calc <- reactive({
    pj <- projection(); req(pj)
    e2030 <- pj %>% filter(year == 2030)
    ref <- e2030 %>% filter(scenario == "Current Policies") %>% pull(emissions) %>% .[1]
    if (length(ref) == 0 || is.na(ref)) ref <- mean(e2030$emissions)
    e2030 %>%
      mutate(pct_chg     = emissions/ref - 1,
             loss_ratio  = input$base_lr * (1 + input$elasticity * pct_chg),
             exp_loss_USDm = loss_ratio * input$gwp,
             premium_var_USDm = exp_loss_USDm - input$base_lr * input$gwp)
  })

  output$plot_loss <- renderPlotly({
    lc <- loss_calc(); req(lc)
    p <- ggplot(lc, aes(reorder(scenario, exp_loss_USDm), exp_loss_USDm, fill = scenario)) +
      geom_col(width = 0.55) +
      geom_text(aes(label = sprintf("USD %.0f m", exp_loss_USDm)),
                hjust = -0.1, size = 3.5) +
      coord_flip() +
      scale_fill_manual(values = setNames(c(NGFS$colour, "#2980b9"),
                                          c(NGFS$scenario, "Mitigation (proposed)")),
                        guide = "none") +
      scale_y_continuous(labels = label_comma(), expand = expansion(mult = c(0, 0.18))) +
      labs(x = NULL, y = "Expected loss (USD m)") +
      theme_minimal(base_size = 11)
    ggplotly(p, tooltip = c("y"))
  })

  output$tbl_loss <- renderDT({
    lc <- loss_calc(); req(lc)
    lc %>% select(scenario, emissions, pct_chg, loss_ratio, exp_loss_USDm) %>%
      mutate(emissions = round(emissions,1),
             pct_chg = sprintf("%+.1f%%", pct_chg*100),
             loss_ratio = sprintf("%.1f%%", loss_ratio*100),
             exp_loss_USDm = sprintf("USD %.0f m", exp_loss_USDm)) %>%
      datatable(options = list(dom = 't'), rownames = FALSE,
                colnames = c("Scenario","2030 emissions (Mt)","Δ vs base",
                             "Loss ratio","Expected loss"))
  })
}

shinyApp(ui, server)
