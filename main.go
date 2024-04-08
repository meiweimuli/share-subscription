package main

import (
	"ShareSubscription/internal/aliyun"
	"ShareSubscription/internal/client"
	"ShareSubscription/internal/conf"
	"ShareSubscription/internal/db"
	"ShareSubscription/internal/sub"
	"ShareSubscription/server"
	"errors"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
	"net/http"
)

func main() {

	err := conf.Init()
	if err != nil {
		log.Fatal("初始化配置失败", err)
	}

	db.InitDB()

	client.InitClient()

	aliyun.Single = &aliyun.Aliyun{
		RefreshToken: conf.Config.Aliyun.RefreshToken,
		AccessToken:  conf.Config.Aliyun.AccessToken,
		OnChange: func(a *aliyun.Aliyun) {
			conf.Config.Aliyun.RefreshToken = a.RefreshToken
			conf.Config.Aliyun.AccessToken = a.AccessToken
			conf.Update()
		},
	}
	err = aliyun.Single.Init()
	if err != nil {
		log.Fatal("初始化阿里云盘失败", err)
	}

	sub.InitSchedule()

	r := gin.New()
	r.Use(gin.LoggerWithWriter(log.StandardLogger().Out), gin.RecoveryWithWriter(log.StandardLogger().Out))
	server.Init(r)

	httpSrv := &http.Server{Addr: conf.Config.Sever.Addr, Handler: r}
	err = httpSrv.ListenAndServe()
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("failed to start http: %s", err.Error())
	}

}
