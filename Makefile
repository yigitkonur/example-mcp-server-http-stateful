all: dev

install:
	npm install

dev:
	npm run dev

build:
	npm run build

run:
	npm run start

smoke:
	npm run smoke

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

.PHONY: all install dev build run smoke docker-up docker-down
