# Custom Tinode server for mongodb

сборка Tinode server for Linux
```
cd ./server
go build -o ../docker/custom-tinode/build/tinode
```

сборка init-db(tinode-db for mongodb) для Linux 
```
cd ./tinode-db
 go build -tags mongodb -o ../docker/custom-tinode/build/init-db
```

сборка Docker Custom Tinode server
```
docker build -t tinode-custom-mongodb .
```

сеть
```
$ docker network create tinode-net
```

запуск mongoDB
```
$ docker run --name mongodb --network tinode-net --restart always -d mongo:latest --replSet "rs0"
$ docker exec -it mongodb mongo

# And inside mongo shell:
> rs.initiate( {"_id": "rs0", "members": [ {"_id": 0, "host": "mongodb:27017"} ]} )
> quit()
```

запуск Docker Custom Tinode server
```
docker run --env REST_SERVER_URL=http://localhost:8080 --env CUSTOM_PUSH_ADDRESS=https://webhook.site/dc2764b1-17af-40d3-a768-36cd3d1fab5c -p 6060:6060 -d --name tinode-srv --network tinode-net tinode-custom-mongodb:latest
```

docker-compose
```
version: '3.3'
services:
  mongodb:
    image: mongo:latest
    command: "--replSet rs0"
    ports:
     - 27017:27017
    networks:
     - tinode-net
  tinode-srv:
    image: pallid/tinode-mongodb-custom:latest
    environment:
      REST_SERVER_URL: http://localhost:8080
      CUSTOM_PUSH_ADDRESS: https://webhook.site/dc2764b1-17af-40d3-a768-36cd3d1fab5c
    ports:
     - 8080:8080
     - 6060:6060
    networks:
     - tinode-net
    depends_on:
      - "mongodb" 
networks:
  tinode-net:
    driver: overlay
```