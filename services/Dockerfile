FROM node:20

RUN mkdir /proxy
WORKDIR /proxy

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY . .

CMD [ "node", "lib/proxy.js" ]