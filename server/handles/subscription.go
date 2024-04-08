package handles

import (
	"ShareSubscription/internal/db"
	"ShareSubscription/internal/model"
	sub "ShareSubscription/internal/sub"
	"ShareSubscription/server/common"
	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
	"strconv"
)

func ListSubscriptions(c *gin.Context) {
	var req model.PageReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	req.Validate()
	log.Debugf("%+v", req)
	subscriptions, total, err := db.GetSubscriptions(req.Page, req.PerPage)
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	common.SuccessResp(c, common.PageResp{
		Content: subscriptions,
		Total:   total,
	})
}

func CreateSubscription(c *gin.Context) {
	var req model.Subscription
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	if err := db.CreateSubscription(&req); err != nil {
		common.ErrorWithDataResp(c, err, 500, gin.H{
			"id": req.ID,
		}, true)
	} else {
		common.SuccessResp(c, gin.H{
			"id": req.ID,
		})
	}
}

func UpdateSubscription(c *gin.Context) {
	var req model.Subscription
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}

	if err := updateSubscription(req); err != nil {
		common.ErrorResp(c, err, 500, true)
	} else {
		common.SuccessResp(c)
	}
}

func updateSubscription(subscription model.Subscription) error {
	oldSub, err := db.GetSubscriptionById(subscription.ID)
	if err != nil {
		return errors.WithMessage(err, "failed get old sub")
	}
	subscription.LastQueryTime = oldSub.LastQueryTime
	err = db.UpdateSubscription(&subscription)
	return err
}

func DeleteSubscription(c *gin.Context) {
	idStr := c.Query("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	if err := db.DeleteSubscriptionById(uint(id)); err != nil {
		common.ErrorResp(c, err, 500, true)
		return
	}
	common.SuccessResp(c)
}

func DisableSubscription(c *gin.Context) {
	idStr := c.Query("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ErrorResp(c, err, 400)
		return
	}

	if err := disableSubscription(uint(id)); err != nil {
		common.ErrorResp(c, err, 500, true)
		return
	}
	common.SuccessResp(c)
}

func disableSubscription(id uint) error {
	subscription, err := db.GetSubscriptionById(id)
	if err != nil {
		return errors.WithMessage(err, "failed get sub")
	}
	if subscription.Disabled {
		return errors.Errorf("this sub have disabled")
	}
	subscription.Disabled = true
	err = db.UpdateSubscription(subscription)
	return err
}

func EnableSubscription(c *gin.Context) {
	idStr := c.Query("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	if err := enabledSubscription(uint(id)); err != nil {
		common.ErrorResp(c, err, 500, true)
		return
	}
	common.SuccessResp(c)
}

func enabledSubscription(id uint) error {
	subscription, err := db.GetSubscriptionById(id)
	if err != nil {
		return errors.WithMessage(err, "failed get sub")
	}
	if !subscription.Disabled {
		return errors.Errorf("this sub have enabled")
	}
	subscription.Disabled = false
	err = db.UpdateSubscription(subscription)
	return err
}

func GetSubscription(c *gin.Context) {
	idStr := c.Query("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	subscription, err := db.GetSubscriptionById(uint(id))
	if err != nil {
		common.ErrorResp(c, err, 500, true)
		return
	}
	common.SuccessResp(c, subscription)
}

func ExecSub(c *gin.Context) {

	idStr := c.Query("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		common.ErrorResp(c, err, 400)
		return
	}

	subscription, err := db.GetSubscriptionById(uint(id))
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}

	err = sub.ExecSub(subscription)
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}

	common.SuccessResp(c)
}
