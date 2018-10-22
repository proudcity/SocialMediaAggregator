# This Dockerfile uses the stock node container for Node.js, release 8.X (latest)

FROM node:8

# install ssh for npm git and phantom dep
RUN apt-get update && apt-get -y install ssh libfontconfig libfreetype6 vim \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# https://github.com/nodejs/docker-node/issues/479#issuecomment-319446283
# and https://github.com/nodejs/docker-node/blob/master/docs/BestPractices.md#global-npm-dependencies
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
# optionally if you want to run npm global bin without specifying path
ENV PATH=$PATH:/home/node/.npm-global/bin
ENV NODE_ENV="production"

# allow node user to bind to port 80 https://gist.github.com/firstdoit/6389682
RUN setcap 'cap_net_bind_service=+ep' `which node`

RUN npm install -g forever

# Copy app's source code to the /app directory
COPY ./app /home/node/app

# The application's directory will be the working directory
WORKDIR /home/node/app

# Install Node.js dependencies defined in '/app/packages.json'
RUN npm install

# EXPOSE 3000

RUN chown -R node:node ./logs

USER node

# Start the application
CMD forever -l ./logs/server.log -o ./logs/out.log -e ./logs/err.log app.js