redis:    redis-cli ping 2> /dev/null || redis-server /usr/local/etc/redis.conf
devices:  ./node_modules/.bin/forever -w src/devices.js
rules:    ./node_modules/.bin/forever -w src/rules.js
home:     ./node_modules/.bin/forever -w src/index.js
hookshot: ./node_modules/.bin/forever -w tools/hookshot.js
