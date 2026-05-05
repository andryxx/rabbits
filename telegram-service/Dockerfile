FROM public.ecr.aws/i4q9j1g7/node:24

RUN mkdir -p /app

COPY src/ /app/src
COPY package.json /app/package.json
COPY tsconfig.json /app/tsconfig.json
COPY tsconfig.build.json /app/tsconfig.build.json
COPY nest-cli.json /app/nest-cli.json

WORKDIR /app

RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set maxsockets 1 \
  && npm install --ignore-scripts --no-audit --prefer-online
RUN npm run build

CMD ["npm", "run", "start:prod"]
