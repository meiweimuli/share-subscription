package db

import (
	"ShareSubscription/internal/model"
	"github.com/pkg/errors"
)

func CreateSubscription(subscription *model.Subscription) error {
	return errors.WithStack(db.Create(subscription).Error)
}

func UpdateSubscription(subscription *model.Subscription) error {
	return errors.WithStack(db.Save(subscription).Error)
}

func DeleteSubscriptionById(id uint) error {
	return errors.WithStack(db.Delete(&model.Subscription{}, id).Error)
}

func GetSubscriptions(pageIndex, pageSize int) ([]model.Subscription, int64, error) {
	subscriptionDB := db.Model(&model.Subscription{})
	var count int64
	if err := subscriptionDB.Count(&count).Error; err != nil {
		return nil, 0, errors.Wrapf(err, "failed get subscriptions count")
	}
	var subscriptions []model.Subscription
	if err := subscriptionDB.Order(columnName("name")).Offset((pageIndex - 1) * pageSize).Limit(pageSize).Find(&subscriptions).Error; err != nil {
		return nil, 0, errors.WithStack(err)
	}
	return subscriptions, count, nil
}

func GetSubscriptionById(id uint) (*model.Subscription, error) {
	var subscription model.Subscription
	subscription.ID = id
	if err := db.First(&subscription).Error; err != nil {
		return nil, errors.WithStack(err)
	}
	return &subscription, nil
}
