# Docker 部署说明（M4，2026-11-04）

本次交付镜像，未发布到云服务器。容器只提供前端静态文件，不代理、下载、缓存或转码视频。视频请求由观看者浏览器直接访问来源/CDN；云服务器仍承担页面、JS、CSS等静态文件流量。

## 1. 选择镜像

服务器运行 `uname -m`：

| 输出 | 镜像包 | 镜像名称 |
|---|---|---|
| x86_64 | `corgi-tv-0.4.0-amd64.tar.gz` | `corgi-tv:0.4.0-amd64` |
| aarch64 / arm64 | `corgi-tv-0.4.0-arm64.tar.gz` | `corgi-tv:0.4.0-arm64` |

交付目录为项目根目录 `release/`，包含两个镜像压缩包、SHA256SUMS、compose.yaml和本说明。只需上传对应架构镜像和部署文件。需先安装 Docker Engine 与 Compose 插件。

## 2. 导入并启动

以下在服务器上传文件所在目录执行，默认示例是常见的 x86_64 服务器：

```sh
sha256sum --ignore-missing -c SHA256SUMS
gzip -dc corgi-tv-0.4.0-amd64.tar.gz | docker load
docker compose up -d
docker compose ps
curl http://127.0.0.1:8080/healthz
```

ARM服务器改为：

```sh
gzip -dc corgi-tv-0.4.0-arm64.tar.gz | docker load
CORGI_TV_IMAGE=corgi-tv:0.4.0-arm64 docker compose up -d
```

建议在同目录 `.env` 中保存选择，供以后执行Compose命令使用：

```dotenv
CORGI_TV_IMAGE=corgi-tv:0.4.0-amd64
CORGI_TV_PORT=8080
```

浏览器访问 `http://服务器IP:8080`，按需在服务器防火墙/安全组放行8080。已有反向代理时，建议把compose的端口映射改成 `127.0.0.1:${CORGI_TV_PORT:-8080}:8080`，由反向代理对外提供域名与HTTPS。无需添加视频代理路径。

## 3. 域名、HTTPS与来源限制

用1Panel/OpenResty/Nginx的反向代理站点转发到 `http://127.0.0.1:8080`（反向代理本身在另一容器时，应配置共享容器网络及服务名）。为正式域名配置证书。HTTPS站点应使用HTTPS视频源，HTTP视频可能被浏览器按混合内容阻止。

部署不会解除视频提供方的CORS、区域、鉴权、嵌入或网络限制。YouTube必须在观看者网络可访问；本轮API超时。B站按受限嵌入处理，外部音量/状态/结束事件不承诺；本轮未证实实际播放。优先使用合法授权且支持CORS、定位的VOD HLS。直播HLS会被拒绝。

## 4. 配置和备份

首次打开无默认频道：打开机身「调校 · SET」，依次创建频道、节目资源、每日排片，然后开机。排片以北京时间每日重复，短视频播放完会无信号；源加载耗时后按当前时钟定位。

配置保存在每个用户浏览器的IndexedDB，而不是容器。不同设备、浏览器、IP/域名/端口是独立数据；从本地5190换到正式域名前，请先导出JSON，再到新地址导入。换镜像无需挂载业务数据卷；清理浏览器站点数据会丢失未备份配置。容器停机不会删除浏览器数据。

## 5. 运维与更新

```sh
docker compose logs --tail=100
docker compose restart
docker compose down
```

更新时加载新镜像、修改 `.env` 镜像标签后执行 `docker compose up -d`。回滚时换回旧标签并再次执行。镜像提供 `/healthz` 与健康检查，只说明静态服务正常，不表示远端视频可播放。

## 6. 自行构建

在项目根目录：

```sh
docker buildx build --platform linux/amd64 --load -t corgi-tv:0.4.0-amd64 .
# ARM：将两个amd64替换为arm64
```

构建阶段使用Node22，运行阶段使用Nginx静态服务，监听8080。Compose开启只读根文件系统并给Nginx必要目录配置临时内存文件系统。镜像不包含项目测试证据、node_modules开发目录、密钥或业务后端。

## 7. 部署后验收

创建两个频道并排片，确认当前节目能播放、切台后进度按北京时间定位；关机后在浏览器Network观察至少30秒无持续新增视频分片请求；刷新后配置仍在；导出JSON并保留备份。正式域名的嵌入/自动播放策略可能不同，需要在最终域名复验。

本次本地容器测试证据见 `docs/evidence/m4/container/`。amd64完成实际UI与HLS端到端测试，arm64完成容器启动、HTTP与健康检查；未在用户云服务器运行。
