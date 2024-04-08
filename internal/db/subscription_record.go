package db

import (
	"ShareSubscription/internal/model"
	"github.com/pkg/errors"
	"time"
)

func CreateSubscriptionLog(SubscriptionLog *model.SubscriptionLog) error {
	now := time.Now()
	SubscriptionLog.LogTime = &now
	return errors.WithStack(db.Create(SubscriptionLog).Error)
}

func UpdateSubscriptionLog(SubscriptionLog *model.SubscriptionLog) error {
	return errors.WithStack(db.Save(SubscriptionLog).Error)
}

func DeleteSubscriptionLogById(id uint) error {
	return errors.WithStack(db.Delete(&model.SubscriptionLog{}, id).Error)
}

func GetSubscriptionLogs(pageIndex, pageSize int) ([]model.SubscriptionLog, int64, error) {
	SubscriptionLogDB := db.Model(&model.SubscriptionLog{})
	var count int64
	if err := SubscriptionLogDB.Count(&count).Error; err != nil {
		return nil, 0, errors.Wrapf(err, "failed get SubscriptionLogs count")
	}
	var SubscriptionLogs []model.SubscriptionLog
	if err := SubscriptionLogDB.Order("log_time desc").Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&SubscriptionLogs).Error; err != nil {
		return nil, 0, errors.WithStack(err)
	}
	return SubscriptionLogs, count, nil
}
