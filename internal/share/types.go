package share

import (
	"ShareSubscription/internal/model"
	"github.com/go-resty/resty/v2"
	"time"
)

type ReqCallback func(req *resty.Request)

type ErrorResp struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ShareTokenResp struct {
	ShareToken string    `json:"share_token"`
	ExpireTime time.Time `json:"expire_time"`
	ExpiresIn  int       `json:"expires_in"`
}

type ListResp struct {
	Items             []File `json:"items"`
	NextMarker        string `json:"next_marker"`
	PunishedFileCount int    `json:"punished_file_count"`
}

type Info struct {
	FileCount int    `json:"file_count"`
	ShareName string `json:"share_name"`
	FileInfos []struct {
		Type     string `json:"type"`
		FileId   string `json:"file_id"`
		FileName string `json:"file_name"`
	} `json:"file_infos"`
	CreatorPhone string    `json:"creator_phone"`
	Avatar       string    `json:"avatar"`
	DisplayName  string    `json:"display_name"`
	UpdatedAt    time.Time `json:"updated_at"`
	ShareTitle   string    `json:"share_title"`
	HasPwd       bool      `json:"has_pwd"`
	CreatorId    string    `json:"creator_id"`
	CreatorName  string    `json:"creator_name"`
	Expiration   string    `json:"expiration"`
	Vip          string    `json:"vip"`
}

type File struct {
	DriveId      string    `json:"drive_id"`
	DomainId     string    `json:"domain_id"`
	FileId       string    `json:"file_id"`
	ShareId      string    `json:"share_id"`
	Name         string    `json:"name"`
	Type         string    `json:"type"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	ParentFileId string    `json:"parent_file_id"`
	Size         int64     `json:"size"`
	Thumbnail    string    `json:"thumbnail"`
}

type ShareLinkResp struct {
	DownloadUrl string `json:"download_url"`
	Url         string `json:"url"`
	Thumbnail   string `json:"thumbnail"`
}

func FileToObj(f File) *model.Object {
	return &model.Object{
		ID:       f.FileId,
		Name:     f.Name,
		Size:     f.Size,
		Modified: f.UpdatedAt,
		Ctime:    f.CreatedAt,
		IsFolder: f.Type == "folder",
	}
}
