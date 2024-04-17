package handles

import (
	"ShareSubscription/internal/aliyun"
	"ShareSubscription/internal/db"
	"ShareSubscription/internal/model"
	"ShareSubscription/internal/share"
	"ShareSubscription/internal/utils"
	"ShareSubscription/server/common"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
	"regexp"
)

type ShareListReq struct {
	ShareUrl    string `json:"share_url" form:"share_url"`
	ShareSecret string `json:"share_secret" form:"share_secret"`
}

func ShareList(c *gin.Context) {

	var req ShareListReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}

	re := regexp.MustCompile("https://[^/]*/s/([^/]*)(?:/folder/([0-9a-f]*))?")
	groups := re.FindStringSubmatch(req.ShareUrl)
	if len(groups) == 0 {
		common.ErrorResp(c, fmt.Errorf("订阅链接不合法"), 400)
		return
	}

	shareInstance := &share.Share{
		ShareId:  groups[1],
		FolderId: groups[2],
		SharePwd: req.ShareSecret,
	}
	err := shareInstance.Init()
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	files, err := shareInstance.GetFiles()
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	objs, err := utils.SliceConvert(files, func(src share.File) (model.Obj, error) {
		return share.FileToObj(src), nil
	})
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	common.SuccessResp(c, toObjsResp(objs))
}

type ShareSaveFile struct {
	FileId     string `json:"file_id"`
	OriginName string `json:"origin_name"`
	SaveName   string `json:"save_name"`
}

type ShareSaveReq struct {
	ShareUrl       string          `json:"share_url"`
	ShareSecret    string          `json:"share_secret"`
	SaveFolderId   string          `json:"save_folder_id"`
	Files          []ShareSaveFile `json:"files"`
	IgnoreSameName bool            `json:"ignore_same_name"`
}

func ShareSave(c *gin.Context) {

	var req ShareSaveReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}

	err := execSaveShare(req)
	if err != nil {
		common.ErrorResp(c, err, 500)
	}

	common.SuccessResp(c)
}

func execSaveShare(req ShareSaveReq) error {
	log.Infof("开始保存文件")

	re := regexp.MustCompile("https://[^/]*/s/([^/]*)(?:/folder/([0-9a-f]*))?")
	groups := re.FindStringSubmatch(req.ShareUrl)
	if len(groups) == 0 {
		return errors.Errorf("分享链接不合法: %s", req.ShareUrl)
	}

	shareInfo := &share.Share{
		ShareId:  groups[1],
		FolderId: groups[2],
		SharePwd: req.ShareSecret,
	}
	err := shareInfo.Init()
	if err != nil {
		if errors.Is(err, share.ErrShareInvalid) || errors.Is(err, share.ErrFolderInvalid) || errors.Is(err, share.ErrShareCanceled) {
			return errors.Wrapf(err, "分享链接无效: %s", req.ShareUrl)
		}
		return errors.Wrap(err, "分享信息获取失败")
	}
	shareToken, _ := shareInfo.ShareToken()

	_, err = aliyun.Single.GetFile(req.SaveFolderId)
	if err != nil {
		return errors.Wrap(err, "目标文件夹获取失败")
	}

	existFileNames := make([]string, 0)
	if req.IgnoreSameName {
		existFiles, err := aliyun.Single.GetFiles(req.SaveFolderId)
		if err != nil {
			return errors.Wrap(err, "目标文件夹文件列表获取失败")
		}
		if existFiles != nil {
			for _, file := range existFiles {
				existFileNames = append(existFileNames, file.Name)
			}
		}
	}

	for _, file := range req.Files {

		log.Infof("保存文件, %s", file.OriginName)
		if utils.SliceContains(existFileNames, file.SaveName) {
			log.Infof("文件重名, 放弃保存, %s, %s", file.OriginName, file.SaveName)
			continue
		}

		savedFileId, err2 := aliyun.Single.SaveShare(shareInfo.ShareId, file.FileId, *shareToken, req.SaveFolderId)
		if err2 != nil {
			err = errors.Wrap(err2, "保存到阿里云盘失败")
			break
		}

		if file.OriginName != file.SaveName {
			err2 = aliyun.Single.Rename(savedFileId, file.SaveName)
			if err2 != nil {
				log.Warnf("新文件保存后重命名失败, %s, %s", file.OriginName, file.SaveName)
				file.SaveName = file.OriginName
			}
		}

		log.Infof("保存文件成功, %s", file.SaveName)

		err2 = db.CreateSubscriptionLog(&model.SubscriptionLog{
			Message: fmt.Sprintf("%s 保存成功 [%s]", "手动保存", file.SaveName),
		})
		if err2 != nil {
			log.Warn("保存记录失败", err2)
		}
	}

	return err
}
