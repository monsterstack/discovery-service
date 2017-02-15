FROM node:boron-wheezy
ADD . /code
WORKDIR /code
ENTRYPOINT ["bash", "entrypoint.sh"]
RUN npm install
CMD ["node", "cluster", "--numWorkers=1"]
