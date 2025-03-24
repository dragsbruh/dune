FROM denoland/deno:2.2.4

COPY . .

RUN deno cache src/main.ts

CMD [ "run", "--allow-net", "--allow-read", "--allow-env", "src/main.ts" ]
