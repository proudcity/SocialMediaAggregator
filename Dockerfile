## BUILDING
##   (from project root directory)
##   $ docker build -t node-js-6-11-1-on-minideb .
##
## RUNNING
##   $ docker run -p 3000:3000 node-js-6-11-1-on-minideb
##
## CONNECTING
##   Lookup the IP of your active docker host using:
##     $ docker-machine ip $(docker-machine active)
##   Connect to the container at DOCKER_IP:3000
##     replacing DOCKER_IP for the IP of your active docker host

FROM gcr.io/bitnami-containers/minideb-extras:jessie-r14-buildpack

MAINTAINER Bitnami <containers@bitnami.com>

ENV STACKSMITH_STACK_ID="n34aso9" \
    STACKSMITH_STACK_NAME="Node.js 6.11.1 on minideb" \
    STACKSMITH_STACK_PRIVATE="1"

# Install required system packages
RUN install_packages libc6 libssl1.0.0 libncurses5 libtinfo5 libsqlite3-0 zlib1g libbz2-1.0 libreadline6 libstdc++6 libgcc1 ghostscript imagemagick libmysqlclient18

RUN bitnami-pkg install node-6.11.1-0 --checksum 30c14d5d23328aafdfe6d63a8956a8cca4eb6bf4f13cbdc6a080a05731b614c1

ENV PATH=/opt/bitnami/node/bin:/opt/bitnami/python/bin:$PATH \
    NODE_PATH=/opt/bitnami/node/lib/node_modules

## STACKSMITH-END: Modifications below this line will be unchanged when regenerating

# ExpressJS template
COPY ./app /app
WORKDIR /app

#RUN rm /app/.env

# Other packages
RUN apt-get update && apt-get install -y vim

RUN npm install -g forever
RUN npm install

EXPOSE 3000

CMD forever -l /app/logs/server.log -o /app/logs/out.log -e /app/logs/err.log /app/app.js