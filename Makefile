SSH_HOST := kisaragi@git.kisaragi-hiu.com
.ONESHELL:

backup:
	make checkpoint
	cp data.sqlite "data-$$(date '+%Y%m%dT%H%M%S%z').sqlite"

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
	npx tsx scraper.ts --exportMentions
	npx concurrently \
		--restart-tries 5 \
		"npx tsx scraper.ts --slugArrayFile 'mentioned-slugs.json'" \
		"sleep 0.1; npx tsx scraper.ts --slugArrayFile 'mentioned-slugs.json'" \
		"sleep 0.2; npx tsx scraper.ts --slugArrayFile 'mentioned-slugs.json'" \
		"sleep 0.3; npx tsx scraper.ts --slugArrayFile 'mentioned-slugs.json'" \
		"sleep 0.4; npx tsx scraper.ts --slugArrayFile 'mentioned-slugs.json'" \
		"sleep 0.5; npx tsx scraper.ts --slugArrayFile 'mentioned-slugs.json'" \
		"sleep 0.6; npx tsx scraper.ts --slugArrayFile 'mentioned-slugs.json'" \
		"sleep 0.7; npx tsx scraper.ts --slugArrayFile 'mentioned-slugs.json'"

currentJobsA:
	bunx concurrently \
		--restart-tries 5 \
		"bun scraper-bun.ts --init 3000 --until 4000" \
		"bun scraper-bun.ts --init 7000 --until 8000" \
		"bun scraper-bun.ts --init 8000 --until 9000" \
		"bun scraper-bun.ts --init G000 --until H000" \
		"bun scraper-bun.ts --init I000 --until J000" \
		"bun scraper-bun.ts --init J000 --until K000" \
		"bun scraper-bun.ts --init Y000 --until Z000" \
		"bun scraper-bun.ts --prefix fb --init d000 --until e000"

currentJobsB:
	npx concurrently \
		--restart-tries 5 \
		"bun scraper-bun.ts --init 2000 --until 3000" \
		"bun scraper-bun.ts --init 4000 --until 5000" \
		"bun scraper-bun.ts --init C000 --until D000" \
		"bun scraper-bun.ts --init O000 --until P000" \
		"bun scraper-bun.ts --init P000 --until Q000" \
		"bun scraper-bun.ts --init Q000 --until R000" \
		"bun scraper-bun.ts --init S000 --until T000" \
		"bun scraper-bun.ts --init T000 --until U000" \
		"bun scraper-bun.ts --init Z000 --until ZZZZ" \
		"bun scraper-bun.ts --init c000 --until d000" \
		"bun scraper-bun.ts --init z000 --until A000" \
		"bun scraper-bun.ts --prefix fb --init C000 --until D000" \
		"bun scraper-bun.ts --prefix fb --init 2000 --until 3000" \
		"bun scraper-bun.ts --prefix fb --init v000 --until w000" \
		"bun scraper-bun.ts --prefix fb --init l000 --until m000"

currentJobsC:
	npx concurrently \
		--restart-tries 5 \
		"npx tsx scraper.ts --init q000 --until r000" \
		"npx tsx scraper.ts --init r000 --until s000" \
		"npx tsx scraper.ts --init v000 --until w000" \
		"npx tsx scraper.ts --init w000 --until x000" \
		"npx tsx scraper.ts --init x000 --until y000" \
		"npx tsx scraper.ts --init y000 --until z000" \
		"npx tsx scraper.ts --init T000 --until U000"
