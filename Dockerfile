FROM node:8.9.1
MAINTAINER Jack Frost <j4qfrost@gmail.com>

WORKDIR /src

VOLUME /src

CMD npm install && node bot.js