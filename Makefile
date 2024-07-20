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

currentJobs:
	nohup bun scraper.ts --init 1000 --until 2000 >/dev/null&
	sleep 0.1
	nohup bun scraper.ts --init 2000 --until 5000 >/dev/null&
	sleep 0.1
	nohup bun scraper.ts --init 5000 --until a000 >/dev/null&
	sleep 0.1
	nohup bun scraper.ts --init a000 --until b000 >/dev/null&
	sleep 0.1
	nohup bun scraper.ts --init b000 --until c000 >/dev/null&
	sleep 0.1
	nohup bun scraper.ts --init c000 --until d000 >/dev/null&
	sleep 0.1
	nohup bun scraper.ts --init D000 --until E000 >/dev/null&
	sleep 0.1
	nohup bun scraper.ts --init M000 --until N000 >/dev/null&
	sleep 0.1
	nohup bun scraper.ts --prefix fb --init a00 --until a000 >/dev/null&
	sleep 0.1
	nohup bun scraper.ts --prefix fb --init a000 --until b000 >/dev/null&
