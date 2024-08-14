SSH_HOST := kisaragi@git.kisaragi-hiu.com
.ONESHELL:

rate:
	bun rate.ts

backup:
	make checkpoint
	rsync -h -P all.sqlite "/run/media/kisaragi-hiu/Data/backup/data-$$(date '+%Y%m%dT%H%M%S%z').sqlite"

checkpoint:
	sqlite3 data.sqlite "pragma wal_checkpoint;"

check:
	[ -f all.sqlite ] || (echo "The main file isn't present" && exit 1)
	bun scraper.ts --db all.sqlite --scrapeJobFile blocks-done.ts --returnProgress

moveRemoteData:
	ssh "$(SSH_HOST)" bash << HERE
		cd /home/kisaragi/goo.gl-archive/
		make checkpoint
		[ -f download.sqlite ] || mv data.sqlite download.sqlite
	HERE
	rsync -h -P -z \
		"$(SSH_HOST):/home/kisaragi/goo.gl-archive/download.sqlite" \
		"/storage/7D36-175C/remote-data-$$(npx tsx jobs-A-to-string.ts)-$$(date '+%Y%m%dT%H%M%S%z').sqlite"
	ssh "$(SSH_HOST)" bash << HERE
		cd /home/kisaragi/goo.gl-archive/
		[ -f download.sqlite ] && rm download.sqlite
	HERE

mergeRemoteData:
	@echo "Please manually merge using merge.ts."
	@echo "The files are getting too big at this point."

scrapeMentions:
	npx tsx scraper.ts --mentionsScrape

libsqlite_zstd.so:
	curl -L "https://github.com/phiresky/sqlite-zstd/releases/download/v0.3.2/sqlite_zstd-v0.3.2-x86_64-unknown-linux-gnu.tar.gz" \
		| tar xzf -
	mv sqlite_zstd-v0.3.2-x86_64-unknown-linux-gnu/libsqlite_zstd.so .
	rm -r sqlite_zstd-v0.3.2-x86_64-unknown-linux-gnu

currentJobsA: libsqlite_zstd.so
	nohup bunx concurrently --restart-tries 5 \
		"bun scraper.ts --scrapeJobFile jobs-A.ts --threads 350" \
		>/dev/null &

restartA:
	pkill -f -9 concurrently
	pkill -f scraper.ts
	nohup make currentJobsA >/dev/null &

currentJobsB:
	bun scraper.ts --db "$$HOME/tmp/data.sqlite" \
		--init c0000 --until d0000 --threads 32
