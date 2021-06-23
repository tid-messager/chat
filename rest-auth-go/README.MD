# Пример REST auth сервера на go

*TODO: дополнить документацию*

Аналог [python REST authenticator](../rest-auth/)

Как запустить
```
go run main.go
```

Как собрать из исходников
```
go build -o auth
```

сервера запускается на порту `8080`

## Docker

Сборка:
```
docker build -t docker.pkg.github.com/tid-messager/chat/rest-auth:latest .
```

Отправка:
```
docker push docker.pkg.github.com/tid-messager/chat/rest-auth:latest
```

Запуск:
```
docker run -p 8080:8080 -d --name rest-auth --network tinode-net docker.pkg.github.com/tid-messager/chat/rest-auth:latest
```