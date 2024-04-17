package share

import (
	"ShareSubscription/internal/client"
	"fmt"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
)

var (
	ErrShareInvalid  = errors.New("invalid share")
	ErrShareCanceled = errors.New("invalid share")
	ErrFolderInvalid = errors.New("invalid folder")
)

const (
	CanaryHeaderKey   = "x-canary"
	CanaryHeaderValue = "client=web,app=share,version=v2.3.1"
)

type Share struct {
	ShareId  string
	SharePwd string
	FolderId string
}

type State struct {
	ShareToken string
	DriveId    string
}

var stateMap = map[string]*State{}

func (s *Share) getShareToken() error {
	data := map[string]any{
		"share_id":  s.ShareId,
		"share_pwd": s.SharePwd,
	}
	var e ErrorResp
	var resp ShareTokenResp
	_, err := client.RestyClient.R().
		SetResult(&resp).SetError(&e).SetBody(data).
		Post("https://api.aliyundrive.com/v2/share_link/get_share_token")
	if err != nil {
		return err
	}
	if e.Code != "" {
		return errors.New(e.Message)
	}
	stateMap[s.ShareId] = &State{ShareToken: resp.ShareToken}
	return nil
}

func (s *Share) ShareToken() (*string, error) {
	state := stateMap[s.ShareId]
	if state == nil {
		err := s.getShareToken()
		if err != nil {
			return nil, err
		}
		return &stateMap[s.ShareId].ShareToken, nil
	}
	return &state.ShareToken, nil
}

func (s *Share) Init() error {

	_, err := s.GetShareInfo()
	if err != nil {
		return err
	}

	state := stateMap[s.ShareId]
	if state == nil {
		err = s.getShareToken()
		if err != nil {
			return err
		}
	}

	_, err = s.GetFolderInfo()
	if err != nil {
		return err
	}

	return nil
}

func (s *Share) GetShareInfo() (*Info, error) {
	resp := &Info{}
	var e ErrorResp
	res, err := client.RestyClient.R().
		SetHeader(CanaryHeaderKey, CanaryHeaderValue).
		SetResult(&resp).SetError(&e).SetBody(map[string]any{"share_id": s.ShareId}).
		Post(fmt.Sprintf("https://api.aliyundrive.com/adrive/v3/share_link/get_share_by_anonymous?share_id=%s", s.ShareId))
	if err != nil {
		return nil, err
	}
	log.Debugf("获取分享信息: %s", res.String())
	if e.Code != "" {
		if e.Code == "NotFound.ShareLink" {
			return nil, ErrShareInvalid
		}
		if e.Code == "ShareLink.Cancelled" {
			return nil, ErrShareCanceled
		}
		if e.Code == "ShareLinkTokenInvalid" {
			err = s.getShareToken()
			if err != nil {
				return nil, err
			}
			return s.GetShareInfo()
		}
		return nil, errors.New(e.Code + " - " + e.Message)
	}
	return resp, nil
}

func (s *Share) GetFolderInfo() (*File, error) {
	state := stateMap[s.ShareId]
	resp := &File{}
	var e ErrorResp
	res, err := client.RestyClient.R().
		SetHeader("x-share-token", state.ShareToken).
		SetHeader(CanaryHeaderKey, CanaryHeaderValue).
		SetResult(&resp).SetError(&e).
		SetBody(
			map[string]any{
				"share_id": s.ShareId,
				"file_id":  s.FolderId,
				"fields":   "*",
				"drive_id": "",
			}).
		Post("https://api.aliyundrive.com/adrive/v2/file/get_by_share")
	if err != nil {
		return nil, err
	}
	log.Debugf("获取分享文件夹信息: %s", res.String())
	if e.Code != "" {
		if e.Code == "NotFound.FileId" {
			return nil, ErrFolderInvalid
		}
		if e.Code == "ShareLinkTokenInvalid" {
			err = s.getShareToken()
			if err != nil {
				return nil, err
			}
			return s.GetFolderInfo()
		}
		return nil, errors.New(e.Code + " - " + e.Message)
	}
	return resp, nil
}

func (s *Share) GetFiles() ([]File, error) {

	state := stateMap[s.ShareId]

	if s.FolderId == "" {
		s.FolderId = "root"
	}

	files := make([]File, 0)
	data := map[string]any{
		"share_id":                s.ShareId,
		"parent_file_id":          s.FolderId,
		"limit":                   200,
		"image_thumbnail_process": "image/resize,w_256/format,jpeg",
		"image_url_process":       "image/resize,w_1920/format,jpeg/interlace,1",
		"video_thumbnail_process": "video/snapshot,t_1000,f_jpg,ar_auto,w_256",
		"order_by":                "name",
		"order_direction":         "DESC",
		"marker":                  "first",
	}

	for data["marker"] != "" {
		if data["marker"] == "first" {
			data["marker"] = ""
		}
		var e ErrorResp
		var resp ListResp
		res, err := client.RestyClient.R().
			SetHeader("x-share-token", state.ShareToken).
			SetHeader(CanaryHeaderKey, CanaryHeaderValue).
			SetResult(&resp).SetError(&e).SetBody(data).
			Post("https://api.aliyundrive.com/adrive/v2/file/list_by_share")
		if err != nil {
			return nil, err
		}
		log.Debugf("aliyundrive share get files: %s", res.String())
		if e.Code != "" {
			if e.Code == "ShareLinkTokenInvalid" {
				err = s.getShareToken()
				if err != nil {
					return nil, err
				}
				return s.GetFiles()
			}
			return nil, errors.New(e.Code + " - " + e.Message)
		}
		data["marker"] = resp.NextMarker
		files = append(files, resp.Items...)
	}
	if len(files) > 0 && state.DriveId == "" {
		state.DriveId = files[0].DriveId
	}
	return files, nil
}
