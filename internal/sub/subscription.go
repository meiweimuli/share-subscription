package sub

import (
	"ShareSubscription/internal/aliyun"
	"ShareSubscription/internal/db"
	"ShareSubscription/internal/model"
	"ShareSubscription/internal/share"
	"ShareSubscription/internal/utils"
	"fmt"
	"github.com/dlclark/regexp2"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
	"math/rand"
	"regexp"
	"strings"
	"time"
)

var cronMap = map[uint]*utils.Cron{}

func InitSchedule() {
	checkSchedule := func() {
		log.Infof("开始检查订阅任务")
		subscriptions, _, err := db.GetSubscriptions(1, 10000)
		if err != nil {
			log.Warn("获取订阅列表失败", err)
		}
		allIds := make([]uint, 0)
		for _, subscription := range subscriptions {
			subscriptionID := subscription.ID
			allIds = append(allIds, subscriptionID)
			cron, ok := cronMap[subscriptionID]
			if ok || subscription.Disabled {
				if ok && subscription.Disabled {
					cron.Stop()
					delete(cronMap, subscriptionID)
					log.Infof("删除订阅任务成功, %s", subscription.Name)
				}
				continue
			}
			cronMap[subscriptionID] = utils.NewDelayCron(time.Minute*10, time.Second*time.Duration(rand.Intn(600)))
			cronMap[subscriptionID].Do(func() {
				sub, err2 := db.GetSubscriptionById(subscriptionID)
				if err2 != nil {
					log.Error("订阅执行失败, 查询订阅失败, ", subscriptionID, err2)
				}
				err2 = ExecSub(sub)
				if err2 != nil {
					log.Error("订阅执行失败 ", sub.Name, err2)
					_ = db.CreateSubscriptionLog(&model.SubscriptionLog{
						Message: fmt.Sprintf("%s 订阅失败 %s", subscription.Name, err2.Error()),
					})
				}
			})
			log.Infof("添加订阅任务成功, %s", subscription.Name)
		}
		for subId, cron := range cronMap {
			if utils.SliceContains(allIds, subId) {
				continue
			}
			cron.Stop()
			delete(cronMap, subId)
			log.Infof("删除订阅任务成功, %d", subId)
		}
	}
	checkSchedule()
	utils.NewCron(time.Minute * 5).Do(checkSchedule)
}

func ExecSub(subscription *model.Subscription) error {

	log.Infof("开始执行订阅: %s", subscription.Name)

	matchRegex, err := regexp.Compile(subscription.MatchRegex)
	if err != nil {
		return errors.Wrapf(err, "匹配正则错误: %s", subscription.MatchRegex)
	}
	renameRegex, err := regexp2.Compile(subscription.RenameRegex, 0)
	if err != nil {
		return errors.Wrapf(err, "重命名正则错误: %s", subscription.RenameRegex)
	}

	re := regexp.MustCompile("https://[^/]*/s/([^/]*)(?:/folder/([0-9a-f]*))?")
	groups := re.FindStringSubmatch(subscription.ShareUrl)
	if len(groups) == 0 {
		return errors.Errorf("分享链接不合法: %s", subscription.ShareUrl)
	}

	shareInfo := &share.Share{
		ShareId:  groups[1],
		FolderId: groups[2],
		SharePwd: subscription.ShareSecret,
	}
	err = shareInfo.Init()
	if err != nil {
		if errors.Is(err, share.ErrShareInvalid) || errors.Is(err, share.ErrFolderInvalid) {
			subscription.ShareUrlInvalid = true
			subscription.Disabled = true
			_ = db.UpdateSubscription(subscription)
			return errors.Wrapf(err, "分享链接无效: %s", subscription.ShareUrl)
		}
		return errors.Wrap(err, "分享信息获取失败")
	} else if subscription.ShareUrlInvalid {
		subscription.ShareUrlInvalid = false
		_ = db.UpdateSubscription(subscription)
	}
	shareToken, _ := shareInfo.ShareToken()
	files, err := shareInfo.GetFiles()
	if err != nil {
		return errors.Wrap(err, "获取分享文件列表失败")
	}
	savedFileIds := strings.Split(subscription.SavedFileIds, ",")

	_, err = aliyun.Single.GetFile(subscription.TargetFolderId)
	if err != nil {
		return errors.Wrap(err, "目标文件夹获取失败")
	}

	existFileNames := make([]string, 0)
	if subscription.IgnoreSameName {
		existFiles, err := aliyun.Single.GetFiles(subscription.TargetFolderId)
		if err != nil {
			return errors.Wrap(err, "目标文件夹文件列表获取失败")
		}
		if existFiles != nil {
			for _, file := range existFiles {
				existFileNames = append(existFileNames, file.Name)
			}
		}
	}

	for _, file := range files {
		if file.Type == "folder" {
			continue
		}
		if utils.SliceContains(savedFileIds, file.FileId) {
			continue
		}
		if !matchRegex.MatchString(file.Name) {
			continue
		}
		log.Infof("发现新文件, 开始保存, %s", file.Name)
		sourceFilename := file.Name
		savedFilename := sourceFilename
		if subscription.RenameTarget != "" {
			if isMatch, _ := renameRegex.MatchString(sourceFilename); isMatch {
				savedFilename, _ = renameRegex.Replace(sourceFilename, subscription.RenameTarget, -1, -1)
			}
		}
		if utils.SliceContains(existFileNames, savedFilename) {
			log.Infof("新文件重名, 放弃保存, %s, %s", sourceFilename, savedFilename)
			continue
		}

		savedFileId, err2 := aliyun.Single.SaveShare(shareInfo.ShareId, file.FileId, *shareToken, subscription.TargetFolderId)
		if err2 != nil {
			err = errors.Wrap(err2, "保存到阿里云盘失败")
			break
		}

		if sourceFilename != savedFilename {
			err2 = aliyun.Single.Rename(savedFileId, savedFilename)
			if err2 != nil {
				log.Warnf("新文件保存后重命名失败, %s, %s", sourceFilename, savedFilename)
				savedFilename = sourceFilename
			}
		}

		savedFileIds = append(savedFileIds, file.FileId)
		log.Infof("保存文件成功, %s, %s", subscription.Name, savedFilename)

		err2 = db.CreateSubscriptionLog(&model.SubscriptionLog{
			Message: fmt.Sprintf("%s 保存成功 [%s]", subscription.Name, savedFilename),
		})
		if err2 != nil {
			log.Warn("保存记录失败", err2)
		}
	}

	subscription.SavedFileIds = strings.Join(savedFileIds, ",")
	now := time.Now()
	subscription.LastQueryTime = &now
	err2 := db.UpdateSubscription(subscription)
	if err2 != nil {
		log.Warn("保存订阅信息失败", err2)
	}

	return err
}
