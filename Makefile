SSH_HOST := kisaragi@git.kisaragi-hiu.com
.ONESHELL:

rate:
	bun rate.ts

backup:
	make checkpoint
	rsync -h -P -z data.sqlite "/run/media/kisaragi-hiu/Data/backup/data-$$(date '+%Y%m%dT%H%M%S%z').sqlite"

checkpoint:
	sqlite3 data.sqlite "pragma wal_checkpoint;"

moveRemoteData:
	ssh "$(SSH_HOST)" bash << HERE
		cd /home/kisaragi/goo.gl-archive/
		make checkpoint
		[ -f download.sqlite ] || mv data.sqlite download.sqlite
	HERE
	rsync -h -P -z \
		"$(SSH_HOST):/home/kisaragi/goo.gl-archive/download.sqlite" \
		"remote-data-$$(date '+%Y%m%dT%H%M%S%z').sqlite"
	ssh "$(SSH_HOST)" bash << HERE
		cd /home/kisaragi/goo.gl-archive/
		[ -f download.sqlite ] && rm download.sqlite
	HERE

mergeRemoteData:
	@echo "Please manually merge using merge.ts."
	@echo "The files are getting too big at this point."

scrapeMentions:
	npx tsx scraper.ts --mentionsScrape

currentJobsA:
	bunx concurrently --restart-tries 5 \
		"bun scraper.ts --scrapeJobFile jobs-A.ts --threads 128"

restartA:
	pkill -f -9 concurrently
	pkill -f scraper.ts
	nohup make currentJobsA >/dev/null &

currentJobsB:
	bun scraper.ts --scrapeJobFile jobs-B.ts --threads 32
