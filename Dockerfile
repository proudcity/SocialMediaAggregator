## BUILDING
##   (from project root directory)
##   $ docker build -t node-js-0-12-15-on-minideb .
##
## RUNNING
##   $ docker run -p 3000:3000 node-js-0-12-15-on-minideb
##
## CONNECTING
##   Lookup the IP of your active docker host using:
##     $ docker-machine ip $(docker-machine active)
##   Connect to the container at DOCKER_IP:3000
##     replacing DOCKER_IP for the IP of your active docker host

FROM gcr.io/stacksmith-images/minideb-buildpack:jessie-r8

MAINTAINER Bitnami <containers@bitnami.com>

ENV STACKSMITH_STACK_ID="4fjfmcu" \
    STACKSMITH_STACK_NAME="Node.js 0.12.15 on minideb" \
    STACKSMITH_STACK_PRIVATE="1"

RUN bitnami-pkg install node-0.12.15-1 --checksum daf7722f8d0bfc05921ca34169d96002f18457ec8c91eb9c6272606e0f6f40f4

ENV PATH=/opt/bitnami/node/bin:/opt/bitnami/python/bin:$PATH \
    NODE_PATH=/opt/bitnami/node/lib/node_modules


## STACKSMITH-END: Modifications below this line will be unchanged when regenerating

# ExpressJS template
COPY . /app
WORKDIR /app

#RUN rm /app/.env

# Other packages
RUN apt-get update && apt-get install -y vim

RUN npm install -g forever
RUN npm install

EXPOSE 3000
CMD ["forever", "app.js"]
