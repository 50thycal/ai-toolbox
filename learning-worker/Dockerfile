FROM node:24-bookworm-slim
WORKDIR /app/learning-worker
COPY learning-worker/package*.json ./
RUN npm ci --omit=dev && useradd -m -u 10001 learner && mkdir /data && chown learner /data && command -v runuser
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
RUN npx playwright install --with-deps chromium && chmod -R a+rX /opt/playwright
COPY --chown=learner:learner learning-worker/ ./
COPY --chown=learner:learner web/lib/lesson-contract.mjs /app/web/lib/lesson-contract.mjs
COPY --chown=learner:learner web/lib/lesson-export.mjs /app/web/lib/lesson-export.mjs
ENV NODE_ENV=production DATA_DIR=/data PORT=8080
EXPOSE 8080
ENTRYPOINT ["sh","/app/learning-worker/entrypoint.sh"]
CMD ["node","src/server.mjs"]
