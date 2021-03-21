# Сustom push

TODO: описать как конфигурировать этот кастомный пуш

### Конфигурирование
обновить конфигурационный файл сервера `tinode.conf`, в секции `"push"` -> `"name": "custom"`:
```js
{
  "enabled": true,
  "address": "http://localhost:port/", // 
}
```
