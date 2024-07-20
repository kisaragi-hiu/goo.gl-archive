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
	npx concurrently \
		--restart-tries 5 \
		"npx tsx scraper.ts --init 1000 --until 2000" \
		"sleep 0.1; npx tsx scraper.ts --init 5000 --until a000" \
		"sleep 0.2; npx tsx scraper.ts --init a000 --until b000" \
		"sleep 0.3; npx tsx scraper.ts --init b000 --until c000" \
		"sleep 0.4; npx tsx scraper.ts --init D000 --until E000" \
		"sleep 0.4; npx tsx scraper.ts --init E000 --until F000" \
		"sleep 0.4; npx tsx scraper.ts --init F000 --until G000" \
		"sleep 0.5; npx tsx scraper.ts --init M000 --until N000" \
		"sleep 0.6; npx tsx scraper.ts --prefix fb --init a00 --until a000" \
		"sleep 0.7; npx tsx scraper.ts --prefix fb --init a000 --until b000"

currentJobsB:
	npx concurrently \
		--restart-tries 5 \
		"npx tsx scraper.ts --init 0000 --until 1000" \
		"npx tsx scraper.ts --init d000 --until e000" \
		"npx tsx scraper.ts --init g000 --until h000" \
		"npx tsx scraper.ts --init k000 --until l000" \
		"npx tsx scraper.ts --init p000 --until q000" \
		"npx tsx scraper.ts --init H000 --until I000" \
		"npx tsx scraper.ts --init K000 --until L000" \
		"npx tsx scraper.ts --init L000 --until M000" \
		"npx tsx scraper.ts --init N000 --until R000" \
		"npx tsx scraper.ts --init R000 --until S000" \
		"npx tsx scraper.ts --prefix fb --init b000 --until c000" \
		"npx tsx scraper.ts --prefix fb --init c000 --until d000" \
		"npx tsx scraper.ts --prefix fb --init j000 --until k000" \
		"npx tsx scraper.ts --prefix fb --init o000 --until p000" \
		"npx tsx scraper.ts --prefix fb --init g000 --until h000"

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
