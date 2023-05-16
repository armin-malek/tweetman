FROM node:16
ENV NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./

COPY . .

RUN npm install

RUN npx prisma generate

CMD [ "node", "./tgbot/bot.js" ]