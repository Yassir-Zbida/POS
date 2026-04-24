# One-command local stack (Next dev + MySQL + Adminer)
.PHONY: up
up:
	docker compose up --build

.PHONY: up-bg
up-bg:
	docker compose up --build -d

.PHONY: down
down:
	docker compose down

# Remove legacy fixed container names (older compose used saas-pos-*); safe if they do not exist.
.PHONY: clean-legacy
clean-legacy:
	-docker rm -f saas-pos-mysql saas-pos-app saas-pos-adminer saas-pos-mysql-prod saas-pos-app-prod 2>/dev/null

# Production-style stack (built Next + MySQL). Set JWT_SECRET in your environment.
.PHONY: prod
prod:
	docker compose -f docker-compose.prod.yml up --build -d

.PHONY: prod-down
prod-down:
	docker compose -f docker-compose.prod.yml down
