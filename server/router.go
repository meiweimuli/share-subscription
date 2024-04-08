package server

import (
	"ShareSubscription/internal/conf"
	"ShareSubscription/server/handles"
	"ShareSubscription/server/middlewares"
	"ShareSubscription/server/static"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Init(e *gin.Engine) {
	Cors(e)
	g := e.Group(conf.Config.Sever.Path)
	g.Any("/ping", func(c *gin.Context) {
		c.String(200, "pong")
	})

	api := g.Group("/api")
	auth := api.Group("", middlewares.Auth)
	_fs(auth.Group("/fs"))
	share(auth.Group("/share"))
	sub(auth.Group("/sub"))
	admin(auth.Group("/admin"))

	static.Static(g, func(handlers ...gin.HandlerFunc) {
		e.NoRoute(handlers...)
	})
}

func admin(g *gin.RouterGroup) {
	//meta := g.Group("/meta")
	//meta.GET("/list", handles.ListMetas)
	//meta.GET("/get", handles.GetMeta)
	//meta.POST("/create", handles.CreateMeta)
	//meta.POST("/update", handles.UpdateMeta)
	//meta.POST("/delete", handles.DeleteMeta)
	//
	//user := g.Group("/user")
	//user.GET("/list", handles.ListUsers)
	//user.GET("/get", handles.GetUser)
	//user.POST("/create", handles.CreateUser)
	//user.POST("/update", handles.UpdateUser)
	//user.POST("/cancel_2fa", handles.Cancel2FAById)
	//user.POST("/delete", handles.DeleteUser)
	//user.POST("/del_cache", handles.DelUserCache)
	//
	//storage := g.Group("/storage")
	//storage.GET("/list", handles.ListStorages)
	//storage.GET("/get", handles.GetStorage)
	//storage.POST("/create", handles.CreateStorage)
	//storage.POST("/update", handles.UpdateStorage)
	//storage.POST("/delete", handles.DeleteStorage)
	//storage.POST("/enable", handles.EnableStorage)
	//storage.POST("/disable", handles.DisableStorage)
	//storage.POST("/load_all", handles.LoadAllStorages)
	//
	//driver := g.Group("/driver")
	//driver.GET("/list", handles.ListDriverInfo)
	//driver.GET("/names", handles.ListDriverNames)
	//driver.GET("/info", handles.GetDriverInfo)
	//
	//setting := g.Group("/setting")
	//setting.GET("/get", handles.GetSetting)
	//setting.GET("/list", handles.ListSettings)
	//setting.POST("/save", handles.SaveSettings)
	//setting.POST("/delete", handles.DeleteSetting)
	//setting.POST("/reset_token", handles.ResetToken)
	//setting.POST("/set_aria2", handles.SetAria2)
	//setting.POST("/set_qbit", handles.SetQbittorrent)
	//
	//task := g.Group("/task")
	//handles.SetupTaskRoute(task)
	//
	//ms := g.Group("/message")
	//ms.POST("/get", message.HttpInstance.GetHandle)
	//ms.POST("/send", message.HttpInstance.SendHandle)
	//
	//index := g.Group("/index")
	//index.POST("/build", middlewares.SearchIndex, handles.BuildIndex)
	//index.POST("/update", middlewares.SearchIndex, handles.UpdateIndex)
	//index.POST("/stop", middlewares.SearchIndex, handles.StopIndex)
	//index.POST("/clear", middlewares.SearchIndex, handles.ClearIndex)
	//index.GET("/progress", middlewares.SearchIndex, handles.GetProgress)
}

func _fs(g *gin.RouterGroup) {
	g.Any("/list", handles.FsList)
	g.Any("/get", handles.FsGet)
	g.Any("/path", handles.FsPath)
	g.Any("/dirs", handles.FsDirs)
	g.POST("/mkdir", handles.FsMkdir)
	g.POST("/rename", handles.FsRename)
	g.POST("/batch_rename", handles.FsBatchRename)
	g.POST("/move", handles.FsMove)
	g.POST("/copy", handles.FsCopy)
	g.POST("/remove", handles.FsRemove)
}

func share(g *gin.RouterGroup) {
	g.Any("/list", handles.ShareList)
	g.POST("/save", handles.ShareSave)
}

func sub(g *gin.RouterGroup) {
	g.Any("/exec", handles.ExecSub)
	g.GET("/list", handles.ListSubscriptions)
	g.GET("/get", handles.GetSubscription)
	g.POST("/create", handles.CreateSubscription)
	g.POST("/update", handles.UpdateSubscription)
	g.POST("/delete", handles.DeleteSubscription)
	g.POST("/enable", handles.EnableSubscription)
	g.POST("/disable", handles.DisableSubscription)

	g.GET("/log/list", handles.ListSubscriptionLogs)
}

func Cors(r *gin.Engine) {
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"*"}
	config.AllowMethods = []string{"GET", "POST"}
	r.Use(cors.New(config))
}
