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
	bunx concurrently --restart-tries 5 \
		"bun scraper.ts --scrapeJobFile jobs-A.ts --threads 128"

restartA:
	pkill -f -9 concurrently
	pkill -f scraper.ts
	nohup make currentJobsA >/dev/null &

currentJobsB:
	bun scraper.ts --scrapeJobFile jobs-B.ts --threads 128
