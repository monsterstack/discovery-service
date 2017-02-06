FROM node:boron-wheezy
ADD . /code
WORKDIR /code
RUN npm install
CMD ["node", "newCluster", "--numWorkers=1"]
