package handles

import (
	"ShareSubscription/internal/aliyun"
	"ShareSubscription/server/common"
	"github.com/gin-gonic/gin"
)

type BatchRenameReq struct {
	RenameObjects []struct {
		FileId string `json:"file_id"`
		Name   string `json:"name"`
	} `json:"rename_objects"`
}

func FsBatchRename(c *gin.Context) {
	var req BatchRenameReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	for _, renameObject := range req.RenameObjects {
		if renameObject.FileId == "" || renameObject.Name == "" {
			continue
		}
		if err := aliyun.Single.Rename(renameObject.FileId, renameObject.Name); err != nil {
			common.ErrorResp(c, err, 500)
			return
		}
	}
	common.SuccessResp(c)
}
