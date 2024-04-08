package handles

import (
	aliyun2 "ShareSubscription/internal/aliyun"
	"ShareSubscription/internal/model"
	utils2 "ShareSubscription/internal/utils"
	"ShareSubscription/server/common"
	"time"

	"github.com/gin-gonic/gin"
)

type ListReq struct {
	FolderId string `json:"folder_id" form:"folder_id"`
}

type DirReq struct {
	FolderId string `json:"folder_id" form:"folder_id"`
}

type ObjResp struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Size     int64     `json:"size"`
	IsDir    bool      `json:"is_dir"`
	Modified time.Time `json:"modified"`
	Created  time.Time `json:"created"`
	Type     int       `json:"type"`
}

func FsList(c *gin.Context) {
	var req ListReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	files, err := aliyun2.Single.GetFiles(req.FolderId)
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	objs, err := utils2.SliceConvert(files, func(src aliyun2.File) (model.Obj, error) {
		return aliyun2.FileToObj(src), nil
	})
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	common.SuccessResp(c, toObjsResp(objs))
}

func FsDirs(c *gin.Context) {
	var req DirReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}
	files, err := aliyun2.Single.GetFiles(req.FolderId)
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	objs, err := utils2.SliceConvert(files, func(src aliyun2.File) (model.Obj, error) {
		return aliyun2.FileToObj(src), nil
	})
	dirs := filterDirs(objs)
	common.SuccessResp(c, dirs)
}

type DirResp struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Modified time.Time `json:"modified"`
}

func filterDirs(objs []model.Obj) []DirResp {
	var dirs []DirResp
	for _, obj := range objs {
		if obj.IsDir() {
			dirs = append(dirs, DirResp{
				ID:       obj.GetID(),
				Name:     obj.GetName(),
				Modified: obj.ModTime(),
			})
		}
	}
	return dirs
}

func toObjsResp(objs []model.Obj) []ObjResp {
	var resp []ObjResp
	for _, obj := range objs {
		resp = append(resp, ObjResp{
			ID:       obj.GetID(),
			Name:     obj.GetName(),
			Size:     obj.GetSize(),
			IsDir:    obj.IsDir(),
			Modified: obj.ModTime(),
			Created:  obj.CreateTime(),
			Type:     utils2.GetObjType(obj.GetName(), obj.IsDir()),
		})
	}
	return resp
}

type FsGetReq struct {
	FileId string `json:"file_id" form:"file_id"`
}

func FsGet(c *gin.Context) {
	var req FsGetReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}

	file, err := aliyun2.Single.GetFile(req.FileId)
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}
	obj := aliyun2.FileToObj(*file)
	common.SuccessResp(c, ObjResp{
		ID:       obj.GetID(),
		Name:     obj.GetName(),
		Size:     obj.GetSize(),
		IsDir:    obj.IsDir(),
		Modified: obj.ModTime(),
		Created:  obj.CreateTime(),
		Type:     utils2.GetFileType(obj.GetName()),
	})
}

type FsPathReq struct {
	FileId string `json:"file_id" form:"file_id"`
}

type FsPathResp struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func FsPath(c *gin.Context) {
	var req FsPathReq
	if err := c.ShouldBind(&req); err != nil {
		common.ErrorResp(c, err, 400)
		return
	}

	files, err := aliyun2.Single.GetPath(req.FileId)
	if err != nil {
		common.ErrorResp(c, err, 500)
		return
	}

	path, err := utils2.SliceConvert(files, func(f aliyun2.File) (*FsPathResp, error) {
		return &FsPathResp{ID: f.FileId, Name: f.Name}, nil
	})

	common.SuccessResp(c, path)
}

//
//func filterRelated(objs []model.Obj, obj model.Obj) []model.Obj {
//	var related []model.Obj
//	nameWithoutExt := strings.TrimSuffix(obj.GetName(), stdpath.Ext(obj.GetName()))
//	for _, o := range objs {
//		if o.GetName() == obj.GetName() {
//			continue
//		}
//		if strings.HasPrefix(o.GetName(), nameWithoutExt) {
//			related = append(related, o)
//		}
//	}
//	return related
//}
//
//type FsOtherReq struct {
//	model.FsOtherArgs
//	Password string `json:"password" form:"password"`
//}
//
//func FsOther(c *gin.Context) {
//	var req FsOtherReq
//	if err := c.ShouldBind(&req); err != nil {
//		common.ErrorResp(c, err, 400)
//		return
//	}
//	user := c.MustGet("user").(*model.User)
//	var err error
//	req.Path, err = user.JoinPath(req.Path)
//	if err != nil {
//		common.ErrorResp(c, err, 403)
//		return
//	}
//	meta, err := op.GetNearestMeta(req.Path)
//	if err != nil {
//		if !errors.Is(errors.Cause(err), errs.MetaNotFound) {
//			common.ErrorResp(c, err, 500)
//			return
//		}
//	}
//	c.Set("meta", meta)
//	if !common.CanAccess(user, meta, req.Path, req.Password) {
//		common.ErrorStrResp(c, "password is incorrect or you have no permission", 403)
//		return
//	}
//	res, err := fs.Other(c, req.FsOtherArgs)
//	if err != nil {
//		common.ErrorResp(c, err, 500)
//		return
//	}
//	common.SuccessResp(c, res)
//}
