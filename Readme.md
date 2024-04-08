完全抄袭alist写的golang练习代码

每十分钟查询一次阿里云盘分享链接，如果有新的文件就保存到自己的阿里云盘

```yaml
services:
  share-subscription:
    image: gczran/share-subscription:latest
    container_name: share-subscription
    volumes:
      - ./data:/data
    ports:
      - 9999:9999
    environment:
      - SERVER_TOKEN=987654321
      - ALIYUN_REFRESH_TOKEN=abcabcabcabc
```