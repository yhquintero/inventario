FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ server/
COPY web/ web/
RUN mkdir -p /data && chown 1000:1000 /data
ENV PORT=8080 DATA_DIR=/data TRUST_PROXY=0
VOLUME /data
EXPOSE 8080
USER 1000
CMD ["python3", "server/novagest_server.py"]
