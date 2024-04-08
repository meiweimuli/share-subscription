# syntax=docker/dockerfile:1

FROM golang:1.22.1-alpine as builder

WORKDIR /build

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories \
    && apk add --no-cache gcc musl-dev

COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
       go env -w GO111MODULE=on \
    && go env -w GOPROXY=https://goproxy.io,direct \
    && CGO_ENABLED=1 GOOS=linux go build -o app -v

FROM alpine:3.18

WORKDIR /

COPY --from=builder /build/app .

ENTRYPOINT ["/app"]