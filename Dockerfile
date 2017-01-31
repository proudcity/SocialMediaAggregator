## BUILDING
##   (from project root directory)
##   $ docker build -t node-js-0-12-9-on-minideb .
##
## RUNNING
##   $ docker run -p 3000:3000 node-js-0-12-9-on-minideb
##
## CONNECTING
##   Lookup the IP of your active docker host using:
##     $ docker-machine ip $(docker-machine active)
##   Connect to the container at DOCKER_IP:3000
##     replacing DOCKER_IP for the IP of your active docker host

FROM gcr.io/stacksmith-images/minideb-buildpack:jessie-r8

MAINTAINER Bitnami <containers@bitnami.com>

ENV STACKSMITH_STACK_ID="2myrju4" \
    STACKSMITH_STACK_NAME="Node.js 0.12.9 on minideb" \
    STACKSMITH_STACK_PRIVATE="1"

RUN bitnami-pkg install node-0.12.9-1 --checksum a1bdbb5ce546fc9d25039d8be89979596e9fddee9e48680e4cff5c5ba8a35772

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
