SSH_HOST := kisaragi@git.kisaragi-hiu.com
.ONESHELL:

backup:
	make checkpoint
	cp data.sqlite "/run/media/kisaragi-hiu/Data/backup/data-$$(date '+%Y%m%dT%H%M%S%z').sqlite"

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
		# "bun scraper.ts --init 60000 --until 70000" \
		# "bun scraper.ts --init 70000 --until 80000"

currentJobsB:
	bun scraper.ts --scrapeJobFile jobs-B.json
