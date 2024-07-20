SSH_HOST := kisaragi@git.kisaragi-hiu.com
.ONESHELL:

exportToRemote:
	bun scraper.ts --export; scp external-slugs.json "$(SSH_HOST):/home/kisaragi/goo.gl-archive/external-slugs.json"

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
	bun scraper.ts --exportMentions
	bunx concurrently \
		--restart-tries 5 \
		"bun scraper.ts --slugArrayFile 'mentioned-slugs.json'" \
		"sleep 0.1; bun scraper.ts --slugArrayFile 'mentioned-slugs.json'" \
		"sleep 0.2; bun scraper.ts --slugArrayFile 'mentioned-slugs.json'" \
		"sleep 0.3; bun scraper.ts --slugArrayFile 'mentioned-slugs.json'" \

currentJobsA:
	bunx concurrently \
		--restart-tries 5 \
		"bun scraper.ts --init 1000 --until 2000" \
		"sleep 0.1; bun scraper.ts --init 5000 --until a000" \
		"sleep 0.2; bun scraper.ts --init a000 --until b000" \
		"sleep 0.3; bun scraper.ts --init b000 --until c000" \
		"sleep 0.4; bun scraper.ts --init D000 --until E000" \
		"sleep 0.5; bun scraper.ts --init M000 --until N000" \
		"sleep 0.6; bun scraper.ts --prefix fb --init a00 --until a000" \
		"sleep 0.7; bun scraper.ts --prefix fb --init a000 --until b000"

currentJobsB:
	bunx concurrently \
		--restart-tries 5 \
		"bun scraper.ts --init d000 --until e000" \
		"sleep 0.1; bun scraper.ts --init g000 --until h000" \
		"sleep 0.2; bun scraper.ts --init H000 --until I000" \
		"sleep 0.3; bun scraper.ts --init R000 --until S000" \
		"sleep 0.4; bun scraper.ts --init k000 --until l000" \
		"sleep 0.5; bun scraper.ts --prefix fb --init j000 --until k000"
