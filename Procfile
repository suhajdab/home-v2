redis:    redis-cli ping 2> /dev/null || redis-server /usr/local/etc/redis.conf
devices:  ./node_modules/.bin/forever -w devices.js
rules:    ./node_modules/.bin/forever -w rules.js
home:     ./node_modules/.bin/forever -w home.js
hookshot: ./node_modules/.bin/forever -w hookshot.js
