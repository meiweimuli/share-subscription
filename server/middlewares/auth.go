package middlewares

import (
	"ShareSubscription/internal/conf"
	"ShareSubscription/server/common"
	"github.com/gin-gonic/gin"
)

func Auth(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if conf.Config.Sever.Token != "" && conf.Config.Sever.Token != token {
		common.ErrorStrResp(c, "没有权限", 500)
		c.Abort()
		return
	}
	c.Next()
}
