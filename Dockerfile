FROM node:6

RUN npm install -g forever

RUN mkdir /src

VOLUME /src

COPY ./app /src

WORKDIR /src

RUN npm install

EXPOSE 443
EXPOSE 80

CMD forever -a -l /src/logs/server.log -o /src/logs/out.log -e /src/logs/err.log /src/app.js