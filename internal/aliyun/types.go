package aliyun

import (
	"ShareSubscription/internal/model"
	"github.com/go-resty/resty/v2"
	"time"
)

type RespErr struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type TokenResp struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type ReqCallback func(req *resty.Request)

type Files struct {
	Items      []File `json:"items"`
	NextMarker string `json:"next_marker"`
}

type File struct {
	DriveId       string     `json:"drive_id"`
	CreatedAt     *time.Time `json:"created_at"`
	FileExtension string     `json:"file_extension"`
	FileId        string     `json:"file_id"`
	Type          string     `json:"type"`
	Name          string     `json:"name"`
	Category      string     `json:"category"`
	ParentFileId  string     `json:"parent_file_id"`
	UpdatedAt     time.Time  `json:"updated_at"`
	Size          int64      `json:"size"`
	Thumbnail     string     `json:"thumbnail"`
	Url           string     `json:"url"`
}

func FileToObj(f File) *model.Object {
	return &model.Object{
		ID:       f.FileId,
		Name:     f.Name,
		Size:     f.Size,
		Modified: f.UpdatedAt,
		IsFolder: f.Type == "folder",
	}
}

type UploadResp struct {
	FileId       string `json:"file_id"`
	UploadId     string `json:"upload_id"`
	PartInfoList []struct {
		UploadUrl         string `json:"upload_url"`
		InternalUploadUrl string `json:"internal_upload_url"`
	} `json:"part_info_list"`

	RapidUpload bool `json:"rapid_upload"`
}
