SSH_HOST := kisaragi@git.kisaragi-hiu.com
.ONESHELL:

backup:
	make checkpoint
	cp data.sqlite "/run/media/kisaragi-hiu/Data/backup/data-$$(date '+%Y%m%dT%H%M%S%z').sqlite"

export:
	npx tsx scraper.ts --export

exportToRemote: export
	scp external-slugs.json "$(SSH_HOST):/home/kisaragi/goo.gl-archive/external-slugs.json"

checkpoint:
	sqlite3 data.sqlite "pragma wal_checkpoint;"

copyDbFromRemote:
	ssh "$(SSH_HOST)" bash << HERE
		cd /home/kisaragi/goo.gl-archive/
		make checkpoint
	HERE
	scp "$(SSH_HOST):/home/kisaragi/goo.gl-archive/data.sqlite" remote-data.sqlite

mergeRemoteData: copyDbFromRemote
	bun merge.ts data.sqlite remote-data.sqlite
	rm remote-data.sqlite

scrapeMentions:
	npx tsx scraper.ts --mentionsScrape

currentJobsA:
	bunx concurrently \
		--restart-tries 5 \
		"bun scraper.ts --init 00000 --until 10000" \
		"bun scraper.ts --init 10000 --until 20000" \
		"bun scraper.ts --init 20000 --until 30000" \
		"bun scraper.ts --init 30000 --until 40000" \
		"bun scraper.ts --init 40000 --until 50000" \
		"bun scraper.ts --init 50000 --until 60000" \
		"bun scraper.ts --init 60000 --until 70000" \
		"bun scraper.ts --init 70000 --until 80000"

currentJobsB:
	npx concurrently \
		--restart-tries 5 \
		"bun scraper.ts --init 2000 --until 5000" \
		"bun scraper.ts --init 7000 --until a000" \
		"bun scraper.ts --init c000 --until f000" \
		"bun scraper.ts --init z000 --until B000" \
		"bun scraper.ts --init B000 --until D000" \
		"bun scraper.ts --init x000 --until z000" \
		"bun scraper.ts --init O000 --until R000" \
		"bun scraper.ts --init S000 --until W000" \
		"bun scraper.ts --init W000 --until Y000" \
		"bun scraper.ts --init v000 --until x000" \
		"bun scraper.ts --prefix fb --init 2000 --until 6000" \
		"bun scraper.ts --prefix fb --init e000 --until i000" \
		"bun scraper.ts --prefix fb --init v000 --until x000"

currentJobsC:
	npx concurrently \
		--restart-tries 5 \
		"npx tsx scraper.ts --init q000 --until r000" \
		"npx tsx scraper.ts --init r000 --until s000" \
		"npx tsx scraper.ts --init T000 --until U000"
