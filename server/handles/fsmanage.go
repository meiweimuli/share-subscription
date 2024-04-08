package handles

import (
	"ShareSubscription/internal/aliyun"
	"ShareSubscription/server/common"
	"github.com/gin-gonic/gin"
)

type MkdirOrLinkReq struct {
	ParentId string `json:"parent_id"`
	DirName  string `json:"dir_name"`
}

func FsMkdir(c *gin.Context) {
	var req MkdirOrLinkReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	if err := aliyun.Single.MakeDir(req.ParentId, req.DirName); err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	common.SuccessResp(c)
}

type MoveCopyReq struct {
	DstFolderId string   `json:"dst_folder_id"`
	FileIds     []string `json:"file_ids"`
}

func FsMove(c *gin.Context) {
	var req MoveCopyReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	if len(req.FileIds) == 0 {
		common.ErrorStrResp(c, "Empty files", 400)
		return
	}
	for _, fileId := range req.FileIds {
		err := aliyun.Single.Move(fileId, req.DstFolderId)
		if err != nil {
			common.ErrorResp(c, err, 500)
			return
		}
	}
	common.SuccessResp(c)
}

func FsCopy(c *gin.Context) {
	var req MoveCopyReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	if len(req.FileIds) == 0 {
		common.ErrorStrResp(c, "Empty files", 400)
		return
	}
	for _, fileId := range req.FileIds {
		err := aliyun.Single.Copy(fileId, req.DstFolderId)
		if err != nil {
			common.ErrorResp(c, err, 500)
			return
		}
	}
	common.SuccessResp(c)
}

type RenameReq struct {
	FileId string `json:"file_id"`
	Name   string `json:"name"`
}

func FsRename(c *gin.Context) {
	var req RenameReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	if err := aliyun.Single.Rename(req.FileId, req.Name); err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	common.SuccessResp(c)
}

type RemoveReq struct {
	FileIds []string `json:"file_ids"`
}

func FsRemove(c *gin.Context) {
	var req RemoveReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	if len(req.FileIds) == 0 {
		common.ErrorStrResp(c, "Empty files", 400)
		return
	}
	for _, fileId := range req.FileIds {
		err := aliyun.Single.Remove(fileId)
		if err != nil {
			common.ErrorResp(c, err, 500)
			return
		}
	}
	common.SuccessResp(c)
}
