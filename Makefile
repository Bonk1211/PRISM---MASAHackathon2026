# PRISM — demo Makefile
# Use: `make` (lists targets) · `make demo` (runs everything end to end).

SHELL := /bin/bash
.DEFAULT_GOAL := help

API_HOST    ?= 0.0.0.0
API_PORT    ?= 8000
WEB_PORT    ?= 5173
PYTHON      ?= python3
NOTEBOOK    := analysis/python/analysis.ipynb
MODELS_DIR  := serve/models
ENV_LOCAL   := app/.env.local

# ---------------------------------------------------------------------------
# help
# ---------------------------------------------------------------------------

.PHONY: help
help: ## Show this help.
	@printf "\n  PRISM — demo runner\n\n"
	@printf "  Common:\n"
	@printf "    make demo        Install + start API + start web in parallel.\n"
	@printf "    make dev         Start API + web in parallel (assumes installed).\n"
	@printf "    make stop        Kill any running uvicorn / vite processes.\n\n"
	@printf "  Granular:\n"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -v '^demo\|^dev\|^stop\|^help' | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "    make %-12s %s\n", $$1, $$2}'
	@printf "\n  URLs:\n"
	@printf "    API   http://localhost:$(API_PORT)/         (index + /docs + /healthz + /predict)\n"
	@printf "    Web   http://localhost:$(WEB_PORT)/#/pipeline\n\n"

# ---------------------------------------------------------------------------
# install
# ---------------------------------------------------------------------------

.PHONY: install
install: install-api install-web ## Install both backend + frontend deps.

.PHONY: install-api
install-api: ## Install backend Python deps via pip.
	cd serve && $(PYTHON) -m pip install -q -r requirements.txt

.PHONY: install-web
install-web: ## Install frontend npm deps + seed .env.local.
	cd app && npm install --silent
	@if [ ! -f $(ENV_LOCAL) ]; then \
	  echo "VITE_PIPELINE_API=http://localhost:$(API_PORT)" > $(ENV_LOCAL); \
	  echo "  wrote $(ENV_LOCAL)"; \
	fi

# ---------------------------------------------------------------------------
# notebook → model artefacts
# ---------------------------------------------------------------------------

.PHONY: models
models: ## Re-execute notebook to (re)build serve/models/. Always runs (avoids stale-after-checkout).
	@if [ -f $(MODELS_DIR)/m3a.json ] && [ $(MODELS_DIR)/m3a.json -nt $(NOTEBOOK) ]; then \
	  echo "==> models up-to-date (m3a.json newer than notebook). Use 'make clean-models && make models' to force."; \
	else \
	  echo "==> Re-executing $(NOTEBOOK) to regenerate model artefacts"; \
	  jupyter nbconvert --to notebook --execute $(NOTEBOOK) --output /tmp/exec.ipynb; \
	  cp /tmp/exec.ipynb $(NOTEBOOK); \
	  ls -la $(MODELS_DIR); \
	fi

# ---------------------------------------------------------------------------
# run
# ---------------------------------------------------------------------------

.PHONY: api
api: ## Start FastAPI on :8000 in the foreground (with --reload for dev).
	@echo "==> API on http://$(API_HOST):$(API_PORT) (dev · reload on)"
	uvicorn serve.main:app --host $(API_HOST) --port $(API_PORT) --reload

.PHONY: api-prod
api-prod: ## Start FastAPI without --reload (use for ngrok / live demo).
	@echo "==> API on http://$(API_HOST):$(API_PORT) (prod · no reload)"
	uvicorn serve.main:app --host $(API_HOST) --port $(API_PORT) --workers 1

.PHONY: web
web: ## Start Vite dev server on :5173 in the foreground.
	@echo "==> Web on http://localhost:$(WEB_PORT)/#/pipeline"
	cd app && npm run dev

.PHONY: dev
dev: ## Start API + web in parallel. Ctrl-C kills both.
	@echo "==> Starting API + web in parallel — Ctrl-C stops both"
	@trap 'echo; echo "==> Stopping..."; kill 0' INT TERM EXIT; \
	$(MAKE) -s api & \
	$(MAKE) -s web & \
	wait

.PHONY: demo
demo: install models dev ## End-to-end: install deps, build models, run both servers.

.PHONY: ngrok
ngrok: ## Expose API via ngrok (separate terminal). Requires ngrok installed.
	@command -v ngrok >/dev/null || { echo "ngrok not installed. brew install ngrok"; exit 1; }
	ngrok http $(API_PORT)

# ---------------------------------------------------------------------------
# build / preview
# ---------------------------------------------------------------------------

.PHONY: build
build: ## Production build of the web app to app/dist/.
	cd app && npm run build

.PHONY: preview
preview: build ## Preview the production build on :4173.
	cd app && npm run preview

# ---------------------------------------------------------------------------
# verify
# ---------------------------------------------------------------------------

.PHONY: smoke
smoke: ## Curl /healthz + 2× /predict and assert expected ranges. Requires `make api` running.
	@echo "==> /healthz"
	@curl -s http://localhost:$(API_PORT)/healthz || { echo "API not reachable on :$(API_PORT)"; exit 1; }
	@echo
	@echo "==> /predict Vietnam hindcast (assert err_pct ∈ [-5,-3]%)"
	@curl -s -X POST http://localhost:$(API_PORT)/predict \
	  -H 'content-type: application/json' \
	  -d '{"country":"Vietnam","mode":"hindcast"}' \
	  | $(PYTHON) -c "import sys,json; d=json.load(sys.stdin); s=d['stage_3_xgb']; \
	    print(f'  pred {s[\"ghg_pred_Mt\"]:.2f} Mt · actual {s[\"actual_Mt\"]:.2f} Mt · err {s[\"err_pct\"]:+.2f}% · {s[\"inference_ms\"]:.2f} ms'); \
	    assert -5.0 < s['err_pct'] < -3.0, f'VN err_pct drift: {s[\"err_pct\"]}'; \
	    assert 540 < s['ghg_pred_Mt'] < 580, f'VN pred drift: {s[\"ghg_pred_Mt\"]}'"
	@echo "==> /predict Vietnam forward Net Zero 2050 (assert lr_pp_vs_base < 0)"
	@curl -s -X POST http://localhost:$(API_PORT)/predict \
	  -H 'content-type: application/json' \
	  -d '{"country":"Vietnam","mode":"forward","scenario":"Net Zero 2050","target_year":2030}' \
	  | $(PYTHON) -c "import sys,json; d=json.load(sys.stdin); s4=d['stage_4_scenario']; l=d['stage_5_loss']; \
	    print(f'  delta {s4[\"delta_pct\"]*100:+.2f}% · lr-pp {l[\"lr_pp_vs_base\"]:+.2f}pp · loss USD {l[\"loss_USDm\"]:.0f}m · swing {l[\"loss_swing_vs_hothouse_USDm\"]:+.0f}m'); \
	    assert s4['delta_pct'] < 0, f'Net Zero delta should be negative, got {s4[\"delta_pct\"]}'; \
	    assert l['lr_pp_vs_base'] < 0, f'Net Zero lr_pp should be negative, got {l[\"lr_pp_vs_base\"]}'; \
	    assert l['loss_swing_vs_hothouse_USDm'] < 0, f'Net Zero swing should be negative, got {l[\"loss_swing_vs_hothouse_USDm\"]}'"
	@echo "  smoke OK"

.PHONY: test
test: ## Run pytest regression anchors against canon JSON. Requires models built.
	cd serve && $(PYTHON) -m pytest -q tests/

# ---------------------------------------------------------------------------
# stop / clean
# ---------------------------------------------------------------------------

.PHONY: stop
stop: ## Kill any running uvicorn (serve.*) or vite processes.
	-@pkill -f "uvicorn serve" 2>/dev/null && echo "  killed uvicorn" || echo "  no uvicorn"
	-@pkill -f "vite" 2>/dev/null && echo "  killed vite" || echo "  no vite"

.PHONY: clean
clean: ## Remove build artefacts, caches, and generated models. Keeps node_modules.
	rm -rf app/dist app/.vite serve/__pycache__ serve/.pytest_cache /tmp/exec.ipynb
	@echo "  cleaned. (run 'make clean-models' to also delete serve/models/*.json)"

.PHONY: clean-models
clean-models: ## Delete generated model artefacts (regen via 'make models').
	rm -f $(MODELS_DIR)/m3a.json $(MODELS_DIR)/m3b.json $(MODELS_DIR)/meta.json

.PHONY: clean-all
clean-all: clean clean-models ## Full clean including node_modules.
	rm -rf app/node_modules
