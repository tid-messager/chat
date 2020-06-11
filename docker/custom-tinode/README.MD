# Custom Tinode server for mongodb

сборка Tinode server for Linux
```
в процессе
```
сборка init-db(tinode-db for mongodb) для Linux 
```
в процессе
```

сборка Docker Custom Tinode server
```
docker build -t tinode-custom-mongodb .
```

запуск Docker Custom Tinode server
```
docker run --env REST_SERVER_URL=http://localhost:8080 --env CUSTOM_PUSH_ADDRESS=https://webhook.site/dc2764b1-17af-40d3-a768-36cd3d1fab5c -p 6060:6060 -d --name tinode-srv --network tinode-net tinode-custom-mongodb:latest
```