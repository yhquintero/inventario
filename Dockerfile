FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir cryptography
COPY server/ server/
COPY web/ web/
ENV PORT=8080 DATA_DIR=/data TRUST_PROXY=1
VOLUME /data
EXPOSE 8080
USER 1000
CMD ["python3", "server/cuadre_server.py"]
