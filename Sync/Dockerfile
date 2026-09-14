FROM node:24.15-slim
RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Sync/ ./Sync/
ENV POMMORA_SYNC_DATA=/data POMMORA_SYNC_HOST=0.0.0.0
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 7473
USER node
ENTRYPOINT ["tini", "--"]
CMD ["node", "Sync/hub.ts"]
