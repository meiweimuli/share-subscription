package handles

import (
	"ShareSubscription/internal/db"
	"ShareSubscription/internal/model"
	"ShareSubscription/server/common"
	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

func ListSubscriptionLogs(c *gin.Context) {
	var req model.PageReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	req.Validate()
	log.Debugf("%+v", req)
	subscriptions, total, err := db.GetSubscriptionLogs(req.Page, req.PerPage)
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	common.SuccessResp(c, common.PageResp{
		Content: subscriptions,
		Total:   total,
	})
}
